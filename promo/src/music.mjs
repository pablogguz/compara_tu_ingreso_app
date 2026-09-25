// Composes and synthesises the promo's score: 15 s at 120 BPM, locked to the cut in scene.html.
// Every sound is generated here (no samples, no loops), so the music is original and free of
// third-party rights.
//   node src/music.mjs → src/.score.wav (48 kHz, 16-bit stereo)
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SR = 48000, DUR = 15, N = SR * DUR
const TAU = Math.PI * 2
const S = (t) => Math.round(t * SR)
const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const lerp = (a, b, t) => a + (b - a) * t
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12)

// deterministic noise (mulberry32), so every render is identical
let seed = 0x2458c6
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const noise = () => rnd() * 2 - 1

// ---------- buses: dry + reverb send; the "ducked" ones pump with the kick ----------
const bus = (ducked = false) => ({ L: new Float32Array(N), R: new Float32Array(N), sL: new Float32Array(N), sR: new Float32Array(N), ducked })
const B = { keys: bus(true), pad: bus(true), bass: bus(true), arp: bus(true), drums: bus(), fx: bus(), bell: bus() }
const duck = new Float32Array(N).fill(1)
function put(b, i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return
  const a = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4, l = v * Math.cos(a), r = v * Math.sin(a)
  b.L[i] += l; b.R[i] += r; b.sL[i] += l * send; b.sR[i] += r * send
}

// ---------- RBJ biquads ----------
function biquad(type, f, q = 0.707) {
  const w = (TAU * clamp(f, 10, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q), a0 = 1 + al
  let b0, b1, b2
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0 }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0 }
  else { b0 = al; b1 = 0; b2 = -al }
  return [b0 / a0, b1 / a0, b2 / a0, (-2 * c) / a0, (1 - al) / a0]
}
class Filt {
  constructor(k) { this.k = k; this.x1 = this.x2 = this.y1 = this.y2 = 0 }
  run(x) { const k = this.k, y = k[0] * x + k[1] * this.x1 + k[2] * this.x2 - k[3] * this.y1 - k[4] * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y }
}

