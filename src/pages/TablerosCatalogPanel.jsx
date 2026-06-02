import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { CanButton } from '../components/CanButton'

const EMPTY_FORM = { codigo: '', nombre: '', espesorMm: '', unidad: 'PLN' }

function esc(s) {
  if (s == null || s === '') return '—'
  return String(s)
}

export function TablerosCatalogPanel() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 15
  const [listBody, setListBody] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formMsg, setFormMsg] = useState(null)
  const [formErr, setFormErr] = useState(null)

  const rows = useMemo(() => systemApi.pageContent(listBody), [listBody])
  const meta = useMemo(() => systemApi.pageMeta(listBody), [listBody])

  const loadList = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const body = await systemApi.listTableros({ page, size: pageSize, q: q.trim() || undefined })
      setListBody(body)
    } catch (e) {
      setListBody(null)
      setErr(e instanceof Error ? e.message : 'Error al cargar tableros')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, q])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    setPage(0)
  }, [q])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setFormMsg(null)
    setFormErr(null)
    try {
      await systemApi.createTablero({
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        espesorMm: form.espesorMm.trim() ? Number(form.espesorMm) : undefined,
        unidad: form.unidad.trim() || 'PLN',
      })
      setForm(EMPTY_FORM)
      setFormMsg('Tablero registrado.')
      setPage(0)
      await loadList()
    } catch (ex) {
      setFormErr(ex instanceof Error ? ex.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="card pad" style={{ marginBottom: '1rem' }}>
        <h2 className="card__title">Catálogo de tableros</h2>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Alta manual para la planilla de corte del portal cliente. El kardex de almacén (stock) sigue siendo independiente.
        </p>
      </div>

      <Can I={ACTION.CREATE} a={FEATURE.INVENTORY_TABLEROS}>
        <div className="card pad" style={{ marginBottom: '1rem' }}>
          <h3 className="card__title" style={{ fontSize: '1rem' }}>
            Nuevo tablero
          </h3>
          <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '1 1 120px', margin: 0 }}>
              <span>Código</span>
              <input
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="TAB-MDF18"
                required
              />
            </label>
            <label className="field" style={{ flex: '2 1 200px', margin: 0 }}>
              <span>Nombre</span>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="MDF 18mm blanco"
                required
              />
            </label>
            <label className="field" style={{ flex: '0 1 100px', margin: 0 }}>
              <span>Espesor (mm)</span>
              <input
                value={form.espesorMm}
                onChange={(e) => setForm((f) => ({ ...f, espesorMm: e.target.value }))}
                inputMode="numeric"
                placeholder="18"
              />
            </label>
            <label className="field" style={{ flex: '0 1 80px', margin: 0 }}>
              <span>Unidad</span>
              <input
                value={form.unidad}
                onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                placeholder="PLN"
              />
            </label>
            <CanButton I={ACTION.CREATE} a={FEATURE.INVENTORY_TABLEROS} type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Agregar'}
            </CanButton>
          </form>
          {formMsg ? <p className="small" style={{ color: 'var(--success, #0d7a3e)', marginTop: '0.5rem' }}>{formMsg}</p> : null}
          {formErr ? <p className="small" style={{ color: 'var(--danger, #b00020)', marginTop: '0.5rem' }}>{formErr}</p> : null}
        </div>
      </Can>

      <div className="card">
        <div className="pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 200px', margin: 0 }}>
            <span>Buscar</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código o nombre" />
          </label>
          <button type="button" className="btn btn--ghost" disabled={loading} onClick={() => void loadList()}>
            Buscar
          </button>
        </div>
        {err ? <p className="pad" style={{ color: 'var(--danger, #b00020)' }}>{err}</p> : null}
        {loading ? <p className="muted pad">Cargando…</p> : null}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Código</th>
                <th>Nombre</th>
                <th>Espesor</th>
                <th>Unidad</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td className="small">{esc(r.codigo)}</td>
                  <td className="small">{esc(r.nombre)}</td>
                  <td>{esc(r.espesorMm)}</td>
                  <td>{esc(r.unidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !loading ? <p className="muted pad">Sin tableros.</p> : null}
        </div>
        <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--ghost" disabled={page <= 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Anterior
          </button>
          <span className="muted small">
            Página {meta.number + 1} de {Math.max(1, meta.totalPages)} · {meta.totalElements} tableros
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={loading || page + 1 >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}
