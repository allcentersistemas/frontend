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

/** Orden del optimizador para TXT/CSV (sin fila de encabezados). */
const FLAT_EXPORT_COLUMNS = [
  { key: 'pCodeMat' },
  { key: 'pParams' },
  { key: 'pLength' },
  { key: 'pWidth' },
  { key: 'pMinq' },
  { key: 'pGrain' },
  { key: 'pEdgeMaSup' },
  { key: 'pEdgeMaInf' },
  { key: 'pEdgeMaIzq' },
  { key: 'pEdgeMaDer' },
  { key: 'pIdesc' },
]

function formatMeasureForOptimizer(value) {
  if (value === '' || value == null) return ''
  const n = parseInt(String(value).replace(/\D/g, ''), 10)
  if (!Number.isFinite(n)) return ''
  return String(n * 100)
}

function formatInt(value) {
  if (value === '' || value == null) return ''
  const n = parseInt(String(value).replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? String(n) : ''
}

/** Material y cantos con espacio final requerido por el optimizador. */
function withTrailingSpace(value) {
  const s = String(value ?? '').trim()
  if (!s) return ''
  return `${s} `
}

function blankOrString(value) {
  if (value == null) return ''
  const s = String(value).trim()
  return s
}

function mapDetalleRow(detalle, { pParams }) {
  const veta = detalle.veta
  const vetaLongitud =
    veta === '1-Longitud' || String(veta || '').startsWith('1-') || veta === '1'
  return {
    pCodeMat: withTrailingSpace(detalle.tablero),
    pParams: pParams || '',
    pMinq: formatInt(detalle.cantidad),
    pLength: formatMeasureForOptimizer(detalle.largoVeta),
    pWidth: formatMeasureForOptimizer(detalle.ancho),
    pGrain: vetaToPayload(vetaLongitud).toLowerCase(),
    pEdgeMaSup: withTrailingSpace(detalle.l1),
    pEdgeMaInf: withTrailingSpace(detalle.l2),
    pEdgeMaIzq: withTrailingSpace(detalle.a1),
    pEdgeMaDer: withTrailingSpace(detalle.a2),
    pIdesc: blankOrString(detalle.observacion),
    pIidesc: '',
  }
}

function orderExportContext(tree) {
  const project = tree?.project
  return {
    maquinaParametros: project?.maquinaParametros || '',
    projectName: project?.nombre || '',
  }
}

export function orderExcelFilename(order, projectName = 'proyecto', ext = 'xlsx') {
  const projectSlug = String(projectName || 'proyecto').replace(/[^\w.-]+/g, '_')
  const orderSlug = String(order.codigo || `orden-${order.id}`).replace(/[^\w.-]+/g, '_')
  const base = `${projectSlug}_${orderSlug}`
  return ext ? `${base}.${ext.replace(/^\./, '')}` : base
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

function csvEscape(value) {
  const t = String(value ?? '')
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

function buildFlatRows(order, tree) {
  const { maquinaParametros } = orderExportContext(tree)
  return (order.detalles || []).map((detalle) => {
    const cells = mapDetalleRow(detalle, { pParams: maquinaParametros })
    return FLAT_EXPORT_COLUMNS.map((col) => cells[col.key] ?? '')
  })
}

/** Descarga Excel de una sola orden. */
export function downloadOrderExcelFromTree(order, tree, filename) {
  const { maquinaParametros, projectName } = orderExportContext(tree)
  const name = filename || orderExcelFilename(order, projectName, 'xlsx')

  const technicalRow = EXCEL_EXPORT_COLUMNS.map((c) => c.technical)
  const labelRow = EXCEL_EXPORT_COLUMNS.map((c) => c.label)
  const dataRows = (order.detalles || []).map((detalle) => {
    const cells = mapDetalleRow(detalle, { pParams: maquinaParametros })
    return EXCEL_EXPORT_COLUMNS.map((col) => cells[col.key] ?? '')
  })

  const ws = XLSX.utils.aoa_to_sheet([technicalRow, labelRow, ...dataRows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Planilla')
  XLSX.writeFile(wb, name.endsWith('.xlsx') ? name : `${name}.xlsx`)
}

/** TXT tabulado para optimizador: solo filas de datos + línea final `eof`. */
export function downloadOrderTextFromTree(order, tree, filename) {
  const { projectName } = orderExportContext(tree)
  const name = filename || orderExcelFilename(order, projectName, 'txt')
  const rows = buildFlatRows(order, tree)
  const body = [...rows.map((row) => row.join('\t')), 'eof'].join('\n')
  downloadTextFile(name.endsWith('.txt') ? name : `${name}.txt`, `${body}\n`, 'text/plain;charset=utf-8')
}

/** CSV con el mismo contenido que TXT (sin fila `eof`). */
export function downloadOrderCsvFromTree(order, tree, filename) {
  const { projectName } = orderExportContext(tree)
  const name = filename || orderExcelFilename(order, projectName, 'csv')
  const rows = buildFlatRows(order, tree)
  const body = `\ufeff${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`
  downloadTextFile(name.endsWith('.csv') ? name : `${name}.csv`, body, 'text/csv;charset=utf-8')
}
