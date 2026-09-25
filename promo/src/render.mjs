// Renders src/scene.html frame by frame with headless Chrome and encodes it with ffmpeg.
//   npm run preview [-- 1.5 7.2 …]   → still frames in promo/frames/ (default: a contact set)
//   npm run render                   → promo/videos/comparatuingreso-promo-1920x1080.mp4 (+ poster.png)
// The scene is a pure function of time (window.render(t)), so every frame is exact. The score is
// synthesised by music.mjs on the same clock and muxed in as AAC.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import ffmpegPath from 'ffmpeg-static'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const preview = args.includes('--preview')
const FPS = 60

const data = {
  tracts: JSON.parse(readFileSync(here + 'data/tracts.json', 'utf8')),
  dist: JSON.parse(readFileSync(here + 'data/dist.json', 'utf8')),
}
const built = here + '.build.html'
writeFileSync(built, readFileSync(here + 'scene.html', 'utf8').replace('__DATA__', JSON.stringify(data)))

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.error('pageerror:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()) })
await page.goto('file://' + built, { waitUntil: 'networkidle' })
await page.evaluate(() => window.ready)
const duration = await page.evaluate(() => window.DURATION)
const frame = (t) => page.evaluate((x) => window.render(x), t)

if (preview) {
  const asked = args.filter((a) => /^[0-9.]+$/.test(a)).map(Number)
  const times = asked.length ? asked : [0.9, 2.6, 3.5, 4.4, 4.9, 5.4, 6.5, 7.6, 8.3, 8.8, 9.2, 10.6, 12.0, 13.4, 14.7]
  mkdirSync(root + 'frames', { recursive: true })
  for (const t of times) {
    await frame(t)
    await page.screenshot({ path: `${root}frames/t${t.toFixed(2).padStart(5, '0')}.png` })
  }
  console.log(`${times.length} preview frames in promo/frames/`)
} else {
  await import('./music.mjs')
  mkdirSync(root + 'videos', { recursive: true })
  const out = root + 'videos/comparatuingreso-promo-1920x1080.mp4'
  const ff = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-i', here + '.score.wav',
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(duration),
    '-movflags', '+faststart', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] })
  const n = Math.round(duration * FPS)
  const t0 = Date.now()
  for (let f = 0; f < n; f++) {
    await frame(f / FPS)
    const png = await page.screenshot({ type: 'png' })
    if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r))
    if (f % 300 === 0) console.log(`frame ${f}/${n} · ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  }
  ff.stdin.end()
  await new Promise((r) => ff.on('close', r))
  await frame(duration - 0.3)
  await page.screenshot({ path: root + 'videos/poster.png' })
  console.log(`wrote ${out} (${n} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s)`)
}
await browser.close()
