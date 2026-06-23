import { DetailModal } from './DetailModal.jsx'
import { formatPiezaCell, PIEZA_TABLE_COLUMNS } from '../utils/proyectoDetalleColumns.js'

export function ProyectoOrdenPiezasModal({ order, onClose }) {
  const detalles = order?.detalles ?? []

  return (
    <DetailModal
      open={Boolean(order)}
      title={order ? `Detalle · ${order.codigo || `Orden ${order.id}`}` : 'Detalle de orden'}
      subtitle={order?.descripcion || ''}
      onClose={onClose}
    >
      {!detalles.length ? (
        <p className="muted">Sin piezas registradas en esta orden.</p>
      ) : (
        <div className="table-wrap" style={{ maxHeight: 'min(70vh, 520px)', overflow: 'auto' }}>
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
    </DetailModal>
  )
}
