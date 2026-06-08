/** Utilidades para listados RM en Inventario (recepción mercadería). */

export function tipoRegistroLabel(raw) {
  if (raw == null || raw === '') return '—'
  const t = String(raw).trim().toLowerCase()
  if (t === 'ingreso') return 'Ingreso'
  if (t === 'salida') return 'Salida'
  return String(raw)
}

export function buildRmVehiculoMap(vehiculos) {
  const m = new Map()
  if (!Array.isArray(vehiculos)) return m
  for (const v of vehiculos) {
    if (v?.id == null) continue
    const id = Number(v.id)
    if (Number.isNaN(id)) continue
    const placa = typeof v.placa === 'string' ? v.placa.trim() : ''
    const marca = typeof v.marca === 'string' ? v.marca.trim() : ''
    const chofer = typeof v.chofer === 'string' ? v.chofer.trim() : ''
    const guiaNumero = typeof v.guiaNumero === 'string' ? v.guiaNumero.trim() : ''
    const ocNumero = typeof v.ocNumero === 'string' ? v.ocNumero.trim() : ''
    const parts = [placa, marca, chofer].filter(Boolean)
    const numero = v.numeroRegistro ?? v.numeroregistro
    const label =
      parts.length > 0
        ? parts.join(' · ')
        : numero != null
          ? `Registro N° ${numero}`
          : 'Vehículo RM'
    m.set(id, {
      id,
      placa,
      marca,
      chofer,
      guiaNumero,
      ocNumero,
      tipoRegistro: v.tipoRegistro ?? v.tiporegistro,
      numeroRegistro: numero,
      label,
    })
  }
  return m
}

export function rmVehiculoLabel(vehiculoById, registroVehiculoId) {
  if (registroVehiculoId == null || registroVehiculoId === '') return '—'
  const id = Number(registroVehiculoId)
  if (Number.isNaN(id)) return '—'
  return vehiculoById.get(id)?.label ?? '—'
}

function haystack(...parts) {
  return parts
    .filter((p) => p != null && p !== '')
    .join(' ')
    .toLowerCase()
}

/** Normaliza término de búsqueda (quita espacios, guiones extra). */
export function normalizeRmSearchText(value) {
  if (value == null) return ''
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function parseRowDate(value) {
  if (!value) return null
  const d = new Date(value)
  if (!Number.isNaN(d.getTime())) return d
  const iso = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const d2 = new Date(`${iso}T12:00:00`)
    return Number.isNaN(d2.getTime()) ? null : d2
  }
  return null
}

function dateInRange(value, from, to) {
  const d = parseRowDate(value)
  if (!d) return !from && !to
  if (from) {
    const f = new Date(`${from}T00:00:00`)
    if (d < f) return false
  }
  if (to) {
    const t = new Date(`${to}T23:59:59.999`)
    if (d > t) return false
  }
  return true
}

function rowMatchesText(tab, row, vehiculoById, q) {
  const needle = normalizeRmSearchText(q)
  if (!needle) return true

  const veh = vehiculoById.get(Number(row.registroVehiculoId))
  const vehLabel = veh?.label ?? ''

  if (tab === 'entradas') {
    return haystack(
      row.numeroRegistro,
      row.registroVehiculoId,
      vehLabel,
      veh?.guiaNumero,
      veh?.ocNumero,
      row.fecha,
      row.hora,
      row.ocNumero,
      row.guiaNumero,
      row.recepcionEstado,
      row.lineas,
      row.createdAt,
    ).includes(needle)
  }
  if (tab === 'salidas') {
    return haystack(
      row.numeroRegistro,
      row.registroVehiculoId,
      vehLabel,
      veh?.guiaNumero,
      veh?.ocNumero,
      row.fecha,
      row.horaCabecera,
      row.guiaNumero,
      row.ordenCompra,
      row.recepcionEstado,
      row.lineas,
      row.createdAt,
    ).includes(needle)
  }
  if (tab === 'vehiculos') {
    return haystack(
      row.numeroRegistro,
      row.tipoRegistro,
      row.tiporegistro,
      row.fecha,
      row.placa,
      row.chofer,
      row.marca,
      row.guiaNumero,
      row.ocNumero,
      row.createdAt,
    ).includes(needle)
  }
  return haystack(row.razonSocialNombre, row.decision, row.createdAt).includes(needle)
}

/**
 * @param {'entradas'|'salidas'|'vehiculos'|'actas'} tab
 * @param {object} filters { q, fechaDesde, fechaHasta, tipoRegistro, placaChofer }
 * @param {{ skipTextSearch?: boolean }} [opts]
 */
export function rowMatchesRmFilters(tab, row, vehiculoById, filters, opts = {}) {
  const q = filters.q ?? ''
  const fechaDesde = filters.fechaDesde ?? ''
  const fechaHasta = filters.fechaHasta ?? ''
  const tipoFiltro = (filters.tipoRegistro ?? '').trim().toLowerCase()
  const placaChofer = normalizeRmSearchText(filters.placaChofer ?? '')

  if (tab === 'entradas' || tab === 'salidas') {
    if (!dateInRange(row.fecha, fechaDesde, fechaHasta)) return false
    const veh = vehiculoById.get(Number(row.registroVehiculoId))
    if (tipoFiltro && veh) {
      const t = String(veh.tipoRegistro ?? '').toLowerCase()
      if (t !== tipoFiltro) return false
    }
    if (placaChofer && veh) {
      const blob = haystack(veh.placa, veh.marca, veh.chofer, veh.label, veh.guiaNumero, veh.ocNumero)
      if (!blob.includes(placaChofer)) return false
    }
  }

  if (tab === 'vehiculos') {
    if (!dateInRange(row.fecha, fechaDesde, fechaHasta)) return false
    if (tipoFiltro) {
      const t = String(row.tipoRegistro ?? row.tiporegistro ?? '').toLowerCase()
      if (t !== tipoFiltro) return false
    }
    if (placaChofer) {
      const blob = haystack(row.placa, row.marca, row.chofer, row.guiaNumero, row.ocNumero)
      if (!blob.includes(placaChofer)) return false
    }
  }

  if (tab === 'actas') {
    if (!dateInRange(row.createdAt, fechaDesde, fechaHasta)) return false
  }

  if (opts.skipTextSearch) return true
  return rowMatchesText(tab, row, vehiculoById, q)
}

export function formatNumeroRegistro(n) {
  if (n == null || n === '') return '—'
  return `N° ${n}`
}
