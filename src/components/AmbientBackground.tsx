// Fixed-position ambient lighting layer behind everything else. Three slowly
// drifting blurred orbs in the brand palette give the glassmorphism surfaces
// something to refract.
export default function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <span className="ambient-bg__orb ambient-bg__orb--1" />
      <span className="ambient-bg__orb ambient-bg__orb--2" />
      <span className="ambient-bg__orb ambient-bg__orb--3" />
      <div className="ambient-bg__grain" />
    </div>
  )
}
