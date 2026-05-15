/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EMPLOYEE_API_BASE?: string
  readonly VITE_OSI_API_BASE?: string
  readonly VITE_ORDER_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
