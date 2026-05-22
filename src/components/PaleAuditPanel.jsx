import { useEffect, useState } from 'react'
import * as systemApi from '../api/systemApi'
import { AlertBanner } from '../ui/AlertBanner.jsx'
import { Button } from '../ui/Button.jsx'
import { EmptyState } from '../ui/EmptyState.jsx'
import { FormField } from '../ui/FormField.jsx'
import { GlassCard, GlassCardTitle } from '../ui/GlassCard.jsx'
import { inputClass } from '../ui/fields.js'
import { Spinner } from '../ui/Spinner.jsx'
import { Table, TableScroll, Td, Th, Thead, Tr } from '../ui/Table.jsx'
import { Toolbar } from '../ui/Toolbar.jsx'
import { shortUa } from '../utils/auditDisplay.js'

function formatDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString()
}

/** Contenido de auditoría de pales embebido en Pales (misma página, pestaña). */
export function PaleAuditPanel() {
  const [filters, setFilters] = useState({ paleId: '', action: '' })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr(null)
      try {
        const data = await systemApi.listPalletAudit({
          paleId: filters.paleId.trim() || undefined,
          action: filters.action.trim() || undefined,
          limit: 200,
        })
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'No se pudo cargar auditoría de pales')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filters.paleId, filters.action])

  return (
    <>
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 sm:px-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Auditoría de pales</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Trazabilidad contextual de creación, edición, cierre y cambios de detalles del pale.
        </p>
      </div>

      <Toolbar>
        <FormField label="Pale">
          <input
            inputMode="numeric"
            value={filters.paleId}
            onChange={(e) => setFilters((s) => ({ ...s, paleId: e.target.value }))}
            placeholder="paleId"
            className={inputClass}
          />
        </FormField>
        <FormField label="Acción">
          <input
            value={filters.action}
            onChange={(e) => setFilters((s) => ({ ...s, action: e.target.value }))}
            placeholder="CREATE, UPDATE, DELETE_DETAIL..."
            className={inputClass}
          />
        </FormField>
        <div className="flex flex-1 flex-col justify-end sm:min-w-[100px]">
          <span className="invisible mb-2 text-xs sm:hidden">—</span>
          <Button variant="ghost" type="button" onClick={() => setFilters({ paleId: '', action: '' })}>
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
                    <Th>Pale</Th>
                    <Th>Entidad</Th>
                    <Th>Detalle</Th>
                    <Th>Actor</Th>
                    <Th>IP origen</Th>
                    <Th>Cliente</Th>
                  </tr>
                </Thead>
                <tbody>
                  {rows.map((row) => (
                    <Tr key={row.id}>
                      <Td className="whitespace-nowrap text-xs text-slate-400">{formatDateTime(row.occurredAt)}</Td>
                      <Td>{row.action}</Td>
                      <Td>{row.paleCodigo ?? row.paleId ?? '-'}</Td>
                      <Td className="text-xs text-slate-400">
                        {row.entityType} {row.entityId ? `#${row.entityId}` : ''}
                      </Td>
                      <Td className="max-w-[200px] break-words text-xs text-slate-400">{row.details ?? '-'}</Td>
                      <Td className="max-w-[160px] truncate text-xs" title={row.actorEmail ?? ''}>
                        {row.actorEmail ?? (row.actorEmployeeId != null ? `#${row.actorEmployeeId}` : '—')}
                      </Td>
                      <Td className="max-w-[120px] truncate font-mono text-xs text-slate-400" title={row.sourceIp ?? ''}>
                        {row.sourceIp ?? '—'}
                      </Td>
                      <Td className="max-w-[140px] truncate text-xs text-slate-500" title={row.userAgent ?? ''}>
                        {shortUa(row.userAgent, 40)}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            {!rows.length ? (
              <div className="p-6">
                <EmptyState title="Sin auditoría" hint="Prueba otros filtros." />
              </div>
            ) : null}
          </>
        )}
      </GlassCard>
    </>
  )
}
