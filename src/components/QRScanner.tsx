import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function QRScanner() {
  const [movementMode, setMovementMode] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')
  const [movements, setMovements] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)

  // 🔐 Buscar utilizador autenticado e escola
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert("Utilizador não autenticado")
        return
      }

      // Buscar escola do utilizador
      const { data, error } = await supabase
        .from('users')
        .select('school_id')
        .eq('auth_id', user.id)
        .single()

      if (error || !data) {
        console.error("Erro ao buscar school_id:", error)
        return
      }

      setSchoolId(data.school_id)

      // ⚠ Para teste ainda usamos student fixo
      setStudentId("f9bbf66f-4585-415c-85f1-b5638b352357")

      loadMovements(data.school_id)
    }

    loadUserData()
  }, [])

  const loadMovements = async (school_id: string) => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('school_id', school_id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (data) {
      setMovements(data)
    }
  }

  const registerMovement = async () => {
    if (!schoolId || !studentId) return

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
      loadMovements(schoolId)
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
