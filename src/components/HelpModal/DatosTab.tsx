export default function DatosTab() {
  return (
    <div className="help-content">
      <h4>¿De dónde vienen los datos?</h4>
      <p>
        El Atlas de Distribución de Renta de los Hogares (ADRH) es una estadística oficial del Instituto Nacional de Estadística (INE) que proporciona información sobre el nivel y la distribución de la renta de la población a un nivel territorial muy detallado. Los datos se publican anualmente, siendo los últimos disponibles los correspondientes al año 2023.
        Puedes consultar todos los detalles en la{' '}
        <a href="https://www.ine.es/dyngs/INEbase/es/operacion.htm?c=Estadistica_C&cid=1254736177088&menu=ultiDatos&idp=1254735976608" target="_blank" rel="noopener noreferrer">
          página oficial del INE.
        </a>
      </p>

      <h5 className="mt-4 mb-2">Fuentes de datos</h5>
      <ul>
        <li>Registros administrativos de declaraciones tributarias (IRPF) de la Agencia Tributaria y las Haciendas Forales</li>
        <li>Fichero Precensal de Población (FPC), elaborado a partir del padrón y otros registros administrativos</li>
        <li>Información de todas las personas residentes en viviendas familiares a 1 de enero del año siguiente al periodo de referencia de los datos de renta</li>
      </ul>

      <h5 className="mt-4 mb-2">¿Qué rentas se incluyen?</h5>
      <p>Se consideran todas las rentas percibidas por los residentes, incluyendo:</p>
      <ul>
        <li>Rentas del trabajo (salarios, pensiones, prestaciones por desempleo)</li>
        <li>Rentas del capital mobiliario (intereses, dividendos)</li>
        <li>Rentas por arrendamiento de inmuebles</li>
        <li>Rendimientos de actividades económicas</li>
        <li>Prestaciones y ayudas públicas</li>
        <li>Otras rentas</li>
      </ul>

      <div className="help-alert mt-4">
        <p className="mb-2"><strong>Otros datos:</strong></p>
        <ul>
          <li>Los datos son anónimos y se presentan agregados por zonas geográficas</li>
          <li>Se excluye la población que reside en establecimientos colectivos (e.g. residencias de mayores, cuarteles, prisiones, etc.)</li>
          <li>Los datos se basan en registros administrativos oficiales, no en encuestas</li>
          <li>La cobertura es muy alta: más del 98.6% de la población reside en hogares con algún tipo de renta en el territorio fiscal común (datos de 2016)</li>
        </ul>
      </div>

      <div className="help-alert mt-4">
        <p className="mb-2"><strong>El Censo</strong></p>
        <p>Para calcular algunas de las estadísticas a nivel municipal disponibles en el panel de resultados, utilizamos datos del Censo Anual de Población del INE. Estos datos son independientes de los datos de renta y se utilizan para calcular indicadores como el porcentaje de población extranjera o los niveles de educación.</p>
        <p>
          Puedes consultar más información sobre el Censo{' '}
          <a href="https://www.ine.es/dyngs/INEbase/operacion.htm?c=Estadistica_C&cid=1254736176992&menu=resultados&idp=1254735572981#_tabs-1254736195811" target="_blank" rel="noopener noreferrer">
            aquí.
          </a>
        </p>
      </div>

      <div className="help-note mt-4">
        <p>
          <strong>Nota: </strong>
          No todos los indicadores que se muestran en las tarjetas de colores en el panel de resultados están disponibles para todos los municipios. En los casos en los que no haya datos disponibles, se mostrará la media provincial.
        </p>
      </div>
    </div>
  )
}
