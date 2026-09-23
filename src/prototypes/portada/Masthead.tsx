'use client'

import s from './App.module.css'

interface MastheadProps {
  /** the front page gets the full nameplate; inside pages a compact one */
  variant: 'full' | 'compact'
  /** shows "Empezar de nuevo" on the right of the compact masthead */
  onRestart?: () => void
}

export default function Masthead({ variant, onRestart }: MastheadProps) {
  if (variant === 'full') {
    return (
      <header className={s.mast}>
        <div className={s.topbar}>
          <span>
            Edición 2024<span className={s.wideOnly}> · Datos oficiales del INE</span>
          </span>
          <span className={s.wideOnly}>Gratis · Sin registro</span>
          <span>
            <span className={s.wideOnly}>comparatuingreso.es</span>
            <span className={s.narrowOnly}>Datos del INE</span>
          </span>
        </div>
        <p className={s.nameplate}>Compara tu ingreso</p>
        <div className={s.rules} aria-hidden="true" />
      </header>
    )
  }

  return (
    <header className={s.mastCompact}>
      <div className={s.compactRow}>
        <span className={s.edLeft}>
          Edición 2024<span className={s.edExtra}> · Datos del INE</span>
        </span>
        <span className={s.edRight} aria-hidden="true">
          Datos del INE
        </span>
        <p className={s.nameplateSmall}>Compara tu ingreso</p>
        {onRestart && (
          <button type="button" className={s.restart} onClick={onRestart}>
            <span aria-hidden="true">↺</span> Empezar de nuevo
          </button>
        )}
      </div>
      <div className={s.rulesThin} aria-hidden="true" />
    </header>
  )
}
