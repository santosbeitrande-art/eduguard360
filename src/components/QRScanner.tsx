import React, { useEffect, useState } from "react"
import { Html5QrcodeScanner } from "html5-qrcode"
import { supabase } from "../lib/supabase"

export default function QRScanner() {

  const [movementMode, setMovementMode] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')

  useEffect(() => {

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: 250 },
      false
    )

    scanner.render(async (decodedText) => {

      try {

        const studentId = decodedText

        const { error } = await supabase
          .from("attendance")
          .insert([
            {
              student_id: studentId,
              school_id: "e74dae50-ad2d-44d8-b48c-164475c97703",
              movement_type: movementMode
            }
          ])

        if (error) {
          alert("Erro ao registrar movimento")
        } else {
          alert(`Movimento ${movementMode} registrado`)
        }

      } catch (err) {
        console.error(err)
      }

    })

  }, [movementMode])

  return (
    <div style={{ padding: 30 }}>

      <h1>EDUGUARD360</h1>

      <div>

        <button
          onClick={() => setMovementMode("ENTRADA")}
        >
          ENTRADA
        </button>

        <button
          onClick={() => setMovementMode("SAIDA")}
        >
          SAÍDA
        </button>

      </div>

      <p>Modo atual: {movementMode}</p>

      <div
        id="reader"
        style={{ width: "300px", marginTop: 20 }}
      />
npm run dev
    </div>
  )
}
