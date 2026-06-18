import * as XLSX from 'xlsx'

const VETA_NO = '0-No'
const VETA_LONGITUD = '1-Longitud'

function vetaToPayload(checked) {
  return checked ? VETA_LONGITUD : VETA_NO
}

const EXCEL_EXPORT_COLUMNS = [
  { key: 'pCodeMat', technical: '[P_CODE_MAT]', label: 'Material' },
  { key: 'pParams', technical: '[P_PARAMS]', label: 'Parámetros' },
  { key: 'pMinq', technical: '[P_MINQ]', label: 'Cant. Mín.' },
  { key: 'pLength', technical: '[P_LENGTH]', label: 'Longitud' },
  { key: 'pWidth', technical: '[P_WIDTH]', label: 'Ancho' },
  { key: 'pGrain', technical: '[P_GRAIN]', label: 'Veta' },
  { key: 'pEdgeMaSup', technical: '[P_EDGE_MAT_UP]', label: 'Mat. Bord. Sup.' },
  { key: 'pEdgeMaInf', technical: '[P_EDGE_MAT_LO]', label: 'Mat. Bord. Inf.' },
  { key: 'pEdgeMaIzq', technical: '[P_EDGE_MAT_SX]', label: 'Mat. Bord. Izq.' },
  { key: 'pEdgeMaDer', technical: '[P_EDGE_MAT_DX]', label: 'Mat. Bord. Dch.' },
  { key: 'pIdesc', technical: '[P_IDESC]', label: 'I Descripción' },
  { key: 'pIidesc', technical: '[P_IIDESC]', label: 'II Descripción' },
]

function formatDecimal(value) {
  if (value === '' || value == null) return ''
  const n = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(n)) return String(value)
  return n.toFixed(1).replace('.', ',')
}

function formatInt(value) {
  if (value === '' || value == null) return ''
  const n = parseInt(String(value).replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : ''
}

function mapDetalleRow(detalle, { pParams, pIdesc }) {
  const veta = detalle.veta
  const vetaLongitud =
    veta === '1-Longitud' || String(veta || '').startsWith('1-') || veta === '1'
  return {
    pCodeMat: detalle.tablero || '',
    pParams: pParams || '',
    pMinq: formatInt(detalle.cantidad),
    pLength: formatDecimal(detalle.largoVeta),
    pWidth: formatDecimal(detalle.ancho),
    pGrain: vetaToPayload(vetaLongitud),
    pEdgeMaSup: detalle.l1 || '',
    pEdgeMaInf: detalle.l2 || '',
    pEdgeMaIzq: detalle.a1 || '',
    pEdgeMaDer: detalle.a2 || '',
    pIdesc: pIdesc || detalle.observacion || '',
    pIidesc: '',
  }
}

export function orderExcelFilename(order, projectName = 'proyecto') {
  const projectSlug = String(projectName || 'proyecto').replace(/[^\w.-]+/g, '_')
  const orderSlug = String(order.codigo || `orden-${order.id}`).replace(/[^\w.-]+/g, '_')
  return `${projectSlug}_${orderSlug}.xlsx`
}

/** Descarga Excel de una sola orden. */
export function downloadOrderExcelFromTree(order, tree, filename) {
  const project = tree?.project
  const maquinaParametros = project?.maquinaParametros || ''
  const projectName = project?.nombre || ''
  const pIdesc = order.descripcion || projectName || ''
  const name = filename || orderExcelFilename(order, projectName)

  const technicalRow = EXCEL_EXPORT_COLUMNS.map((c) => c.technical)
  const labelRow = EXCEL_EXPORT_COLUMNS.map((c) => c.label)
  const dataRows = (order.detalles || []).map((detalle) => {
    const cells = mapDetalleRow(detalle, { pParams: maquinaParametros, pIdesc })
    return EXCEL_EXPORT_COLUMNS.map((col) => cells[col.key] ?? '')
  })

  const ws = XLSX.utils.aoa_to_sheet([technicalRow, labelRow, ...dataRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Planilla')
  XLSX.writeFile(wb, name.endsWith('.xlsx') ? name : `${name}.xlsx`)
}
