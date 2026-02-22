import React from 'react'
import ReactDOM from 'react-dom/client'
import QRScanner from './QRScanner'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QRScanner />
  </React.StrictMode>,
)
