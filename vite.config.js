import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

/** Producción / preview: sin inline scripts. */
const CSP_PRODUCTION =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'"

/**
 * Desarrollo: Vite y @vitejs/plugin-react inyectan scripts inline (HMR / preamble).
 * Sin 'unsafe-inline' el navegador bloquea esos scripts y React falla al arrancar.
 */
const CSP_DEVELOPMENT =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*; frame-ancestors 'none'; base-uri 'self'"

function securityHeadersPlugin(csp) {
  const headers = { ...BASE_SECURITY_HEADERS, 'Content-Security-Policy': csp }
  const apply = (server) => {
    server.middlewares.use((_req, res, next) => {
      for (const [k, v] of Object.entries(headers)) {
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

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDevServer = command === 'serve'
  const useProxy = env.VITE_USE_DEV_PROXY === 'true'

  const systemTarget = env.VITE_PROXY_SYSTEM_TARGET || 'http://localhost:8080'
  const proxy = useProxy
    ? {
        '/api-system': {
          target: systemTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-system/, ''),
        },
        '/api-biesse': {
          target: env.VITE_PROXY_BIESSE_TARGET || 'http://localhost:8086',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-biesse/, ''),
        },
      }
    : undefined

  return {
    plugins: [
      react(),
      securityHeadersPlugin(isDevServer ? CSP_DEVELOPMENT : CSP_PRODUCTION),
    ],
    server: {
      port: Number(env.VITE_DEV_PORT) || 5173,
      proxy,
    },
    preview: {
      port: Number(env.VITE_PREVIEW_PORT) || 4173,
    },
  }
})
