import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './api'
import App from './App'
import './App.css'

// The console is served under /console/ (Vite base + FastAPI mount), so React
// Router must strip that prefix. Without a basename every route failed to match
// at /console/... and the whole UI rendered blank.
const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
