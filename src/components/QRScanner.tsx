import React, { useState } from 'react'

export default function QRScanner() {
  const [movementMode, setMovementMode] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1d2a",
      color: "white",
      padding: "40px",
      fontFamily: "Arial"
    }}>
      <h1>EDUGUARD360</h1>

      <div style={{ marginTop: 30 }}>
        <button
          onClick={() => setMovementMode('ENTRADA')}
          style={{
            marginRight: 20,
            padding: 10,
            background: movementMode === 'ENTRADA' ? "green" : "gray",
            color: "white"
          }}
        >
          ENTRADA
        </button>

        <button
          onClick={() => setMovementMode('SAIDA')}
          style={{
            padding: 10,
            background: movementMode === 'SAIDA' ? "orange" : "gray",
            color: "white"
          }}
        >
          SAÍDA
        </button>
      </div>

      <p style={{ marginTop: 20 }}>
        Modo atual: <strong>{movementMode}</strong>
      </p>
    </div>
  )
}
