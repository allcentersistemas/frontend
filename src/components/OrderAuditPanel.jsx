import { useEffect, useState } from 'react'
import * as osiApi from '../api/osiApi'
import { AlertBanner } from '../ui/AlertBanner.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { FormField } from '../ui/FormField.jsx'
import { GlassCard, GlassCardTitle } from '../ui/GlassCard.jsx'
import { inputClass } from '../ui/fields.js'
import { Spinner } from '../ui/Spinner.jsx'
import { Table, TableScroll, Td, Th, Thead, Tr } from '../ui/Table.jsx'
import { Toolbar } from '../ui/Toolbar.jsx'

import { auditPick } from '../utils/auditDisplay.js'

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Contenido de auditoría Biesse embebido en Órdenes (misma página, pestaña). */
export function OrderAuditPanel() {
  const [filters, setFilters] = useState({ orderId: '', partId: '', action: '' })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const data = await osiApi.listBiesseAudit({
          orderId: filters.orderId.trim() || undefined,
          partId: filters.partId.trim() || undefined,
          action: filters.action.trim() || undefined,
          limit: 200,
        })
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'No se pudo cargar auditoría de órdenes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filters.orderId, filters.partId, filters.action])

  return (
    <>
      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-white">Auditoría de órdenes</h2>
        <p className="mt-1 text-sm text-slate-400">
          Trazabilidad contextual de escaneos y cambios registrados para órdenes Biesse.
        </p>
      </div>

      <Toolbar>
        <FormField label="Orden">
          <input
            inputMode="numeric"
            value={filters.orderId}
            onChange={(e) => setFilters((s) => ({ ...s, orderId: e.target.value }))}
            placeholder="orderId"
            className={inputClass}
          />
        </FormField>
        <FormField label="Parte">
          <input
            inputMode="numeric"
            value={filters.partId}
            onChange={(e) => setFilters((s) => ({ ...s, partId: e.target.value }))}
            placeholder="partId"
            className={inputClass}
          />
        </FormField>
        <FormField label="Acción">
          <input
            value={filters.action}
            onChange={(e) => setFilters((s) => ({ ...s, action: e.target.value }))}
            placeholder="ESCANEAR, UPDATE..."
            className={inputClass}
          />
        </FormField>
        <div className="flex flex-1 flex-col justify-end sm:min-w-[100px]">
          <span className="invisible mb-2 text-xs sm:hidden">—</span>
          <Button variant="ghost" type="button" onClick={() => setFilters({ orderId: '', partId: '', action: '' })}>
            Limpiar
          </Button>
        </div>
      </Toolbar>

      {err ? <AlertBanner>{err}</AlertBanner> : null}

      <GlassCard padding={false} className="overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <GlassCardTitle>Eventos</GlassCardTitle>
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <>
            <TableScroll>
              <Table>
                <Thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Acción</Th>
                    <Th>Orden</Th>
                    <Th>Parte</Th>
                    <Th>Usuario</Th>
                    <Th>Equipo</Th>
                    <Th>Método</Th>
                  </tr>
                </Thead>
                <tbody>
                  {rows.map((row, index) => (
                    <Tr key={row.id ?? `${row.orderid}-${row.partid}-${index}`}>
                      <Td className="whitespace-nowrap text-xs text-slate-400">
                        {formatDateTime(row.occurred_at ?? row.occurredAt ?? row.fecha ?? row.created_at)}
                      </Td>
                      <Td>{row.action ?? row.accion ?? '-'}</Td>
                      <Td className="font-mono text-xs">{row.orderid ?? row.orderId ?? '-'}</Td>
                      <Td className="font-mono text-xs">{row.partid ?? row.partId ?? '-'}</Td>
                      <Td className="max-w-[140px] text-xs" title={String(auditPick(row, 'usuarioid', 'usuarioId') ?? '')}>
                        {auditPick(row, 'usuarioid', 'usuarioId') != null ? `#${auditPick(row, 'usuarioid', 'usuarioId')}` : '—'}
                      </Td>
                      <Td className="max-w-[120px] truncate text-xs" title={String(auditPick(row, 'equipo') ?? '')}>
                        {auditPick(row, 'equipo') ?? '—'}
                      </Td>
                      <Td className="max-w-[100px] truncate text-xs">{auditPick(row, 'metodo') ?? '—'}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            {!rows.length ? (
              <div className="p-6">
                <EmptyState title="Sin auditoría" hint="Ajusta los filtros o verifica el rango de datos." />
              </div>
            ) : null}
          </>
        )}
      </GlassCard>
    </>
  )
}
