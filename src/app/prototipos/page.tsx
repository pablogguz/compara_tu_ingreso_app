import Link from 'next/link'
import s from './index.module.css'

const PROTOTYPES = [
  {
    letter: 'A',
    href: '/prototipos/portada/',
    name: 'Portada',
    desc: 'La app como una portada de periódico: el cuestionario es una frase que completas y el resultado se lee como un reportaje.',
  },
  {
    letter: 'B',
    href: '/prototipos/formulario/',
    name: 'Formulario',
    desc: 'La app como un impreso oficial: rellenas las casillas de una declaración y recibes un justificante sellado con tu posición.',
  },
  {
    letter: 'C',
    href: '/prototipos/cien/',
    name: 'Cien',
    desc: 'Si España fuera 100 personas, ¿cuál serías tú? Una pregunta por pantalla y tu cuadrado entre cien.',
  },
]

export default function PrototiposIndex() {
  return (
    <main className={s.root}>
      <div className={s.inner}>
        <p className={s.eyebrow}>Compara tu ingreso · prototipos</p>
        <h1 className={s.title}>Tres formas de contar lo mismo</h1>
        <p className={s.lede}>
          Tres rediseños completos de la app, con los datos y el cálculo reales. No guardan
          ninguna respuesta ni cargan analítica.
        </p>
        <ul className={s.grid}>
          {PROTOTYPES.map((p) => (
            <li key={p.href}>
              <Link className={s.card} href={p.href}>
                <span className={s.letter}>{p.letter}</span>
                <span className={s.name}>{p.name}</span>
                <span className={s.desc}>{p.desc}</span>
                <span className={s.go}>Probar →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
