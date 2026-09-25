export default function GraficaTab() {
  return (
    <div className="help-content">
      <h4>¿Cómo interpretar los gráficos?</h4>
      <p>Los gráficos muestran cómo se reparte la población según su renta por unidad de consumo:</p>
      <ul>
        <li>En los cuadrados, cada uno es el 1 % de la población, ordenada de menos a más ingresos. El tuyo es el azul, y los que quedan antes que él son las personas con menos ingresos que tú</li>
        <li>En la curva, las zonas más altas indican dónde se concentra más gente</li>
        <li>La renta de tu hogar se marca con una línea azul, y tu predicción con una línea discontinua ocre</li>
        <li>El percentil indica el porcentaje de la población con menos ingresos que tú</li>
      </ul>
      <p>Por ejemplo, si estás en el percentil 70, el 70 % de la población tiene menos ingresos que tú.</p>
    </div>
  )
}
