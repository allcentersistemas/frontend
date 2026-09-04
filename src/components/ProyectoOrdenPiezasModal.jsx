import { DetailModal } from './DetailModal.jsx'
import { OrdenBiesseObraAssign } from './OrdenBiesseObraAssign.jsx'
import { formatPiezaCell, PIEZA_TABLE_COLUMNS } from '../utils/proyectoDetalleColumns.js'

export function ProyectoOrdenPiezasModal({
  order,
  onClose,
  canAssignBiesse = false,
  onOrdenBiesseAssigned,
}) {
  const detalles = order?.detalles ?? []

  return (
    <DetailModal
      open={Boolean(order)}
      wide
      title={order ? `Detalle · ${order.codigo || `Orden ${order.id}`}` : 'Detalle de orden'}
      subtitle={order?.descripcion || ''}
      onClose={onClose}
    >
      <div className="proyecto-orden-detalle-layout">
        <div style={{ minWidth: 0 }}>
          {!detalles.length ? (
            <p className="muted">Sin piezas registradas en esta orden.</p>
          ) : (
            <div className="table-wrap" style={{ maxHeight: 'min(70vh, 560px)', overflow: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    {PIEZA_TABLE_COLUMNS.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((detalle, index) => (
                    <tr key={detalle.id ?? index}>
                      <td>{index + 1}</td>
                      {PIEZA_TABLE_COLUMNS.map((col) => (
                        <td key={col.key} className="small">
                          {formatPiezaCell(col.key, detalle)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {order ? (
          <div
            className="card pad proyecto-orden-biesse-panel"
            style={{
              margin: 0,
              background: 'var(--surface-2, #f6f7f9)',
              border: '1px solid var(--border, #e2e5ea)',
            }}
          >
            <h3 className="card__title" style={{ fontSize: '0.95rem', marginBottom: '0.35rem' }}>
              Obra / XML Biesse
            </h3>
            <p className="muted small" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              Escriba para buscar y asignar la obra de esta orden.
            </p>
            {canAssignBiesse || order.biesseOrderId ? (
              <OrdenBiesseObraAssign
                orden={order}
                disabled={!canAssignBiesse}
                onAssigned={(updated) => onOrdenBiesseAssigned?.(order.id, updated)}
              />
            ) : (
              <p className="muted small" style={{ margin: 0 }}>
                No tiene permiso para asignar obras. Pida a un usuario con rol de ventas o producción.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </DetailModal>
  )
}
