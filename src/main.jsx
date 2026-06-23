import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// FORCE CACHE BUSTING (PWA Service Worker terbukti menahan update JS bagi user)
const CACHE_VERSION = 'v1.0.1_force_update';
if (localStorage.getItem('mandalagiri_version') !== CACHE_VERSION) {
  localStorage.setItem('mandalagiri_version', CACHE_VERSION);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }
  window.location.reload(true);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
