import s from './Brand.module.css'
import { cx } from './network'

/** The mark (three line colours in a signage square) and the name. */
export default function Brand({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={cx(s.brand, s[size])}>
      <span className={s.mark} aria-hidden="true">
        <span className={s.bar1} />
        <span className={s.bar2} />
        <span className={s.bar3} />
      </span>
      <span className={s.name}>Compara tu ingreso</span>
    </div>
  )
}
