export default function MetodologiaTab() {
  return (
    <div className="help-content">
      <h4>¿Cómo calculamos tu posición en la distribución de ingresos?</h4>
      <p>Para poder decirte dónde te sitúas en la distribución de ingresos de España, necesitamos reconstruir dicha distribución a partir de los datos disponibles. Te explicamos cómo lo hacemos:</p>

      <h5 className="mt-4 mb-2">Los datos que tenemos</h5>
      <p>Los datos del INE nos proporcionan información agregada por secciones censales (áreas pequeñas que suelen comprender entre 1.000 y 2.500 habitantes). Para cada sección censal, conocemos:</p>
      <ul>
        <li>La renta media</li>
        <li>El índice de desigualdad (coeficiente de Gini)</li>
        <li>El número de habitantes</li>
      </ul>

      <h5 className="mt-4 mb-2">Cómo lo calculamos</h5>
      <p>Para reconstruir la distribución completa de ingresos en España:</p>
      <ol>
        <li>Primero, para cada barrio:
          <ul>
            <li>Asumimos que los ingresos siguen un patrón "log-normal", que es típico en áreas pequeñas donde los vecinos comparten características socioeconómicas similares</li>
            <li>Conociendo la renta media y el índice de desigualdad, la distribución de ingresos log-normal para cada barrio queda completamente determinada</li>
          </ul>
        </li>
        <li>Después, combinamos las distribuciones de todos los barrios:
          <ul>
            <li>Calculamos una distribución para todo el país, así como para cada provincia y municipio</li>
            <li>Cada barrio "pesa" según su población (es decir, barrios con más habitantes influyen más en la distribución final)</li>
          </ul>
        </li>
      </ol>

      <div className="help-alert mt-4">
        <p><strong>¿Por qué este método es fiable?</strong></p>
        <p>Este método está respaldado por la investigación académica sobre distribución de ingresos, y proporciona una buena aproximación de cómo se determinan los ingresos en zonas geográficas pequeñas.</p>

        <p>En un mismo barrio, es razonable pensar que los ingresos tienden a seguir una distribución log-normal por dos motivos:</p>
        <ul>
          <li>Los vecinos comparten características similares:
            <ul>
              <li>Nivel educativo parecido</li>
              <li>Acceso a tipos de empleos similares</li>
              <li>Costes de vida parecidos</li>
            </ul>
          </li>
          <li>Por otro lado, sabemos que los ingresos de una persona son el resultado de multiplicar varios factores individuales (experiencia, sector laboral, rendimiento individual, etc.)</li>
        </ul>

        <p>Cuando las personas parten de condiciones socioeconómicas parecidas, estas diferencias multiplicativas tienden a generar naturalmente una distribución log-normal, que es exactamente lo que asumimos en nuestro método. De este modo, respetamos la desigualdad observada dentro de cada sección censal y podemos generar distribuciones realistas mediante un cálculo analítico sencillo.</p>

        <p><strong>Validación</strong></p>
        <p>En la mayoría de las secciones censales, disponemos también de la mediana observada de la distribución de ingresos equivalentes y del ratio entre el percentil 80 y el percentil 20. Para validar nuestro método, hemos comparado estos valores reales con los valores esperados de la distribución log-normal en cada sección censal. Los resultados muestran que los valores obtenidos con nuestro método se ajustan muy bien a los valores reales.</p>

        <p><strong>Limitaciones</strong></p>
        <p>El método que usamos tiende a suavizar los extremos de la distribución, y es probable que subestime los ingresos más altos (lo que llevaría a una estimación conservadora de la desigualdad). Al combinar las distribuciones de miles de barrios, logramos una aproximación razonable a la hora de calcular las posiciones, pero debes interpretarlas como estimaciones.</p>

        <p><strong>Código abierto</strong></p>
        <p>
          Todo el código utilizado para calcular la distribución de ingresos y una nota metodológica completa están disponibles en un repositorio público de GitHub. Si quieres saber más, échale un vistazo{' '}
          <a href="https://github.com/pablogguz/compara_tu_ingreso_validation" target="_blank" rel="noopener noreferrer">
            aquí.
          </a>
        </p>
      </div>

      <div className="help-note mt-4">
        <p><strong>Notas: </strong></p>
        <ul>
          <li>Para secciones censales donde el INE no proporciona el índice de Gini (aproximadamente un 5% de los casos), se estima mediante técnicas de aprendizaje automático usando variables sociodemográficas como predictores.</li>
          <li>Los municipios con menos de 3.000 habitantes generalmente tienen sólo una sección censal. Estos municipios con sección censal única representan un 6% de la población a nivel nacional. En estos casos, la distribución municipal coincide con la distribución de la sección censal.</li>
          <li>Los datos de renta del Atlas corresponden a 2023. Para actualizarlos a 2024, escalamos la renta de cada sección censal por el crecimiento de la renta media por unidad de consumo de su comunidad autónoma según la ECV del INE, reescalado de forma que el crecimiento medio nacional coincida exactamente con el de la ECV. Como este ajuste multiplica todos los ingresos de un área por un mismo factor, la desigualdad interna (el Gini) no varía: solo se actualiza el nivel.</li>
        </ul>
      </div>
    </div>
  )
}
