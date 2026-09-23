// Small line icons, drawn on a 24px grid with square signage strokes.

interface IconProps {
  size?: number
  className?: string
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  'aria-hidden': true as const,
  focusable: false as const,
})

export function MinusIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth={3} />
    </svg>
  )
}

export function PlusIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 12h14M12 5v14" fill="none" stroke="currentColor" strokeWidth={3} />
    </svg>
  )
}

export function SearchIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth={2.4} />
      <path d="M15.5 15.5L21 21" fill="none" stroke="currentColor" strokeWidth={2.6} />
    </svg>
  )
}

export function ArrowIcon({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 12h16M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth={3} />
    </svg>
  )
}

export function BackspaceIcon({ size = 26, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 5h13v14H8l-6-7z" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M11.5 9l6 6M17.5 9l-6 6" fill="none" stroke="currentColor" strokeWidth={2.2} />
    </svg>
  )
}

export function WarningIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3l10 18H2z" fill="currentColor" />
      <path d="M12 10v5" stroke="var(--yellow, #ffcd3c)" strokeWidth={2.4} />
      <circle cx="12" cy="18" r="1.3" fill="var(--yellow, #ffcd3c)" />
    </svg>
  )
}

export function StopIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 6.5v7" stroke="#fff" strokeWidth={2.6} />
      <circle cx="12" cy="17.3" r="1.5" fill="#fff" />
    </svg>
  )
}

export function CloseIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth={3} />
    </svg>
  )
}

export function CheckIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth={3} />
    </svg>
  )
}

export function GuessIcon({ size = 22, className, fill = '#fff' }: IconProps & { fill?: string }) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9.5" fill={fill} stroke="currentColor" strokeWidth={2.6} strokeDasharray="3.6 2.6" />
    </svg>
  )
}

export function ExternalIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" fill="none" stroke="currentColor" strokeWidth={2.4} />
    </svg>
  )
}
