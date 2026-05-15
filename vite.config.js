import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; frame-ancestors 'none'; base-uri 'self'",
}

function securityHeadersPlugin() {
  const apply = (server) => {
    server.middlewares.use((_req, res, next) => {
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
        res.setHeader(k, v)
      }
      next()
    })
  }
  return {
    name: 'allcenter-security-headers',
    configureServer: apply,
    configurePreviewServer: apply,
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useProxy = env.VITE_USE_DEV_PROXY === 'true'

  const proxy = useProxy
    ? {
        '/api-employee': {
          target: env.VITE_PROXY_EMPLOYEE_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-employee/, ''),
        },
        '/api-order': {
          target: env.VITE_PROXY_ORDER_TARGET || 'http://localhost:8083',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-order/, ''),
        },
        '/api-transport': {
          target: env.VITE_PROXY_TRANSPORT_TARGET || 'http://localhost:8085',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-transport/, ''),
        },
        '/api-pale': {
          target: env.VITE_PROXY_PALE_TARGET || 'http://localhost:8087',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-pale/, ''),
        },
        '/api-location': {
          target: env.VITE_PROXY_LOCATION_TARGET || 'http://localhost:8088',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-location/, ''),
        },
        '/api-inventory': {
          target: env.VITE_PROXY_INVENTORY_TARGET || 'http://localhost:8089',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-inventory/, ''),
        },
        '/api-rm': {
          target: env.VITE_PROXY_RM_TARGET || 'http://localhost:8090',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-rm/, ''),
        },
        '/api-biesse': {
          target: env.VITE_PROXY_BIESSE_TARGET || 'http://localhost:8086',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-biesse/, ''),
        },
        '/api-client': {
          target: env.VITE_PROXY_CLIENT_TARGET || 'http://localhost:8084',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-client/, ''),
        },
      }
    : undefined

  return {
    plugins: [react(), securityHeadersPlugin()],
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      proxy,
    },
    preview: {
      port: Number(env.VITE_PREVIEW_PORT) || 4173,
    },
  }
})
