import { useCallback, useEffect, useMemo, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { Can } from '../access/AbilityContext'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { CanButton } from '../components/CanButton'

const EMPTY_FORM = { codigo: '', nombre: '' }

function esc(s) {
  if (s == null || s === '') return '—'
  return String(s)
}

export function CantosCatalogPanel() {
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
      const body = await systemApi.listCantos({ page, size: pageSize, q: q.trim() || undefined })
      setListBody(body)
    } catch (e) {
      setListBody(null)
      setErr(e instanceof Error ? e.message : 'Error al cargar cantos')
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
      await systemApi.createCanto({
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
      })
      setForm(EMPTY_FORM)
      setFormMsg('Canto registrado.')
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
        <h2 className="card__title">Catálogo de cantos</h2>
        <p className="muted small" style={{ marginTop: '0.35rem' }}>
          Alta manual para cantos L1, L2, A1 y A2 en la planilla del portal cliente.
        </p>
      </div>

      <Can I={ACTION.CREATE} a={FEATURE.INVENTORY_CANTOS}>
        <div className="card pad" style={{ marginBottom: '1rem' }}>
          <h3 className="card__title" style={{ fontSize: '1rem' }}>
            Nuevo canto
          </h3>
          <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
            <label className="field" style={{ flex: '1 1 120px', margin: 0 }}>
              <span>Código</span>
              <input
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="CANT-DEL"
                required
              />
            </label>
            <label className="field" style={{ flex: '2 1 200px', margin: 0 }}>
              <span>Nombre</span>
              <input
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Canto delgado roble"
                required
              />
            </label>
            <CanButton I={ACTION.CREATE} a={FEATURE.INVENTORY_CANTOS} type="submit" className="btn btn--primary" disabled={saving}>
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
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td className="small">{esc(r.codigo)}</td>
                  <td className="small">{esc(r.nombre)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && !loading ? <p className="muted pad">Sin cantos.</p> : null}
        </div>
        <div className="pad" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--ghost" disabled={page <= 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Anterior
          </button>
          <span className="muted small">
            Página {meta.number + 1} de {Math.max(1, meta.totalPages)} · {meta.totalElements} cantos
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
