import Link from 'next/link'
import AmbientBackground from '@/components/AmbientBackground'
import { SCENARIOS, MOCK_GROUPS } from '@/components/mocks/scenarios'

export default function MocksIndex() {
  return (
    <>
      <AmbientBackground />
      <main className="mocks-index">
        <p className="mocks-index__eyebrow">compara tu ingreso · maquetas</p>
        <h1 className="mocks-index__title">Todas las pantallas</h1>
        <p className="mocks-index__lede">
          Cada maqueta arranca la app real directamente en ese estado, con datos
          reales y sin enviar nada a la hoja de respuestas ni a analítica. En
          cada una: <kbd>←</kbd> <kbd>→</kbd> para pasar de pantalla, <kbd>R</kbd>{' '}
          para repetir la entrada y <kbd>H</kbd> para ocultar la barra. Cambia el
          ancho de la ventana para ver la versión móvil.
        </p>

        {MOCK_GROUPS.map((group) => {
          const items = SCENARIOS.filter((s) => s.group === group)
          return (
            <section key={group} className="mocks-group" aria-labelledby={`group-${group}`}>
              <h2 className="mocks-group__title" id={`group-${group}`}>
                {group}
                <span className="mocks-group__count">{items.length}</span>
              </h2>
              <ul className="mocks-grid">
                {items.map((s) => (
                  <li key={s.id}>
                    <Link className="mock-card" href={`/mocks/${s.id}/`}>
                      <span className="mock-card__title">
                        {s.title}
                        <i className="fas fa-arrow-right" aria-hidden="true"></i>
                      </span>
                      <span className="mock-card__desc">{s.description}</span>
                      <span className="mock-card__path">/mocks/{s.id}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </main>
    </>
  )
}
