import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

const registerServiceWorker = () => {
  registerSW({
    immediate: false,
  })
}

if ('serviceWorker' in navigator) {
  const scheduleRegistration = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(registerServiceWorker, { timeout: 2000 })
      return
    }

    window.setTimeout(registerServiceWorker, 1200)
  }

  if (document.readyState === 'complete') {
    scheduleRegistration()
  } else {
    window.addEventListener('load', scheduleRegistration, { once: true })
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
