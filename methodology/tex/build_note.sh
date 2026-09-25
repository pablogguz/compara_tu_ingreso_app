#!/usr/bin/env bash
#
# Build the methodology note locally  ->  tex/note.pdf
#
# tex/draft.tex follows the Overleaf project layout: it mixes root-relative
# inputs (\input{tex/1_data}, \includegraphics{output/...}) with files that
# live in tex/ (paper.sty, bib.bib, bibliography.bst). It must therefore be
# compiled from methodology/ with tex/ and output/ added to the TeX search
# path -- otherwise \usepackage{paper} resolves to the unrelated system
# paper.cls and the build dies with "Two \LoadClass commands".
#
# The numbers, tables and figures come from the pipeline
# (code/5. note_figures.r, code/6. note_numbers.r); run it first.
#
# Usage:  bash tex/build_note.sh        (run from anywhere)
#
set -euo pipefail

cd "$(dirname "$0")/.."                       # methodology/, wherever this script lives

for f in tex/numbers.tex output/table_summary.tex output/table_gini_cv.tex \
         output/table_aggregate.tex output/table_thresholds.tex; do
  [[ -f "$f" ]] || { echo "Missing $f: run methodology/run_pipeline.sh first" >&2; exit 1; }
done

export TEXINPUTS=".:./tex//:./output//:${TEXINPUTS:-}"
export BIBINPUTS=".:./tex//:${BIBINPUTS:-}"
export BSTINPUTS=".:./tex//:${BSTINPUTS:-}"

JOB=note
pdflatex_run=(pdflatex -interaction=nonstopmode -halt-on-error
              -output-directory=tex -jobname="$JOB" tex/draft.tex)

"${pdflatex_run[@]}" > /dev/null              # pass 1  -> tex/note.aux
bibtex "tex/$JOB" > /dev/null                 # -> tex/note.bbl
"${pdflatex_run[@]}" > /dev/null              # pass 2  (pull in the .bbl)
for pass in 3 4 5; do                         # settle citations and cross-references
  "${pdflatex_run[@]}" > /dev/null
  grep -q -E "Rerun to get (cross-references|citations)" "tex/$JOB.log" || break
done

# fail on undefined references or citations, and show other warnings
if grep -E "There were undefined|Citation .* undefined|Reference .* undefined|Rerun to get cross-references" "tex/$JOB.log"; then
  echo "Unresolved references or citations: see tex/$JOB.log" >&2
  exit 1
fi
grep -E "^(LaTeX|Package) Warning|^Overfull" "tex/$JOB.log" || true

# keep only the PDF; drop the build artifacts
rm -f "tex/$JOB".{aux,log,bbl,blg,out,fls,fdb_latexmk,toc}

echo "Built tex/note.pdf"
