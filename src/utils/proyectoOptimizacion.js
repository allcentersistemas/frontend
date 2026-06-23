  export const ESTADOS_PROYECTO = [
  { value: '', label: 'Todos los estados' },
  { value: 'ENVIADO', label: 'Enviando' },
  { value: 'EN_ATENCION', label: 'En atención' },
  { value: 'COTIZADO', label: 'Cotizado' },
]

export function formatEstadoProyecto(value) {
  const map = {
    ENVIADO: 'Enviando',
    EN_ATENCION: 'En atención',
    COTIZADO: 'Cotizado',
  }
  return map[value] || value || '—'
}

export function estadoTagClass(estado) {
  const map = {
    ENVIADO: 'tag tag--estado-enviado',
    EN_ATENCION: 'tag tag--estado-atencion',
    COTIZADO: 'tag tag--estado-cotizado',
  }
  return map[estado] || 'tag'
}

export function formatProyectoDate(value) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return String(value)
  }
}

export function emptyProyectoFilters() {
  return {
    estado: '',
    nombre: '',
    cliente: '',
    vendedor: '',
    fechaDesde: '',
    fechaHasta: '',
  }
}

export function filterProyectosClientSide(rows, filters) {
  const nombreQ = filters.nombre?.trim().toLowerCase()
  const clienteQ = filters.cliente?.trim().toLowerCase()
  const estado = filters.estado?.trim()
  const desde = filters.fechaDesde ? new Date(`${filters.fechaDesde}T00:00:00`) : null
  const hasta = filters.fechaHasta ? new Date(`${filters.fechaHasta}T23:59:59`) : null

  return rows.filter((row) => {
    if (estado && row.estado !== estado) return false
    if (nombreQ && !`${row.nombre || ''}`.toLowerCase().includes(nombreQ)) return false
    if (clienteQ && !`${row.cliente || ''}`.toLowerCase().includes(clienteQ)) return false
    if (desde || hasta) {
      const d = row.fechaCreacion ? new Date(row.fechaCreacion) : null
      if (!d || Number.isNaN(d.getTime())) return false
      if (desde && d < desde) return false
      if (hasta && d > hasta) return false
    }
    return true
  })
}

export function detalleToPayload(detalle) {
  return {
    tablero: detalle.tablero ?? '',
    cantidad: detalle.cantidad ?? '',
    largoVeta: detalle.largoVeta ?? '',
    ancho: detalle.ancho ?? '',
    veta: detalle.veta ?? '',
    l1: detalle.l1 ?? '',
    l2: detalle.l2 ?? '',
    a1: detalle.a1 ?? '',
    a2: detalle.a2 ?? '',
    perforacionCantidad: detalle.perforacionCantidad ?? '',
    perforacionLado1: detalle.perforacionLado1 ?? '',
    perforacionLado2: detalle.perforacionLado2 ?? '',
    ranuraDist: detalle.ranuraDist ?? '',
    ranuraProf: detalle.ranuraProf ?? '',
    ranuraEs: detalle.ranuraEs ?? '',
    ranuraLado: detalle.ranuraLado ?? '',
    ranuraEspecial: Boolean(detalle.ranuraEspecial),
    observado: Boolean(detalle.observado),
    observacion: detalle.observacion ?? '',
  }
}

export function treeToSavePayload(tree, projectDraft) {
  const project = tree?.project
  if (!project?.id) {
    throw new Error('Proyecto no válido para guardar.')
  }
  return {
    projectId: project.id,
    project: {
      nombre: projectDraft.nombre ?? project.nombre ?? '',
      descripcion: projectDraft.descripcion ?? project.descripcion ?? '',
      cliente: projectDraft.cliente ?? project.cliente ?? '',
      referencia: projectDraft.referencia ?? project.referencia ?? '',
    },
    orders: (tree.orders ?? []).map((order) => ({
      codigo: order.codigo ?? '',
      descripcion: order.descripcion ?? '',
      detalles: (order.detalles ?? []).map(detalleToPayload),
    })),
  }
}

export function downloadProyectoJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
