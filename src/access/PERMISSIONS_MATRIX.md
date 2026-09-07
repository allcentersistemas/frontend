# Matriz de permisos (portal web)

Fuente de verdad en código: `rolePermissions.js` (reglas por rol) y `navigationConfig.js` (menú lateral).

Leyenda acciones: **V** view · **C** create · **U** update · **D** delete · **S** scan · **X** close · **P** print · **A** audit · **\*** todas (`manage: all`)

## Menú lateral (`SIDEBAR_MENU`)

| Ítem menú | Feature | MASTER | ADMIN | ADMIN_PROD | DESPACHO | PRODUCCION |
|-----------|---------|:------:|:-----:|:----------:|:--------:|:----------:|
| Resumen | `dashboard.resumen` **o** `dashboard.ventas` | V | V | — | — | — |
| Órdenes | `biesse.orders` | * | * | V S U | V U | V U |
| Palés | `pales.list` | * | * | V | V | V |
| Inventario | `inventory` | * | * | V C U | V | V C |
| Gestión | `transport.vehicles` **o** `employee.admin` | * | * | V* | V flota | — |
| Catálogo API | `api.catalog` | * | * | V | — | — |
| Mi perfil | `employee.profile` | V U | V U | V U | V U | V U |
| Proyectos | `project.list` | * | * | — | V | — |

\* Gestión visible si el rol tiene **view** en vehículos **o** en administración de empleados.

## Roles adicionales (faltaban en esta tabla; ver `rolePermissions.js`)

Estos roles no tienen columna propia arriba porque encajan en un tier ya documentado o son de ventas/gerencia (fuera del flujo operativo Biesse/palés/transporte):

| Rol | Tier equivalente | Detalle |
|-----|-------------------|---------|
| `GERENCIA` | Igual que ADMIN_PROD en "Acciones por módulo" (`MANAGER_OPS` + `AUDIT_RULES`) | + `dashboard.ventas` (V). Sin `employee.admin` ni menú Gestión (`GESTION_ADMIN` no incluido). |
| `SEGURIDAD`, `PROCESOS`, `LOGISTICA`, `CALIDAD` | Igual que DESPACHO/PRODUCCION (`READ_CREATE_OPS`: V C X en todas las `OPS_FEATURES`) | Sin diferencias entre sí; los cuatro comparten exactamente las mismas reglas. |
| `VENTAS` | — (no operativo) | V C X en `project.list` + V en `dashboard.ventas`. Sin acceso a Gestión. |
| `ADMIN_VENTAS` | — (no operativo) | Igual que VENTAS + V C U (cancelar incluido) en `gestion.clientes` y `gestion.proyectos` — accede al hub Gestión solo para esas dos secciones. |

## Acciones por módulo (botones / pantallas)

| Módulo | Feature | MASTER / ADMIN | ADMIN_PROD | DESPACHO | PRODUCCION |
|--------|---------|----------------|------------|----------|------------|
| Resumen ejecutivo | `dashboard.resumen` | V | — | — | — |
| Resumen ventas | `dashboard.ventas` | V | V* | — | V |
| Órdenes Biesse | `biesse.orders` | * | V S U | V U | V U |
| Auditoría Biesse | `biesse.audit` | * | V A | V A | V A |
| Escaneo Biesse | `biesse.scan` | * | * | — | V S U |
| Stickers | `biesse.stickers` | * | V P C | — | — |
| Herramientas Biesse | `biesse.tools` | * | V S U P | — | V S U |
| Listado palés | `pales.list` | * | V | V | V |
| Operaciones palés (crear/editar/cerrar/eliminar) | `pales.operaciones` | * | V C S X U D | V C U D S X A | V U D |
| Auditoría palés | `pales.audit` | * | V A | V A | V A |
| Imprimir palés | `pales.print` | * | P | P | — |
| Vehículos / flota | `transport.vehicles` | * | * | V | — |
| Cargas transporte | `transport.loads` | * | * | V C U D | — |
| Auditoría flota | `transport.audit` | * | V A | — | — |
| Inventario / guías | `inventory` | * | V C U | V | V C |
| Empleados, roles, ubicaciones, auditoría sistema | `employee.admin` | * | — | — | — |
| Catálogo API | `api.catalog` | * | V | — | — |
| Ubicaciones (sucursales) | `location.catalog` | * | * | — | — |
| Proyectos | `project.list` | * | — | V | — |
| Perfil propio | `employee.profile` | V U | V U | V U | V U |

## Cómo cambiar permisos

1. Editar `frontend/src/access/rolePermissions.js` (añadir/quitar `{ action, subject }` por rol).
2. Si es un módulo nuevo, registrar `FEATURE` en `permissionCatalog.js`.
3. Menú: asignar `feature` en `navigationConfig.js`.
4. Botones: usar `<CanButton I={ACTION.xxx} a={FEATURE.xxx}>` o `useAppAbility()` + `canAccessFeature()`.
5. Mantener alineado el backend (`@PreAuthorize` en Java).

## Helpers unificados (evitar `isSystemAdmin`)

- `canAccessFeature(employee, feature, action?)` — comprobaciones fuera de React.
- `useAppAbility()` — dentro de componentes.
- `canViewResumenPage(employee)` — acceso a la página Resumen (operación y/o ventas).
- `canViewResumen(employee)` — pestaña Operación.
- `canViewVentasResumen(employee)` — pestaña Ventas.
- `canManageEmployees(employee)` — pestañas empleados/roles en Gestión.
