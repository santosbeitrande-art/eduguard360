import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function QRScanner() {
  const [movementMode, setMovementMode] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')
  const [movements, setMovements] = useState<any[]>([])

  const schoolId = "e74dae50-ad2d-44d8-b48c-164475c97703"
  const studentId = "f9bbf66f-4585-415c-85f1-b5638b352357"

  // 🔄 Carregar histórico ao abrir a página
  useEffect(() => {
    loadMovements()
  }, [])

  // 📜 Buscar últimos movimentos
  const loadMovements = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (!error && data) {
      setMovements(data)
    }
  }

  // 🚫 + ➕ Registrar movimento com validação
  const registerMovement = async () => {
    // 1️⃣ Buscar último movimento
    const { data: lastMovement, error: fetchError } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error("Erro ao buscar último movimento:", fetchError)
      return
    }

    if (lastMovement && lastMovement.length > 0) {
      const lastType = lastMovement[0].movement_type

      if (lastType === movementMode) {
        alert(`Já existe um registro de ${movementMode}.`)
        return
      }
    }

    // 2️⃣ Inserir novo movimento
    const { error } = await supabase
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
      alert(`Movimento ${movementMode} registrado com sucesso!`)
      loadMovements() // Atualiza histórico
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

      {/* 📜 Histórico */}
      <h3 style={{ marginTop: 40 }}>Últimos Movimentos</h3>

      <ul>
        {movements.map((m) => (
          <li key={m.id}>
            {m.movement_type} - {new Date(m.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  )
}