// ---------- instruments ----------
// electric piano: two-operator FM with a short bright tine, slow stereo tremolo
function ep(t0, m, vel, hold = 1.2) {
  const f = midi(m), n0 = S(t0), dec = 1.7 * Math.pow(262 / f, 0.35), len = S(hold + 1.4)
  for (let k = 0; k < len; k++) {
    const t = k / SR
    const env = (1 - Math.exp(-t / 0.003)) * Math.exp(-t / dec) * (t > hold ? Math.exp(-(t - hold) / 0.18) : 1)
    const I = 1.25 * Math.exp(-t / 0.22) + 0.2
    const v = Math.sin(TAU * f * t + I * Math.sin(TAU * f * t)) + 0.08 * Math.exp(-t / 0.04) * Math.sin(TAU * f * 7.02 * t)
    put(B.keys, n0 + k, v * env * vel, 0.25 * Math.sin(TAU * 2.1 * ((n0 + k) / SR) + m), 0.3)
  }
}
function strum(t0, notes, vel, hold) {
  const g = vel / Math.sqrt(notes.length)
  notes.forEach((m, i) => ep(t0 + i * 0.011, m, g * (0.85 + 0.3 * (i / notes.length)), hold))
}
// pad: band-limited detuned saws, softened
function pad(t0, t1, notes, gain) {
  const n0 = S(t0), n1 = Math.min(N, S(t1 + 0.9))
  for (const m of notes) for (const [det, pan] of [[-7, -0.6], [0, 0], [7, 0.6]]) {
    const f = midi(m) * Math.pow(2, det / 1200), H = []
    for (let h = 1; h <= 12 && f * h < 8000; h++) H.push([f * h, 1 / Math.pow(h, 1.25) / (1 + Math.pow((f * h) / 1100, 2)), rnd() * TAU])
    for (let i = n0; i < n1; i++) {
      const t = (i - n0) / SR, T = i / SR
      const env = Math.pow(Math.min(1, t / 0.35), 2) * (T > t1 ? Math.exp(-(T - t1) / 0.2) : 1)
      let v = 0
      for (const [fh, a, ph] of H) v += a * Math.sin(TAU * fh * T + ph)
      put(B.pad, i, (v * env * gain) / notes.length, pan, 0.5)
    }
  }
}
function bass(t0, t1, m, gain, rel = 0.03) {
  const f = midi(m), n0 = S(t0), n1 = Math.min(N, S(t1 + rel * 6))
  let ph = 0
  for (let i = n0; i < n1; i++) {
    const t = (i - n0) / SR, T = i / SR
    const env = Math.min(1, t / 0.012) * (T > t1 ? Math.exp(-(T - t1) / rel) : 1) * (0.8 + 0.2 * Math.exp(-t / 0.3))
    ph += (TAU * f) / SR
    const v = Math.tanh(1.3 * (Math.sin(ph) + 0.32 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)))
    put(B.bass, i, v * env * gain, 0, 0)
  }
}
function kick(t0, gain = 1) {
  const n0 = S(t0)
  let ph = 0
  for (let k = 0; k < S(0.45); k++) {
    const t = k / SR
    ph += (TAU * (46 + 120 * Math.exp(-t / 0.03))) / SR
    const env = Math.exp(-t / 0.22) * Math.min(1, t / 0.0015)
    put(B.drums, n0 + k, (Math.tanh(1.3 * Math.sin(ph)) * env + noise() * Math.exp(-t / 0.0025) * 0.22) * gain, 0, 0.03)
  }
  for (let k = 0; k < S(0.6) && n0 + k < N; k++) {
    const t = k / SR
    duck[n0 + k] = Math.min(duck[n0 + k], 1 - 0.5 * Math.min(1, t / 0.005) * Math.exp(-t / 0.13))
  }
}
function snap(t0, gain = 1, pan = 0.12) {
  const n0 = S(t0), bp = new Filt(biquad('bp', 1900, 1.1)), hp = new Filt(biquad('hp', 700))
  for (let k = 0; k < S(0.32); k++) {
    const t = k / SR
    const env = Math.exp(-t / 0.004) + (t > 0.009 ? Math.exp(-(t - 0.009) / 0.004) : 0) + (t > 0.018 ? 0.9 * Math.exp(-(t - 0.018) / 0.11) : 0)
    put(B.drums, n0 + k, hp.run(bp.run(noise())) * env * gain * 2.2, pan, 0.3)
  }
}
function shaker(t0, vel, pan = 0.35) {
  const n0 = S(t0), hp = new Filt(biquad('hp', 6500)), hp2 = new Filt(biquad('hp', 6500))
  for (let k = 0; k < S(0.12); k++) {
    const t = k / SR
    put(B.drums, n0 + k, hp2.run(hp.run(noise())) * Math.min(1, t / 0.004) * Math.exp(-t / 0.03) * vel, pan, 0.1)
  }
}
function whoosh(t0, dur, f0, f1, gain, pan0 = -0.6, pan1 = 0.6) {
  const n0 = S(t0), n = S(dur), fl = new Filt(biquad('bp', f0, 1.3)), fr = new Filt(biquad('bp', f0, 1.3))
  for (let k = 0; k < n; k++) {
    const x = k / n
    if (k % 32 === 0) fl.k = fr.k = biquad('bp', f0 * Math.pow(f1 / f0, x), 1.3)
    const env = Math.pow(Math.sin(Math.PI * x), 2) * gain * 3
    const p = lerp(pan0, pan1, x)
    put(B.fx, n0 + k, fl.run(noise()) * env, p - 0.3, 0.35)
    put(B.fx, n0 + k, fr.run(noise()) * env, p + 0.3, 0.35)
  }
}
// noise swell + a rising tone, cut dead on the downbeat it leads to
function riser(t0, t1, gain) {
  const n0 = S(t0), n = S(t1 - t0), hl = new Filt(biquad('hp', 300)), hr = new Filt(biquad('hp', 300))
  let ph = 0
  for (let k = 0; k < n; k++) {
    const x = k / n
    if (k % 32 === 0) hl.k = hr.k = biquad('hp', 300 * Math.pow(18, x), 0.9)
    const env = Math.pow(x, 2.2) * Math.min(1, (n - k) / S(0.006)) * gain
    ph += (TAU * midi(lerp(60, 84, x * x))) / SR
    const tone = Math.sin(ph) * 0.18
    put(B.fx, n0 + k, (hl.run(noise()) + tone) * env, -0.4, 0.3)
    put(B.fx, n0 + k, (hr.run(noise()) + tone) * env, 0.4, 0.3)
  }
}
function crash(t0, gain) {
  const n0 = S(t0), hl = new Filt(biquad('hp', 2600)), hr = new Filt(biquad('hp', 2600)), ll = new Filt(biquad('lp', 10500)), lr = new Filt(biquad('lp', 10500))
  for (let k = 0; k < S(2.6); k++) {
    const t = k / SR, env = Math.min(1, t / 0.001) * Math.exp(-t / 0.9) * gain
    put(B.fx, n0 + k, ll.run(hl.run(noise())) * env, -0.7, 0.4)
    put(B.fx, n0 + k, lr.run(hr.run(noise())) * env, 0.7, 0.4)
  }
}
function boom(t0, gain) {
  const n0 = S(t0)
  let ph = 0
  for (let k = 0; k < S(1.6); k++) {
    const t = k / SR
    ph += (TAU * (38 + 26 * Math.exp(-t / 0.25))) / SR
    put(B.drums, n0 + k, Math.sin(ph) * Math.min(1, t / 0.003) * Math.exp(-t / 0.6) * gain, 0, 0.08)
  }
}
// bell: slightly inharmonic partials, the high ones dying first
const BELL = [[1, 1, 2.4], [2, 0.42, 1.5], [3, 0.16, 1.0], [4.16, 0.2, 0.65], [5.43, 0.09, 0.45], [6.79, 0.05, 0.3]]
function bell(t0, m, vel, pan = 0) {
  const f = midi(m), n0 = S(t0), sc = Math.pow(880 / f, 0.3)
  for (let k = 0; k < S(3.2); k++) {
    const t = k / SR
    let v = 0
    for (const [r, a, d] of BELL) v += a * Math.exp(-t / (d * sc)) * Math.sin(TAU * f * r * t)
    put(B.bell, n0 + k, v * vel * Math.min(1, t / 0.0015), pan, 0.45)
  }
}
function pluck(t0, m, vel, pan = 0, tau = 0.3, b = B.arp) {
  const f = midi(m), n0 = S(t0)
  for (let k = 0; k < S(tau * 5); k++) {
    const t = k / SR, ph = TAU * f * t
    const v = Math.sin(ph) * Math.exp(-t / tau) + 0.35 * Math.sin(2 * ph) * Math.exp(-t / (tau * 0.45)) + 0.12 * Math.sin(3 * ph) * Math.exp(-t / (tau * 0.3))
    put(b, n0 + k, (v * Math.min(1, t / 0.001) + noise() * Math.exp(-t / 0.002) * 0.05) * vel, pan, 0.4)
  }
}

