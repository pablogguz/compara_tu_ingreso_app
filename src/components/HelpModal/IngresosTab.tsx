import { INCOME_YEAR } from '@/lib/years'

export default function IngresosTab() {
  return (
    <div className="help-content">
      <h4>¿Qué ingresos debo incluir?</h4>
      <p>Debes sumar todos los ingresos netos mensuales de tu hogar en {INCOME_YEAR}, incluyendo:</p>
      <ul>
        <li>Salarios y nóminas</li>
        <li>Pensiones de cualquier tipo (jubilación, incapacidad, viudedad...)</li>
        <li>Prestaciones por desempleo</li>
        <li>Ingresos por alquileres de viviendas o locales</li>
        <li>Rendimientos de actividades económicas (autónomos)</li>
        <li>Intereses, dividendos y otros rendimientos del capital</li>
        <li>Otras ayudas o prestaciones públicas</li>
      </ul>

      <div className="help-alert mt-4">
        <p className="mb-2"><strong>Importante:</strong></p>
        <ul>
          <li>Usa los ingresos de {INCOME_YEAR}, que es el año al que se refieren los datos con los que te comparamos</li>
          <li>Incluye los ingresos de todos los miembros del hogar</li>
          <li>Los ingresos deben ser netos (después de impuestos y retenciones)</li>
          <li>Si algún ingreso es variable, puedes hacer una media mensual</li>
          <li>Si cobras pagas extra, escribe lo que entra en un mes normal (sin prorratear las extras) y elige 14 pagas. Nosotros sumamos las dos pagas extra</li>
          <li>No cuentes el dinero que os den familiares que no viven con vosotros ni lo que se cobre en negro, porque los datos del INE tampoco lo recogen</li>
        </ul>
      </div>
    </div>
  )
}
