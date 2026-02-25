import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function QRScanner() {
  const [movementMode, setMovementMode] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')

  const schoolId = "e74dae50-ad2d-44d8-b48c-164475c97703"
  const studentId = "f9bbf66f-4585-415c-85f1-b5638b352357"

  const registerMovement = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .insert([
        {
          school_id: schoolId,
          student_id: studentId,
          movement_type: movementMode
        }
      ])

    if (error) {
      console.error("Erro ao registrar:", error)
    } else {
      console.log("Movimento registrado com sucesso:", data)
      alert(`Movimento ${movementMode} registrado com sucesso!`)
    }
  }

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

      <button
        onClick={registerMovement}
        style={{
          marginTop: 30,
          padding: 15,
          background: "#2196f3",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        Registrar Movimento
      </button>
    </div>
  )
}