// ---------- the score ----------
// cut: 0 question · 2 squares · 3 sort · 4 "¿qué persona serías tú?" (4.25–5.5 the cursor hops)
//      6 histogram · 7 curve · 8 "¿Tú?" walks it · 9.5 map · 10 "Miles de barrios" · 13 end card · 13.5 URL
const CH = [
  [0.0, 2.0, [53, 57, 60, 64], 41],          // Fmaj7   the question, left open
  [2.0, 4.0, [55, 59, 62, 64], 43],          // G6
  [4.0, 6.0, [55, 60, 62, 64], 36],          // Cadd9   "¿qué persona serías tú?"
  [6.0, 8.0, [57, 60, 64, 67], 45],          // Am7
  [8.0, 10.0, [53, 57, 60, 64], 41],         // Fmaj7   "¿Tú?"
  [10.0, 11.0, [52, 55, 59, 62], 40],        // Em7     the map
  [11.0, 12.0, [53, 57, 60, 64], 41],        // Fmaj7
  [12.0, 12.5, [55, 60, 62, 67], 43],        // Gsus4
  [12.5, 13.0, [55, 59, 62, 67], 43],        // G
  [13.0, 15.0, [48, 55, 60, 62, 64, 67], 36], // Cadd9   end card
]
const chordAt = (t) => CH.find(([a, b]) => t >= a - 1e-9 && t < b - 1e-9) || CH[CH.length - 1]

// pad under everything, and the bass from the reveal on
for (const [a, b, notes] of CH) pad(a, b, notes, a < 4 ? 0.8 : 1)
for (const [a, b, , root] of CH) if (a >= 4) bass(a, b === 15 ? 14.2 : b - 0.02, root, a >= 13 ? 1.1 : 1, b === 15 ? 0.35 : 0.03)

// 1 · the question: a chord and a phrase that hangs on the ninth
strum(0.0, CH[0][2], 0.75, 1.8)
;[[0.5, 72], [0.75, 76], [1.0, 81], [1.5, 79]].forEach(([t, m], i) => pluck(t, m, 0.55 + i * 0.05, -0.2 + i * 0.15, 0.45, B.bell))
riser(1.35, 2.0, 0.25)

