import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import logoUrl from './assets/logo.svg?url'

const setFavicon = () => {
  let icon = document.querySelector("link[rel='icon']")

  if (!icon) {
    icon = document.createElement('link')
    icon.rel = 'icon'
    document.head.appendChild(icon)
  }

  icon.type = 'image/svg+xml'
  icon.href = logoUrl

  let shortcutIcon = document.querySelector("link[rel='shortcut icon']")

  if (!shortcutIcon) {
    shortcutIcon = document.createElement('link')
    shortcutIcon.rel = 'shortcut icon'
    document.head.appendChild(shortcutIcon)
  }

  shortcutIcon.href = logoUrl
}

setFavicon()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
