/** Utilidades para listados RM en Inventario (recepción mercadería). */

function rmFieldStr(...values) {
  for (const value of values) {
    if (value == null) continue
    const t = String(value).trim()
    if (t) return t
  }
  return ''
}

function rmRowGuiaInventarioId(row) {
  if (!row || typeof row !== 'object') return null
  const id = row.guiaInventarioId ?? row.guia_inventario_id
  if (id == null || id === '') return null
  const n = Number(id)
  return Number.isNaN(n) ? null : n
}

function rmGuiaFromRow(row, guiaById) {
  const id = rmRowGuiaInventarioId(row)
  if (id == null || !guiaById) return null
  return guiaById.get(id) ?? null
}

/** Mapa guiaId → { numeroGuia, ordenCompra } desde listGuias(). */
export function buildRmGuiaMap(guias) {
  const m = new Map()
  if (!Array.isArray(guias)) return m
  for (const g of guias) {
    if (!g || typeof g !== 'object') continue
    const id = g.guiaId ?? g.id ?? g.guia_id
    if (id == null) continue
    const n = Number(id)
    if (Number.isNaN(n)) continue
    m.set(n, {
      numeroGuia: rmFieldStr(g.numeroGuia, g.numero_guia),
      ordenCompra: rmFieldStr(g.ordenCompra, g.orden_compra, g.ocNumero, g.oc_numero),
    })
  }
  return m
}

function rmRowVehiculoId(row) {
  if (!row || typeof row !== 'object') return null
  const id = row.registroVehiculoId ?? row.registro_vehiculo_id
  if (id == null || id === '') return null
  const n = Number(id)
  return Number.isNaN(n) ? null : n
}

/** OC del propio registro entrada/salida (oc_numero). Fallback solo a guía de inventario vinculada. */
export function rmRowOcNumero(row, guiaById) {
  if (!row || typeof row !== 'object') return ''
  const direct = rmFieldStr(row.ocNumero, row.oc_numero, row.ordenCompra)
  if (direct) return direct
  return rmGuiaFromRow(row, guiaById)?.ordenCompra ?? ''
}

/** N° guía del propio registro entrada/salida (numero_guia). Fallback solo a guía de inventario vinculada. */
export function rmRowNumeroGuia(row, guiaById) {
  if (!row || typeof row !== 'object') return ''
  const direct = rmFieldStr(row.numeroGuia, row.numero_guia)
  if (direct) return direct
  return rmGuiaFromRow(row, guiaById)?.numeroGuia ?? ''
}

/** Texto combinado para columna OC / Guía en entradas y salidas. */
export function rmRowOcGuiaLabel(row, guiaById) {
  const oc = rmRowOcNumero(row, guiaById)
  const guia = rmRowNumeroGuia(row, guiaById)
  return `${oc || '—'} / ${guia || '—'}`
}

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
    const placa = rmFieldStr(v.placa)
    const marca = rmFieldStr(v.marca)
    const chofer = rmFieldStr(v.chofer)
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

function rowMatchesText(tab, row, vehiculoById, q, guiaById) {
  const needle = normalizeRmSearchText(q)
  if (!needle) return true

  const vehId = rmRowVehiculoId(row)
  const veh = vehId != null ? vehiculoById.get(vehId) : null
  const vehLabel = veh?.label ?? ''

  if (tab === 'entradas') {
    return haystack(
      row.numeroRegistro,
      row.numeroregistro,
      row.registroVehiculoId,
      vehLabel,
      row.fecha,
      row.hora,
      rmRowOcNumero(row, guiaById),
      rmRowNumeroGuia(row, guiaById),
      row.recepcionEstado,
      row.lineas,
      row.createdAt,
    ).includes(needle)
  }
  if (tab === 'salidas') {
    return haystack(
      row.numeroRegistro,
      row.numeroregistro,
      row.registroVehiculoId,
      vehLabel,
      row.fecha,
      row.horaCabecera,
      rmRowOcNumero(row, guiaById),
      rmRowNumeroGuia(row, guiaById),
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
  const guiaById = opts.guiaById
  const q = filters.q ?? ''
  const fechaDesde = filters.fechaDesde ?? ''
  const fechaHasta = filters.fechaHasta ?? ''
  const tipoFiltro = (filters.tipoRegistro ?? '').trim().toLowerCase()
  const placaChofer = normalizeRmSearchText(filters.placaChofer ?? '')

  if (tab === 'entradas' || tab === 'salidas') {
    if (!dateInRange(row.fecha, fechaDesde, fechaHasta)) return false
    const vehId = rmRowVehiculoId(row)
    const veh = vehId != null ? vehiculoById.get(vehId) : null
    if (tipoFiltro) {
      if (!veh) return false
      const t = String(veh.tipoRegistro ?? '').toLowerCase()
      if (t !== tipoFiltro) return false
    }
    if (placaChofer) {
      if (!veh) return false
      const blob = haystack(
        veh.placa,
        veh.marca,
        veh.chofer,
        veh.label,
        rmRowOcNumero(row, guiaById),
        rmRowNumeroGuia(row, guiaById),
      )
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
      const blob = haystack(row.placa, row.marca, row.chofer)
      if (!blob.includes(placaChofer)) return false
    }
  }

  if (tab === 'actas') {
    if (!dateInRange(row.createdAt, fechaDesde, fechaHasta)) return false
  }

  if (opts.skipTextSearch && tab !== 'actas') return true
  return rowMatchesText(tab, row, vehiculoById, q, guiaById)
}

export function formatNumeroRegistro(n) {
  if (n == null || n === '') return '—'
  return `N° ${n}`
}
