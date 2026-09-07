import { FEATURE } from '../access/permissionCatalog'

/** Áreas del antiguo hub único "Inventario", agrupadas en Producción y Almacén. */
export const INVENTORY_AREAS = [
  { id: 'ordenes', label: 'Órdenes Biesse', feature: FEATURE.BIESSE_ORDERS, group: 'produccion' },
  { id: 'monitor', label: 'Seccionadores (monitor)', feature: FEATURE.BIESSE_ORDERS, group: 'produccion' },
  { id: 'pales', label: 'Palés', feature: FEATURE.PALES_LIST, group: 'produccion' },
  { id: 'guias', label: 'Guías de despacho', feature: FEATURE.INVENTORY_GUIAS, group: 'almacen' },
  { id: 'stock', label: 'Almacén (stock)', feature: FEATURE.INVENTORY_STOCK, group: 'almacen' },
  { id: 'tableros', label: 'Tableros', feature: FEATURE.INVENTORY_TABLEROS, group: 'almacen' },
  { id: 'cantos', label: 'Cantos', feature: FEATURE.INVENTORY_CANTOS, group: 'almacen' },
  { id: 'rm', label: 'Recepción mercadería', feature: FEATURE.INVENTORY_RM, group: 'almacen' },
]
