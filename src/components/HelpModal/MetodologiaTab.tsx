import { ADRH_YEAR, INCOME_YEAR } from '@/lib/years'

export default function MetodologiaTab() {
  return (
    <div className="help-content">
      <h4>¿Cómo calculamos tu posición en la distribución de ingresos?</h4>
      <p>Para poder decirte dónde te sitúas en la distribución de ingresos de España, necesitamos reconstruir dicha distribución a partir de los datos disponibles. Te explicamos cómo lo hacemos:</p>

      <h5 className="mt-4 mb-2">Los datos que tenemos</h5>
      <p>Los datos del INE nos proporcionan información agregada por secciones censales (áreas pequeñas que suelen comprender entre 1.000 y 2.500 habitantes). Para cada sección censal, conocemos:</p>
      <ul>
        <li>La renta mediana y la renta media por unidad de consumo</li>
        <li>El índice de desigualdad (coeficiente de Gini) y el cociente entre los percentiles 80 y 20</li>
        <li>El porcentaje de población por debajo o por encima de nueve umbrales de renta</li>
        <li>El número de habitantes</li>
      </ul>

      <h5 className="mt-4 mb-2">Cómo lo calculamos</h5>
      <p>Para reconstruir la distribución completa de ingresos en España:</p>
      <ol>
        <li>Primero, para cada barrio:
          <ul>
            <li>Describimos cómo se reparten los ingresos con una curva flexible de cuatro parámetros, la distribución GB2, muy utilizada para estudiar la renta</li>
            <li>Ajustamos esos cuatro parámetros para que la curva reproduzca lo mejor posible los trece indicadores que publica el INE para ese barrio</li>
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

        <p>Cuando las personas parten de condiciones socioeconómicas parecidas, estas diferencias multiplicativas tienden a generar una distribución parecida a la log-normal. La distribución GB2 incluye la log-normal como caso particular, pero además permite colas más realistas: más personas con rentas muy bajas y una cola de rentas altas que decae como en los datos. De este modo, respetamos la desigualdad observada dentro de cada sección censal.</p>

        <p><strong>Validación</strong></p>
        <p>El INE también publica esos indicadores para cada municipio, cada provincia y el conjunto de España. Como nuestras distribuciones de esos territorios salen de combinar las de sus barrios, compararlas con lo publicado es una prueba independiente. La mediana de España que obtenemos cae dentro del intervalo que publica el INE, la renta media difiere en menos de un 0,1 % y el índice de Gini en menos de 0,1 puntos.</p>

        <p><strong>Limitaciones</strong></p>
        <p>La parte que peor conocemos es la más baja: por debajo de unos 5.000 € al año por unidad de consumo, nuestra estimación deja algo menos población de la que publica el INE (un 3,9 % frente a un 4,3 % en España). Aunque el ajuste es muy bueno, debes interpretar las posiciones como estimaciones.</p>

        <p><strong>Código abierto</strong></p>
        <p>
          Todo el código de esta web y del cálculo de la distribución de ingresos está disponible en un{' '}
          <a href="https://github.com/pablogguz/compara_tu_ingreso_app" target="_blank" rel="noopener noreferrer">
            repositorio público de GitHub
          </a>
          , junto con la{' '}
          <a href="https://github.com/pablogguz/compara_tu_ingreso_app/blob/main/methodology/tex/note.pdf" target="_blank" rel="noopener noreferrer">
            nota metodológica completa
          </a>
          .
        </p>
      </div>

      <div className="help-note mt-4">
        <p><strong>Notas: </strong></p>
        <ul>
          <li>Para las secciones censales en las que el INE no publica indicadores de renta (un 5,5 % de las secciones, casi todas con menos de 100 habitantes y apenas un 0,3 % de la población), usamos una distribución log-normal con un índice de Gini estimado con un modelo de aprendizaje automático que usa como predictores variables sociodemográficas de la sección y su provincia.</li>
          <li>Los municipios con menos de 3.000 habitantes generalmente tienen sólo una sección censal. Estos municipios con sección censal única representan un 6% de la población a nivel nacional. En estos casos, la distribución municipal coincide con la distribución de la sección censal.</li>
          <li>Los datos de renta del Atlas corresponden a {ADRH_YEAR}. Para actualizarlos a {INCOME_YEAR}, comparamos año a año el crecimiento de la renta media por unidad de consumo en España según el Atlas y el de la renta neta de los hogares por persona que publica la Agencia Tributaria en su Informe Anual de Recaudación Tributaria, que sale de los mismos datos fiscales pero está disponible unos seis meses después de cada año. Esa comparación nos dice cuánto se desvía el crecimiento de la Agencia Tributaria del que acaba recogiendo el Atlas. Aplicamos esa corrección al crecimiento de cada año posterior y escalamos la renta de todas las secciones censales por el resultado. Aplicado en años anteriores, este método se desvió del Atlas publicado en torno a medio punto porcentual. Como este ajuste multiplica todos los ingresos por un mismo factor, la desigualdad interna no varía: solo se actualiza el nivel. Por eso te pedimos tus ingresos de {INCOME_YEAR}.</li>
        </ul>
      </div>
    </div>
  )
}
