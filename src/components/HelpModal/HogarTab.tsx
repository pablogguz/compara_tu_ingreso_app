export default function HogarTab() {
  return (
    <div className="help-content">
      <h4>¿Por qué es importante la composición del hogar?</h4>
      <p>No es lo mismo tener unos ingresos de 2.000€ viviendo solo que mantener una familia de 4 personas con ese mismo ingreso. Por ello, utilizamos una escala de "equivalencia" que ajusta los ingresos de la siguiente forma:</p>
      <ul>
        <li>Primer adulto: cuenta como 1</li>
        <li>Adultos adicionales: cuentan como 0.5 cada uno</li>
        <li>Menores de 14 años: cuentan como 0.3 cada uno</li>
      </ul>
      <p>Quizás te preguntes: ¿por qué no simplemente dividimos por el número de personas?</p>
      <p>Los hogares tienen lo que llamamos "economías de escala": dos personas viviendo juntas no necesitan el doble de recursos que una sola persona. Por ejemplo:</p>
      <ul>
        <li>No necesitan doble vivienda</li>
        <li>Comparten gastos de luz, agua, internet...</li>
        <li>Pueden hacer compras más eficientes</li>
      </ul>
      <p>Por eso usamos esta escala que tiene en cuenta estos ahorros compartidos.</p>

      <div className="help-alert mt-4">
        <p><strong>Ejemplo:</strong></p>
        <p>Imaginemos dos hogares con ingresos de 2.000€ mensuales:</p>
        <ul>
          <li>
            <strong>Hogar A:</strong> Una persona viviendo sola<br />
            Escala: 1<br />
            Ingresos equivalentes: 2.000€ ÷ 1 = <strong>2.000€</strong>
          </li>
          <li>
            <strong>Hogar B:</strong> Pareja con dos niños menores de 14 años<br />
            Escala: 1 + 0.5 + (2 × 0.3) = 2.1<br />
            Ingresos equivalentes: 2.000€ ÷ 2.1 = <strong>952€</strong>
          </li>
        </ul>
      </div>
    </div>
  )
}
