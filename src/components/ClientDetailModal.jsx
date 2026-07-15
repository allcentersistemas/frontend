import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DetailModal } from './DetailModal.jsx'
import * as systemApi from '../api/systemApi'
import { useAuth } from '../auth/AuthContext'
import { useAppAbility } from '../access/useAppAbility'
import { FEATURE } from '../access/permissionCatalog'
import { formatAppDateTime } from '../utils/appDateTime'
import { gestionClientePortalHref } from '../utils/gestionPaths'

function Field({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}

export function ClientDetailModal({ clientUserId, proyectoId, clientLabel, open, onClose }) {
  const { allowedDashboard } = useAuth()
  const ability = useAppAbility()
  const base = allowedDashboard ? `/dashboard/${allowedDashboard}` : '/dashboard/admin-produccion'
  const canManagePortal = ability.can('view', FEATURE.GESTION_CLIENTES_PORTAL)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || (!clientUserId && !proyectoId)) {
      setClient(null)
      setError('')
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = proyectoId
          ? await systemApi.getProyectoPortalCliente(proyectoId)
          : await systemApi.getClient(clientUserId)
        if (!cancelled) setClient(data)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar el cliente')
          setClient(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, clientUserId, proyectoId])

  const portalHref = client?.id ? gestionClientePortalHref(base, client.id) : null

  return (
    <DetailModal
      open={open}
      title={client?.displayName || client?.razonSocial || clientLabel || 'Cliente'}
      subtitle={client?.email || ''}
      onClose={onClose}
    >
      {loading ? <p className="muted">Cargando datos del cliente…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!loading && !error && client ? (
        <>
          <dl className="detail-dl">
            <Field label="Correo" value={client.email} />
            <Field label="Usuario" value={client.username} />
            <Field label="Nombre para mostrar" value={client.displayName} />
            <Field label="Teléfono" value={client.phone} />
            <Field label="Tipo" value={client.juridica ? 'Persona jurídica' : 'Persona natural'} />
            <Field label="Estado" value={client.active ? 'Activo' : 'Inactivo'} />
            {client.juridica ? (
              <>
                <Field label="Razón social" value={client.razonSocial} />
                <Field label="RUC" value={client.ruc} />
                <Field label="Nombre de contacto" value={client.nombre} />
              </>
            ) : (
              <>
                <Field label="Tipo documento" value={client.tipoDocumento} />
                <Field label="Número documento" value={client.numeroDocumento} />
              </>
            )}
            <Field label="Dirección" value={client.direccion} />
            <Field label="Ciudad" value={client.ciudad} />
            <Field label="Distrito" value={client.distrito} />
            <Field label="Departamento" value={client.departamento} />
            <Field
              label="Registrado"
              value={formatAppDateTime(client.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
            />
          </dl>
          {canManagePortal && portalHref ? (
            <p className="muted small" style={{ marginTop: '1rem' }}>
              La actividad de acceso (último login, IP e historial) está en{' '}
              <Link to={portalHref} className="linkish" onClick={onClose}>
                Gestión → Cliente portal
              </Link>
              .
            </p>
          ) : null}
        </>
      ) : null}
    </DetailModal>
  )
}
