import { useEffect, useMemo, useState } from 'react'
import * as employeeApi from '../api/employeeApi'
import { ENDPOINT_CATALOG, FEATURE } from '../access/permissionCatalog'
import { useAppAbility } from '../access/useAppAbility'

function MethodBadge({ method }) {
  return <span className={`method method--${method.toLowerCase()}`}>{method}</span>
}

export function ApiCatalogPage() {
  const ability = useAppAbility()
  const [backendCatalog, setBackendCatalog] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const visibleModules = useMemo(
    () =>
      ENDPOINT_CATALOG.filter(
        (group) => ability.can('view', group.feature) || ability.can('manage', 'all'),
      ),
    [ability],
  )

  useEffect(() => {
    if (!ability.can('view', FEATURE.API_CATALOG) && !ability.can('manage', 'all')) {
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const data = await employeeApi.fetchApiCatalog()
        if (!cancelled) setBackendCatalog(data)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'No se pudo cargar /api')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ability])

  return (
    <div className="page">
      <header className="page__head page__head--wide">
        <h1>Catálogo de endpoints</h1>
        <p className="page__lead">
          Mapa de endpoints encontrados en <code className="code-inline">allcenter-system</code> y
          conectados en el frontend por módulo. CASL limita lo visible según el rol en sesión.
        </p>
      </header>

      <div className="endpoint-grid">
        {visibleModules.map((group) => (
          <section className="card endpoint-card" key={group.module}>
            <div className="endpoint-card__head">
              <h2 className="card__title">
                {group.domain ? `${group.module} · ${group.domain}` : group.module}
              </h2>
              <span className="tag">{group.endpoints.length} endpoints</span>
            </div>
            <ul className="endpoint-list">
              {group.endpoints.map(([method, path]) => (
                <li key={`${method}-${path}`}>
                  <MethodBadge method={method} />
                  <code className="code-inline">{path}</code>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {!visibleModules.length ? (
        <div className="card pad">
          <p className="muted">Tu rol no tiene endpoints visibles en CASL.</p>
        </div>
      ) : null}

      {ability.can('view', FEATURE.API_CATALOG) || ability.can('manage', 'all') ? (
        <section className="card pad" style={{ marginTop: '1rem' }}>
          <h2 className="card__title">Respuesta del backend `/api`</h2>
          {loading ? (
            <p className="muted">Cargando catálogo declarado por module-system…</p>
          ) : err ? (
            <p className="text-warn">{err}</p>
          ) : backendCatalog ? (
            <pre className="card__pre api-catalog-pre">
              {JSON.stringify(backendCatalog, null, 2)}
            </pre>
          ) : (
            <p className="muted">Sin catálogo remoto.</p>
          )}
        </section>
      ) : null}
    </div>
  )
}
