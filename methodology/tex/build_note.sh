#!/usr/bin/env bash
#
# Build the methodology note locally  ->  tex/note.pdf
#
# tex/draft.tex follows the Overleaf project layout: it mixes root-relative
# inputs (\input{tex/1_data}, \includegraphics{output/...}) with files that
# live in tex/ (paper.sty, bib.bib, bibliography.bst). It must therefore be
# compiled from the REPO ROOT with tex/ and output/ added to the TeX search
# path -- otherwise \usepackage{paper} resolves to the unrelated system
# paper.cls and the build dies with "Two \LoadClass commands".
#
# Usage:  bash tex/build_note.sh        (run from anywhere)
#
set -euo pipefail

cd "$(dirname "$0")/.."                       # repo root, wherever this script lives

export TEXINPUTS=".:./tex//:./output//:${TEXINPUTS:-}"
export BIBINPUTS=".:./tex//:${BIBINPUTS:-}"
export BSTINPUTS=".:./tex//:${BSTINPUTS:-}"

JOB=note
pdflatex_run=(pdflatex -interaction=nonstopmode -halt-on-error
              -output-directory=tex -jobname="$JOB" tex/draft.tex)

"${pdflatex_run[@]}"                          # pass 1  -> tex/note.aux
bibtex "tex/$JOB" || true                     # note: draft.tex declares \bibliographystyle
                                              #   twice, so bibtex exits non-zero but still
                                              #   writes tex/note.bbl -- tolerated on purpose.
"${pdflatex_run[@]}"                          # pass 2  (pull in the .bbl)
"${pdflatex_run[@]}"                          # pass 3  (settle cross-references)

# keep only the PDF; drop the build artifacts
rm -f "tex/$JOB".{aux,log,bbl,blg,out,fls,fdb_latexmk,toc}

echo "Built tex/note.pdf"
