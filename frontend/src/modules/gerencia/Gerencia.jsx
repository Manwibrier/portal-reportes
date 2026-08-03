import { useEffect, useMemo, useState } from 'react'
import ModulePage from '../../components/ModulePage'
import GerenciaExecutiveBoard from './components/GerenciaExecutiveBoard'
import {
  createEmptyDashboard,
  normalizeGerenciaDashboard,
} from './constants'
import { getGerenciaDashboard } from './services'

const DEFAULT_DASHBOARD = createEmptyDashboard()

function Gerencia() {
  const [data, setData] = useState(DEFAULT_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const result = await getGerenciaDashboard({
          force: true,
          cache: false,
        })

        if (!isMounted) return
        setData(normalizeGerenciaDashboard(result))
      } catch (requestError) {
        console.error('Error cargando dashboard de gerencia:', requestError)

        if (!isMounted) return
        setData(createEmptyDashboard())
        setError(
          requestError?.message || 'No se pudo cargar el dashboard de gerencia.',
        )
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const dashboard = useMemo(() => normalizeGerenciaDashboard(data), [data])

  return (
    <ModulePage
      title="Gerencia"
      description="Tablero ejecutivo de indicadores de gestión."
    >
      {loading ? (
        <div className="portal-feedback portal-feedback--loading">
          Cargando tablero de gerencia...
        </div>
      ) : error ? (
        <div className="portal-feedback portal-feedback--error">
          {error}
        </div>
      ) : (
        <GerenciaExecutiveBoard dashboard={dashboard} />
      )}
    </ModulePage>
  )
}

export default Gerencia