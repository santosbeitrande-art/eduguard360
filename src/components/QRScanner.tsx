import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { SystemAuthProvider, useSystemAuth } from '../context/SystemAuthContext'
import { supabase } from '../lib/supabase'
import ChangePasswordModal from '../components/eduguard/ChangePasswordModal'

interface ScanResult {
  success: boolean
  movement_type?: string
  student?: {
    id: string
    name: string
    grade: string
    class: string
    photo_url?: string
  }
  timestamp?: {
    date: string
    time: string
  }
  message?: string
  error?: string
  today_movements?: number
  parents_notified?: number
  notifications_sent?: any[]
}

const QRScannerContent: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout, isLoading, requiresPasswordChange, updateUser } = useSystemAuth()

  const [movementMode, setMovementMode] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA')
  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [processing, setProcessing] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/sistema/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    return () => stopCamera()
  }, [])

  const processQRCode = async (qrToken: string) => {
    if (processing) return

    setProcessing(true)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('scan-qr', {
        body: {
          qr_token: qrToken.trim(),
          operator_id: user?.id,
          operator_name: user?.name,
          location: 'Portão Principal',
          device: 'Câmara Telemóvel',
          movement_mode: movementMode
        }
      })

      if (error) {
        setResult({ success: false, error: error.message })
      } else if (data?.success) {
        setResult(data)
      } else {
        setResult({ success: false, error: data?.error || 'QR Code inválido' })
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message })
    }

    setProcessing(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      alert('Não foi possível aceder à câmara.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      processQRCode(manualCode.trim())
      setManualCode('')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1d2a] text-white">
        A carregar...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b1d2a] text-white p-6">
      <ChangePasswordModal
        isOpen={requiresPasswordChange}
        onSuccess={() => updateUser({ password_changed: true })}
        isMandatory={true}
      />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">EDUGUARD360 - Controlo</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 rounded"
        >
          Sair
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setMovementMode('ENTRADA')}
          className={`px-6 py-3 rounded ${movementMode === 'ENTRADA' ? 'bg-green-500' : 'bg-gray-700'}`}
        >
          ENTRADA
        </button>

        <button
          onClick={() => setMovementMode('SAIDA')}
          className={`px-6 py-3 rounded ${movementMode === 'SAIDA' ? 'bg-orange-500' : 'bg-gray-700'}`}
        >
          SAÍDA
        </button>
      </div>

      <div className="mb-6">
        <video ref={videoRef} className="w-full max-w-md bg-black rounded" autoPlay playsInline muted />
        <div className="flex gap-2 mt-3">
          <button onClick={startCamera} className="px-4 py-2 bg-green-600 rounded">
            Iniciar Câmara
          </button>
          <button onClick={stopCamera} className="px-4 py-2 bg-red-600 rounded">
            Parar
          </button>
        </div>
      </div>

      <form onSubmit={handleManualSubmit} className="mb-6">
        <input
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Código QR manual"
          className="px-4 py-2 text-black rounded w-full max-w-md"
        />
        <button
          type="submit"
          className="mt-2 px-4 py-2 bg-green-600 rounded"
        >
          Registar {movementMode}
        </button>
      </form>

      {processing && <p className="text-yellow-400">A processar...</p>}

      {result && (
        <div className={`p-4 rounded ${result.success ? 'bg-green-600' : 'bg-red-600'}`}>
          {result.success ? (
            <div>
              <p><strong>{result.student?.name}</strong></p>
              <p>{result.movement_type}</p>
              <p>{result.timestamp?.time}</p>
            </div>
          ) : (
            <p>{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}

const QRScanner: React.FC = () => (
  <SystemAuthProvider>
    <QRScannerContent />
  </SystemAuthProvider>
)

export default QRScanner