// 2 · the squares pop in with a run, then shuffle into order
strum(2.0, CH[1][2], 0.6, 1.8)
;[67, 71, 74, 79, 83, 86, 88].forEach((m, i) => pluck(2.0 + i * 0.09, m, 0.35 + i * 0.03, -0.6 + i * 0.2, 0.35, B.bell))
for (let t = 2.0; t < 4.0 - 1e-9; t += 0.125) shaker(t, [0.25, 0.12, 0.35, 0.12][Math.round((t - 2) / 0.125) % 4])
whoosh(3.0, 0.85, 700, 2600, 0.5)
for (let i = 0; i < 10; i++) shaker(3.0 + i * 0.075, 0.5, i % 2 ? 0.6 : -0.6)
riser(3.4, 4.0, 0.35)

// 3 · the groove, from your square to the end card
for (let t = 4.0; t <= 12.0 + 1e-9; t += 1.0) kick(t)
for (let t = 4.5; t < 12.0; t += 1.0) snap(t, 0.8)
for (let t = 4.0; t < 12.5 - 1e-9; t += 0.125) shaker(t, [0.5, 0.22, 0.75, 0.22][Math.round((t - 4) / 0.125) % 4])
boom(4.0, 0.5)
// one note per hop of the cursor, ending on the ninth: still a question
;[[4.25, 76], [4.5, 84], [4.75, 79], [5.0, 88], [5.25, 81], [5.5, 86]].forEach(([t, m], i) => bell(t, m, 0.42 + (i === 5 ? 0.15 : 0), [-0.4, 0.3, -0.1, 0.5, -0.5, 0.1][i]))
// electric piano comping: on the chord, then the "and" of 2 and beat 4
for (const [a, b, notes] of CH) {
  if (a < 4 || a >= 13) continue
  strum(a, notes, a === 8 ? 1.0 : 0.85, 0.55)
  if (a + 0.75 < b) strum(a + 0.75, notes, 0.45, 0.2)
  if (a + 1.5 < b) strum(a + 1.5, notes, 0.5, 0.35)
}
// 8th-note arpeggio from the histogram on
for (let t = 6.0, s = 0; t < 12.5 - 1e-9; t += 0.25, s++) {
  const tones = chordAt(t)[2].slice(-4).map((m) => m + 12)
  pluck(t, tones[[0, 1, 2, 3, 2, 1, 3, 2][s % 8]], s % 2 ? 0.5 : 0.7, s % 2 ? 0.45 : -0.45)
}
whoosh(6.0, 1.0, 2600, 450, 0.5, 0.6, -0.6)
riser(7.0, 8.0, 0.55)
for (let i = 0; i < 4; i++) snap(7.5 + i * 0.125, 0.25 + i * 0.12, i % 2 ? 0.3 : -0.3)
boom(8.0, 0.9); crash(8.0, 0.35)
bell(8.0, 81, 0.75); bell(8.0, 84, 0.35, 0.3)
riser(9.0, 9.45, 0.3)
whoosh(9.45, 0.85, 500, 3200, 0.55)
// the map's dots bloom: a rain of soft, high notes
for (let i = 0; i < 34; i++) {
  const x = rnd(), t = 9.6 + 1.4 * (0.5 - 0.5 * Math.cos(Math.PI * x)) + rnd() * 0.05
  pluck(t, [76, 79, 81, 84, 86, 88, 91][Math.floor(rnd() * 7)], 0.12 + rnd() * 0.16, rnd() * 1.6 - 0.8, 0.5, B.bell)
}
boom(10.0, 0.5)
bell(11.0, 81, 0.5, -0.2); bell(11.5, 76, 0.4, 0.2)
riser(12.0, 13.0, 0.6)
for (let i = 0; i < 8; i++) snap(12.5 + i * 0.0625, 0.18 + i * 0.07, i % 2 ? 0.3 : -0.3)

// 4 · the end card: land on C and let it ring
kick(13.0, 1.1); boom(13.0, 1.0); crash(13.0, 0.45)
strum(13.0, CH[9][2], 1.1, 1.9)
bell(13.0, 84, 0.8); bell(13.0, 79, 0.45, -0.3)
bell(13.5, 88, 0.35, 0.3)
;[[13.75, 76], [14.0, 79], [14.25, 84]].forEach(([t, m], i) => pluck(t, m, 0.3 - i * 0.05, 0.3 - i * 0.3, 0.5, B.bell))

