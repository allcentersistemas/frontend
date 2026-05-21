import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as systemApi from '../api/systemApi'
import { FEATURE } from '../access/permissionCatalog'
import { ACTION } from '../access/rolePermissions'
import { CanButton } from '../components/CanButton'

const PALE_ESTADOS = ['ABIERTO', 'CERRADO', 'EN_TRANSITO', 'ENTREGADO', 'CANCELADO']

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

function emptyForm() {
  return {
    code: '',
    estado: 'ABIERTO',
    branchId: '',
    originLocationId: '',
    destinationBranchId: '',
    destinationLocationId: '',
    notes: '',
  }
}

function formFromHeader(header) {
  return {
    code: header?.codigo ?? '',
    estado: header?.estado ?? 'ABIERTO',
    branchId: header?.sucursalOrigenId != null ? String(header.sucursalOrigenId) : '',
    originLocationId: header?.ubicacionOrigenId != null ? String(header.ubicacionOrigenId) : '',
    destinationBranchId: header?.sucursalDestinoId != null ? String(header.sucursalDestinoId) : '',
    destinationLocationId: header?.ubicacionDestinoId != null ? String(header.ubicacionDestinoId) : '',
    notes: header?.notas ?? '',
  }
}

function toIdOrNull(value) {
  if (value == null || String(value).trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function PaleEditPage() {
  const { paleId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(() => emptyForm())
  const [catalogs, setCatalogs] = useState({ branches: [], locations: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const [data, catalogData] = await Promise.all([
          systemApi.getPalletById(paleId),
          systemApi.getPalletCatalogs().catch(() => ({ branches: [], locations: [] })),
        ])
        if (!cancelled) {
          setDetail(data)
          setForm(formFromHeader(data?.pallet))
          setCatalogs({
            branches: Array.isArray(catalogData?.branches) ? catalogData.branches : [],
            locations: Array.isArray(catalogData?.locations) ? catalogData.locations : [],
          })
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'No se pudo cargar el pale')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [paleId])

  async function savePale(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const data = await systemApi.updatePallet(paleId, {
        code: form.code.trim(),
        estado: form.estado,
        branchId: toIdOrNull(form.branchId),
        originLocationId: toIdOrNull(form.originLocationId),
        notes: form.notes,
      })
      setDetail(data)
      setForm(formFromHeader(data?.pallet))
      setMsg('Pale actualizado.')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  async function deleteDetail(detailId) {
    if (!window.confirm('¿Eliminar esta línea del pale?')) return
    setDeletingId(detailId)
    setErr(null)
    try {
      const data = await systemApi.deletePalletDetail(paleId, detailId)
      setDetail(data)
      setMsg('Detalle eliminado.')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo eliminar el detalle')
    } finally {
      setDeletingId(null)
    }
  }

  const header = detail?.pallet
  const branches = catalogs.branches
  const locations = catalogs.locations
  const rows = Array.isArray(detail?.details)
    ? detail.details
    : Array.isArray(detail?.detalles)
      ? detail.detalles
      : []

  return (
    <div className="page">
      <header className="page__head">
        <h1>Editar pale</h1>
        <p className="page__lead">
          Edita información del pale y administra sus líneas. Todo cambio queda disponible para trazabilidad desde Gestión.
        </p>
      </header>

      <div className="form-actions" style={{ marginBottom: '1rem' }}>
        <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>
          Volver
        </button>

      </div>

      {loading ? <p className="muted">Cargando pale...</p> : null}
      {err ? <p className="text-warn" role="alert">{err}</p> : null}
      {msg ? <p className="muted" role="status">{msg}</p> : null}

      {header ? (
        <div className="split">
          <form className="card pad form-section" onSubmit={(e) => void savePale(e)}>
            <h2 className="card__title">Información editable</h2>
            <label className="field">
              <span>Código</span>
              <input
                value={form.code}
                onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Estado</span>
              <select value={form.estado} onChange={(e) => setForm((s) => ({ ...s, estado: e.target.value }))}>
                {PALE_ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Sucursal origen</span>
              <select
                value={form.branchId}
                onChange={(e) => setForm((s) => ({ ...s, branchId: e.target.value }))}
                required
              >
                <option value="">— Elegir origen —</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Ubicación origen</span>
              <select
                value={form.originLocationId}
                onChange={(e) => setForm((s) => ({ ...s, originLocationId: e.target.value }))}
              >
                <option value="">Sin ubicación origen</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.nombre}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small">
              El destino de envío se define en la <strong>guía de despacho</strong> (Inventario → Guías), no en el
              palé.
            </p>
            <dl className="kv">
              <div>
                <dt>Creación</dt>
                <dd className="small">{formatDateTime(header.fechaCreacion)}</dd>
              </div>
            </dl>
            <label className="field" style={{ marginTop: '1rem' }}>
              <span>Notas</span>
              <textarea rows={5} value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
            </label>
            <div className="form-actions">
              <CanButton
                I={ACTION.UPDATE}
                a={FEATURE.PALES_OPERACIONES}
                type="submit"
                className="btn btn--primary"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Guardar pale'}
              </CanButton>
            </div>
          </form>

          <section className="card card--table">
            <h2 className="card__title pad">Detalle ({rows.length})</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Parte</th>
                    <th>Orden</th>
                    <th>Pieza</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const detailId = row.paleEnvioDetalleId ?? row.paleenviodetalleid ?? row.id
                    return (
                      <tr key={detailId ?? `${row.piezaId}-${row.partId}`}>
                        <td>{row.partCode ?? row.partId}</td>
                        <td className="small">{row.orderName ?? row.orderId}</td>
                        <td>{row.numeroPieza ?? '-'}</td>
                        <td className="small">{formatDateTime(row.fechaAgregado)}</td>
                        <td>
                          <CanButton
                            I={ACTION.DELETE}
                            a={FEATURE.PALES_OPERACIONES}
                            fallback={
                              <button type="button" className="btn btn--ghost" disabled title="Sin permiso para borrar">
                                Borrar
                              </button>
                            }
                            className="btn btn--ghost"
                            disabled={deletingId === detailId}
                            onClick={() => void deleteDetail(detailId)}
                          >
                            {deletingId === detailId ? 'Eliminando...' : 'Borrar'}
                          </CanButton>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!rows.length ? <p className="muted pad">Sin líneas en este pale.</p> : null}
            </div>
          </section>


        </div>
      ) : null}
    </div>
  )
}
