import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import './index.css'

const root = document.getElementById('root')
if (root) {
  // index.html 里的开机画面就在 #root 里,createRoot 会把它换掉
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </HashRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
  // 告诉 index.html 的看门狗:起来了,不用报错
  window.__APP_BOOTED__ = true
}
