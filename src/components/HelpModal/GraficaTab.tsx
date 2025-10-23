export default function GraficaTab() {
  return (
    <div className="help-content">
      <h4>¿Cómo interpretar la gráfica?</h4>
      <p>La curva azul muestra cómo se distribuyen los ingresos en la población:</p>
      <ul>
        <li>Las zonas más altas indican donde se concentra más gente</li>
        <li>Tu posición se marca con una línea vertical en azul oscuro</li>
        <li>Tu percepción en la distribución nacional se marcará con una línea vertical en rojo</li>
        <li>El percentil indica el porcentaje de hogares que tienen menos ingresos que tú</li>
      </ul>
      <p>Por ejemplo, si estás en el percentil 70, significa que el 70% de la población tiene ingresos menores que el tuyo.</p>
    </div>
  )
}
