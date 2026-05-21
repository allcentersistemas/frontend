import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { assertSecureDeployment } from './config/security'
import { ThemeProvider } from './theme/ThemeProvider'

assertSecureDeployment()

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('No se encontró #root')

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