// ---------- reverb (Freeverb) ----------
function freeverb(inL, inR, room = 0.86, damp = 0.3) {
  const sc = SR / 44100, out = [new Float32Array(N), new Float32Array(N)], pre = S(0.018)
  ;[inL, inR].forEach((inp, ch) => {
    const spread = ch ? 23 : 0
    const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * sc)), i: 0, f: 0 }))
    const aps = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * sc)), i: 0 }))
    for (let n = 0; n < N; n++) {
      const x = (n >= pre ? inp[n - pre] : 0) * 0.015
      let y = 0
      for (const c of combs) { const o = c.buf[c.i]; c.f = o * (1 - damp) + c.f * damp; c.buf[c.i] = x + c.f * room; if (++c.i >= c.buf.length) c.i = 0; y += o }
      for (const a of aps) { const b = a.buf[a.i]; a.buf[a.i] = y + b * 0.5; if (++a.i >= a.buf.length) a.i = 0; y = b - y }
      out[ch][n] = y * 3
    }
  })
  return out
}

// ---------- mix and master ----------
const LVL = { keys: 0.5, pad: 0.16, bass: 0.32, arp: 0.2, drums: 0.62, fx: 0.3, bell: 0.3 }
const mL = new Float32Array(N), mR = new Float32Array(N), sL = new Float32Array(N), sR = new Float32Array(N)
const report = []
for (const [name, b] of Object.entries(B)) {
  const g = LVL[name]
  let ss = 0
  for (let n = 0; n < N; n++) {
    const d = b.ducked ? duck[n] : 1
    mL[n] += b.L[n] * g * d; mR[n] += b.R[n] * g * d; sL[n] += b.sL[n] * g * d; sR[n] += b.sR[n] * g * d
    ss += (b.L[n] * g) ** 2 + (b.R[n] * g) ** 2
  }
  report.push(`${name} ${(10 * Math.log10(ss / (2 * N) + 1e-12)).toFixed(1)} dB`)
}
const [rL, rR] = freeverb(sL, sR)
const hpL = new Filt(biquad('hp', 28)), hpR = new Filt(biquad('hp', 28))
for (let n = 0; n < N; n++) { mL[n] = hpL.run(mL[n] + rL[n] * 0.55); mR[n] = hpR.run(mR[n] + rR[n] * 0.55) }

// makeup gain, then a look-ahead peak limiter at -1.5 dBFS
const MAKEUP = Number(process.env.MUSIC_GAIN || 0.7), CEIL = Math.pow(10, -1.5 / 20), LA = S(0.004), REL = Math.exp(-1 / S(0.12))
const peak = new Float32Array(N)
for (let n = 0; n < N; n++) peak[n] = Math.max(Math.abs(mL[n]), Math.abs(mR[n])) * MAKEUP
const gain = new Float32Array(N)
let g = 1
for (let n = N - 1; n >= 0; n--) { let p = 0; for (let k = 0; k <= LA && n + k < N; k++) p = Math.max(p, peak[n + k]); gain[n] = p > CEIL ? CEIL / p : 1 }
for (let n = 0; n < N; n++) { g = gain[n] < g ? gain[n] : gain[n] + (g - gain[n]) * REL; gain[n] = g }
{ let mn = 1, below = 0, pk = 0; for (let n = 0; n < N; n++) { mn = Math.min(mn, gain[n]); if (gain[n] < 0.89) below++; pk = Math.max(pk, peak[n]) } report.push(`limiter: peak in ${(20 * Math.log10(pk)).toFixed(1)} dBFS, max reduction ${(20 * Math.log10(mn)).toFixed(1)} dB, >1 dB on ${(100 * below / N).toFixed(1)}% of samples`) }
// fades: 6 ms in, 0.55 s out
for (let n = 0; n < N; n++) {
  const t = n / SR, f = Math.min(1, t / 0.006) * (t > DUR - 0.55 ? Math.pow((DUR - t) / 0.55, 1.5) : 1)
  mL[n] *= MAKEUP * gain[n] * f; mR[n] *= MAKEUP * gain[n] * f
}

// 16-bit WAV with TPDF dither
const buf = Buffer.alloc(44 + N * 4)
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24)
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40)
for (let n = 0; n < N; n++) {
  for (const [c, x] of [[0, mL[n]], [1, mR[n]]]) buf.writeInt16LE(clamp(Math.round(x * 32767 + (rnd() - rnd())), -32768, 32767), 44 + n * 4 + c * 2)
}
const out = fileURLToPath(new URL('.score.wav', import.meta.url))
writeFileSync(out, buf)
console.log(`score → ${out}\n  ${report.join(' · ')}`)
