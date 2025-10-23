export default function IngresosTab() {
  return (
    <div className="help-content">
      <h4>¿Qué ingresos debo incluir?</h4>
      <p>Debes sumar todos los ingresos netos mensuales de tu hogar, incluyendo:</p>
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
          <li>Incluye los ingresos de todos los miembros del hogar</li>
          <li>Los ingresos deben ser netos (después de impuestos y retenciones)</li>
          <li>Si algún ingreso es variable, puedes hacer una media mensual</li>
          <li>Incluye pagas extra prorrateadas si las tienes</li>
        </ul>
      </div>
    </div>
  )
}
