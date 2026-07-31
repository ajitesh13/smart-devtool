import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Match Chrome DevTools' active theme (light/dark) rather than the OS setting.
function applyDevToolsTheme(): void {
  const name = chrome.devtools?.panels?.themeName
  const theme = name === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
}

applyDevToolsTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
