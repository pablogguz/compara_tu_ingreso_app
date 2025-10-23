'use client'

import { useState, useEffect } from 'react'
import Select, { components } from 'react-select'
import { FixedSizeList as List } from 'react-window'
import { UserInput, CalculatedResults } from '@/types'
import {
  calculateEquivIncome,
  findPercentile,
} from '@/lib/calculations'
import {
  loadNationalPercentiles,
  loadProvincialPercentiles,
  loadMunicipalPercentiles,
  loadMunicipalityLookup,
} from '@/lib/dataLoader'
import { getCookieConsent } from '@/lib/analytics'

interface QuestionFlowProps {
  onCalculate: (input: UserInput, results: CalculatedResults) => void
}

export default function QuestionFlow({ onCalculate }: QuestionFlowProps) {
  const [step, setStep] = useState(1)
  const [municipality, setMunicipality] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>('')
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)
  const [perceivedPercentile, setPerceivedPercentile] = useState(50)
  const [municipalities, setMunicipalities] = useState<Array<{value: string, label: string}>>([])
  const [incomeError, setIncomeError] = useState(false)
  const [incomeWarning, setIncomeWarning] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  // Load municipalities on mount
  useEffect(() => {
    loadMunicipalityLookup()
      .then((data) => {
        const options = data.map((m) => ({
          value: m.mun_code,
          label: `${m.mun_name} (${m.prov_name})`,
        }))
        setMunicipalities(options)
      })
      .catch((error) => {
        console.error('Failed to load municipalities:', error)
        // Fallback: Add sample municipalities so dropdown works during development
        setMunicipalities([
          { value: '28005', label: 'Aranjuez (Madrid)' },
          { value: '08019', label: 'Barcelona (Barcelona)' },
          { value: '28079', label: 'Madrid (Madrid)' },
          { value: '41091', label: 'Sevilla (Sevilla)' },
          { value: '46250', label: 'Valencia (Valencia)' },
          { value: '29067', label: 'Málaga (Málaga)' },
          { value: '48020', label: 'Bilbao (Vizcaya)' },
        ])
      })
  }, [])

  const validateIncome = (value: number | '') => {
    if (value === '' || value <= 0) {
      setIncomeError(true)
      setIncomeWarning(false)
      return false
    }
    if (value > 50000) {
      setIncomeError(true)
      setIncomeWarning(false)
      return false
    }
    if (value > 12000) {
      setIncomeWarning(true)
      setIncomeError(false)
    } else {
      setIncomeWarning(false)
      setIncomeError(false)
    }
    return true
  }

  const handleNext = () => {
    if (step === 1 && !municipality) return
    if (step === 2 && !validateIncome(monthlyIncome)) return
    setStep(step + 1)
  }

  const handlePrev = () => setStep(step - 1)

  const handleCalculate = async () => {
    if (!validateIncome(monthlyIncome) || monthlyIncome === '') return
    if (!municipality) {
      alert('Por favor, selecciona un municipio')
      return
    }
    
    setIsCalculating(true)
    
    try {
      // Municipality is already the code
      const munCode = municipality
      
      // Load municipality data to get province
      const munData = await loadMunicipalityLookup()
      const selectedMun = munData.find((m) => m.mun_code === munCode)
      if (!selectedMun) {
        console.error('Municipality not found:', munCode)
        throw new Error('Municipality not found')
      }

      // Calculate equivalent income
      const equivIncome = calculateEquivIncome(monthlyIncome, adults, children)

      // Load percentile data
      const [nationalPerc, provincialPerc, municipalPerc] = await Promise.all([
        loadNationalPercentiles(),
        loadProvincialPercentiles(selectedMun.prov_code),
        loadMunicipalPercentiles(munCode),
      ])

      // Calculate percentiles
      const results: CalculatedResults = {
        equiv_income: equivIncome,
        national_percentile: findPercentile(equivIncome, nationalPerc),
        provincial_percentile: findPercentile(equivIncome, provincialPerc),
        municipal_percentile: findPercentile(equivIncome, municipalPerc),
        selected_prov: selectedMun.prov_code,
      }

      const input: UserInput = {
        municipality: munCode,
        monthlyIncome,
        adults,
        children,
        perceivedPercentile,
      }

      // Send to Google Sheets if consent given
      if (getCookieConsent() === 'accepted') {
        try {
          const response = await fetch('/api/appendResponse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timestamp: new Date().toISOString(),
              municipality: munCode,
              monthly_income: monthlyIncome,
              adults,
              children,
              perceived_percentile: perceivedPercentile,
              actual_percentile: results.national_percentile,
              equiv_income: equivIncome,
            }),
          })
          
          const data = await response.json()
          
          if (!response.ok) {
            console.error('Failed to save to sheet:', data)
          } else {
            console.log('Successfully saved to sheet:', data)
          }
        } catch (sheetError) {
          console.error('Error saving to sheet:', sheetError)
          // Don't block the user from seeing results if sheet save fails
        }
      } else {
        console.log('Cookie consent not given, skipping sheet save')
      }

      onCalculate(input, results)
    } catch (error) {
      console.error('Calculation error:', error)
      alert('Error calculating results. Please try again.')
    } finally {
      setIsCalculating(false)
    }
  }

  // Virtualized MenuList for react-select with react-window
  const MenuList = (props: any) => {
    const { options, children, maxHeight, getValue } = props
    const [value] = getValue()
    const initialOffset = options.indexOf(value) * 40

    if (!children || !Array.isArray(children)) {
      return <components.MenuList {...props}>{children}</components.MenuList>
    }

    const height = Math.min(maxHeight || 300, children.length * 40, 300)

    return (
      <List
        height={height}
        itemCount={children.length}
        itemSize={40}
        initialScrollOffset={initialOffset}
        width="100%"
      >
        {({ index, style }: { index: number; style: React.CSSProperties }) => (
          <div style={style}>{children[index]}</div>
        )}
      </List>
    )
  }

  return (
    <div id="main-form">
      <div className="container-fluid">
        {/* Progress indicators */}
        <div className="progress-container">
          <div className="progress-bar-wrapper">
            <div
              className="progress-bar-fill"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
          <div className="step-indicators">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`step-indicator ${s <= step ? 'active' : ''}`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Municipality */}
        {step === 1 && (
          <div className="question-step">
            <div className="question-content-wrapper">
              <div className="question-icon">
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <h2 className="question-title">¿Dónde vives?</h2>
              <p className="question-subtitle">Selecciona tu municipio de residencia</p>
              <div className="question-content">
                <div className="input-centered">
                  <Select
                    value={municipalities.find(m => m.value === municipality) || null}
                    onChange={(option) => setMunicipality(option?.value || '')}
                    options={municipalities}
                    placeholder="Escribe tu municipio..."
                    isClearable
                    isSearchable
                    components={{ MenuList }}
                    noOptionsMessage={() => "No se encontraron municipios"}
                    filterOption={(option, inputValue) => {
                      // Custom fast filter - only search in label
                      if (!inputValue) return true
                      return option.label.toLowerCase().includes(inputValue.toLowerCase())
                    }}
                    maxMenuHeight={300}
                    menuPlacement="auto"
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        minHeight: '56px',
                        width: '100%',
                        minWidth: '300px',
                        fontSize: '1.05rem',
                        borderColor: state.isFocused ? '#58a2ec' : '#e0e0e0',
                        borderWidth: '2px',
                        borderRadius: '12px',
                        boxShadow: state.isFocused ? '0 0 0 3px rgba(88, 162, 236, 0.1)' : 'none',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: state.isFocused ? '#58a2ec' : '#c0c0c0'
                        }
                      }),
                      valueContainer: (base) => ({
                        ...base,
                        padding: '2px 16px'
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: '#999',
                        fontSize: '1rem'
                      }),
                      input: (base) => ({
                        ...base,
                        fontSize: '1rem',
                        margin: '0px'
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999,
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        overflow: 'hidden',
                        border: '1px solid #e0e0e0'
                      }),
                      menuList: (base) => ({
                        ...base,
                        padding: '0px',
                        maxHeight: '300px',
                        minHeight: '300px'
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isFocused ? '#58a2ec' : state.isSelected ? '#4591db' : 'white',
                        color: state.isFocused || state.isSelected ? 'white' : '#333',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        padding: '10px 14px',
                        borderRadius: '0px',
                        margin: '0px',
                        transition: 'all 0.15s ease',
                        minHeight: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        '&:active': {
                          backgroundColor: '#4591db'
                        }
                      }),
                      singleValue: (base) => ({
                        ...base,
                        fontSize: '1rem',
                        color: '#333'
                      })
                    }}
                  />
                </div>
              </div>
              <div className="button-wrapper">
                <button
                  onClick={handleNext}
                  className="btn-nav next-btn"
                  disabled={!municipality}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Income */}
        {step === 2 && (
          <div className="question-step">
            <div className="question-content-wrapper">
              <div className="question-icon">
                <i className="fas fa-euro-sign"></i>
              </div>
              <h2 className="question-title">
                ¿Cuáles fueron los ingresos netos{' '}
                <span style={{ color: '#58a2ec' }}>mensuales</span> de tu hogar en
                2023?
              </h2>
              <p className="question-subtitle">
                Introduce los ingresos netos{' '}
                <span style={{ color: '#58a2ec', fontWeight: 600 }}>
                  mensuales
                </span>{' '}
                de tu hogar en 2023
              </p>
              <div className="question-content">
                <div className="input-centered">
                  <input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value)
                      setMonthlyIncome(val)
                      if (val !== '') validateIncome(val)
                    }}
                    className={`form-control ${incomeError ? 'invalid' : ''}`}
                    min={0}
                    max={50000}
                    placeholder="Ejemplo: 2500"
                    style={{
                      minHeight: '56px',
                      width: '100%',
                      minWidth: '300px',
                      fontSize: '1.05rem',
                      borderColor: incomeError ? '#dc3545' : '#e0e0e0',
                      borderWidth: '2px',
                      borderRadius: '12px',
                      padding: '0 16px',
                      transition: 'all 0.2s ease',
                      boxShadow: 'none',
                      backgroundColor: incomeError ? '#fef2f2' : 'white'
                    }}
                    onFocus={(e) => {
                      if (!incomeError) {
                        e.target.style.borderColor = '#58a2ec'
                        e.target.style.boxShadow = '0 0 0 3px rgba(88, 162, 236, 0.1)'
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = incomeError ? '#dc3545' : '#e0e0e0'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>
              {incomeError && (
                <div className="error-message" style={{ color: '#dc3545', marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }}>
                  Por favor, introduce un valor entre 1 y 50.000 €
                </div>
              )}
              {incomeWarning && !incomeError && (
                <div style={{ color: '#f59e0b', marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'center', fontWeight: '500' }}>
                  ⚠️ Recuerda que este valor debe ser mensual, no anual
                </div>
              )}
              <div className="button-wrapper">
                <button onClick={handlePrev} className="btn-nav prev-btn">
                  Anterior
                </button>
                <button
                  onClick={handleNext}
                  className="btn-nav next-btn"
                  disabled={incomeError || monthlyIncome === ''}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Household composition */}
        {step === 3 && (
          <div className="question-step">
            <div className="question-content-wrapper">
              <div className="question-icon">
                <i className="fas fa-users"></i>
              </div>
              <h2 className="question-title">¿Cómo es tu hogar?</h2>
              <p className="question-subtitle">Composición de tu unidad familiar</p>
              <div className="question-content">
                <div className="household-inputs" style={{ display: 'flex', gap: '1.5rem', maxWidth: '380px', margin: '0 auto', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div className="input-group" style={{ flex: '0 0 auto', minWidth: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '600', color: '#333', textAlign: 'center' }}>Mayores de 14 años</label>
                    <Select
                      value={{ value: adults, label: adults.toString() }}
                      onChange={(option) => setAdults(option?.value || 1)}
                      options={Array.from({ length: 20 }, (_, i) => ({
                        value: i + 1,
                        label: (i + 1).toString()
                      }))}
                      isSearchable={false}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: '56px',
                          minWidth: '140px',
                          width: '140px',
                          fontSize: '1.05rem',
                          borderColor: state.isFocused ? '#58a2ec' : '#e0e0e0',
                          borderWidth: '2px',
                          borderRadius: '12px',
                          boxShadow: state.isFocused ? '0 0 0 3px rgba(88, 162, 236, 0.1)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: state.isFocused ? '#58a2ec' : '#c0c0c0'
                          }
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          padding: '2px 16px'
                        }),
                        menu: (base) => ({
                          ...base,
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          overflow: 'hidden'
                        }),
                        menuList: (base) => ({
                          ...base,
                          padding: '4px'
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused ? '#58a2ec' : state.isSelected ? '#4591db' : 'white',
                          color: state.isFocused || state.isSelected ? 'white' : '#333',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          margin: '2px 0',
                          transition: 'all 0.15s ease'
                        }),
                        singleValue: (base) => ({
                          ...base,
                          fontSize: '1.05rem',
                          color: '#333'
                        })
                      }}
                    />
                  </div>
                  <div className="input-group" style={{ flex: '0 0 auto', minWidth: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '600', color: '#333', textAlign: 'center' }}>Menores de 14 años</label>
                    <Select
                      value={{ value: children, label: children.toString() }}
                      onChange={(option) => setChildren(option?.value || 0)}
                      options={Array.from({ length: 21 }, (_, i) => ({
                        value: i,
                        label: i.toString()
                      }))}
                      isSearchable={false}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          minHeight: '56px',
                          width: '140px',
                           minWidth: '140px',
                          fontSize: '1.05rem',
                          borderColor: state.isFocused ? '#58a2ec' : '#e0e0e0',
                          borderWidth: '2px',
                          borderRadius: '12px',
                          boxShadow: state.isFocused ? '0 0 0 3px rgba(88, 162, 236, 0.1)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: state.isFocused ? '#58a2ec' : '#c0c0c0'
                          }
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          padding: '2px 16px'
                        }),
                        menu: (base) => ({
                          ...base,
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          overflow: 'hidden'
                        }),
                        menuList: (base) => ({
                          ...base,
                          padding: '4px'
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused ? '#58a2ec' : state.isSelected ? '#4591db' : 'white',
                          color: state.isFocused || state.isSelected ? 'white' : '#333',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          margin: '2px 0',
                          transition: 'all 0.15s ease'
                        }),
                        singleValue: (base) => ({
                          ...base,
                          fontSize: '1.05rem',
                          color: '#333'
                        })
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="button-wrapper">
                <button onClick={handlePrev} className="btn-nav prev-btn">
                  Anterior
                </button>
                <button onClick={handleNext} className="btn-nav next-btn">
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Perceived percentile */}
        {step === 4 && (
          <div className="question-step">
            <div className="question-content-wrapper">
              <div className="question-icon">
                <i className="fas fa-bullseye"></i>
              </div>
              <h2 className="question-title">¿Dónde crees que te sitúas?</h2>
              <p className="question-subtitle">
                Tu percepción en la distribución de ingresos a nivel nacional
              </p>
              <div className="question-content">
                <div className="input-centered-perception">
                  <div className="slider-labels">
                    <div className="label-left">Más pobre</div>
                    <div className="label-right">Más rico</div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={perceivedPercentile}
                    onChange={(e) =>
                      setPerceivedPercentile(Number(e.target.value))
                    }
                    className="custom-slider"
                    style={{ width: '100%', marginTop: '2rem' }}
                  />
                  <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '1.5rem', fontWeight: '600', color: '#58a2ec' }}>
                    {perceivedPercentile}
                  </div>
                  <p className="help-text">
                    1 representa el 1% de hogares con menos ingresos y 99 el 1% con
                    más ingresos
                  </p>
                </div>
              </div>
              <div className="button-wrapper">
                <button onClick={handlePrev} className="btn-nav prev-btn">
                  Anterior
                </button>
                <button
                  onClick={handleCalculate}
                  className="btn-nav calculate-btn"
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Calculando...' : 'Calcular'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
