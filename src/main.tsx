
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SystemAuthProvider, useSystemAuth } from '@/context/SystemAuthContext';
import { supabase } from '@/lib/supabase';
import ChangePasswordModal from '@/components/eduguard/ChangePasswordModal';

const ShieldIcon = () => (
  <svg className="w-8 h-8 text-[#2ecc71]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

interface ScanResult {
  success: boolean;
  movement_type?: string;
  student?: { id: string; name: string; grade: string; class: string; photo_url?: string };
  timestamp?: { date: string; time: string };
  message?: string;
  error?: string;
  today_movements?: number;
  parents_notified?: number;
  notifications_sent?: any[];
}

const QRScannerContent: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isLoading, requiresPasswordChange, updateUser } = useSystemAuth();
  const [movementMode, setMovementMode] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerTab, setScannerTab] = useState<'camera' | 'manual'>('camera');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/sistema/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const playSound = (type: 'success' | 'error') => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.frequency.value = 800; gain.gain.value = 0.3; osc.start();
        setTimeout(() => { osc.frequency.value = 1200; }, 100);
        setTimeout(() => { osc.stop(); ctx.close(); }, 200);
      } else {
        osc.frequency.value = 300; gain.gain.value = 0.3; osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, 400);
      }
    } catch (e) {}
  };

  const processQRCode = async (qrToken: string) => {
    if (processing) return;
    setProcessing(true);
    setResult(null);

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
      });

      if (error) {
        setResult({ success: false, error: error.message || 'Erro de comunicação' });
        playSound('error');
      } else if (data?.success) {
        setResult(data);
        setRecentScans(prev => [data, ...prev.slice(0, 49)]);
        setScanCount(prev => prev + 1);
        playSound('success');
      } else {
        setResult({ success: false, error: data?.error || 'QR Code não reconhecido' });
        playSound('error');
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Erro ao processar' });
      playSound('error');
    }

    setProcessing(false);
    setTimeout(() => setResult(null), 6000);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Start scanning loop using BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        scanIntervalRef.current = window.setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && !processing) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                if (code && code.length >= 3) {
                  processQRCode(code);
                }
              }
            } catch (e) {}
          }
        }, 500);
      }
    } catch (err) {
      alert('Não foi possível aceder à câmara. Verifique as permissões do navegador.');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processQRCode(manualCode.trim());
      setManualCode('');
    }
  };

  const demoStudents = [
    { token: 'QR-TOKEN-001-SECURE', name: 'Ana Machel', grade: '5ª Classe' },
    { token: 'QR-TOKEN-002-SECURE', name: 'João Mondlane', grade: '6ª Classe' },
    { token: 'QR-TOKEN-003-SECURE', name: 'Maria Chissano', grade: '7ª Classe' },
    { token: 'QR-TOKEN-004-SECURE', name: 'Pedro Guebuza', grade: '8ª Classe' },
    { token: 'QR-TOKEN-005-SECURE', name: 'Sofia Nyusi', grade: '5ª Classe' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1d2a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2ecc71] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1d2a] via-[#0f2a3d] to-[#0b1d2a]">
      <ChangePasswordModal
        isOpen={requiresPasswordChange}
        onSuccess={() => updateUser({ password_changed: true })}
        isMandatory={true}
      />

      <header className="bg-[#0b1d2a]/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ShieldIcon />
            <span className="text-xl font-bold text-white">EDU<span className="text-[#2ecc71]">•</span>GUARD360</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-gray-300 text-sm hidden md:block">{user?.name}</span>
            <button onClick={logout} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Controlo de Acesso</h1>
            <p className="text-gray-400 text-sm">Operador: <strong className="text-white">{user?.name}</strong></p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center">
              <p className="text-gray-400 text-xs">Registos</p>
              <p className="text-xl font-bold text-[#2ecc71]">{scanCount}</p>
            </div>
          </div>
        </div>

        {/* MOVEMENT MODE SELECTOR - Big prominent buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setMovementMode('ENTRADA')}
            className={`relative p-6 rounded-2xl border-2 transition-all ${
              movementMode === 'ENTRADA'
                ? 'bg-[#2ecc71]/20 border-[#2ecc71] shadow-lg shadow-[#2ecc71]/20'
                : 'bg-white/5 border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${movementMode === 'ENTRADA' ? 'bg-[#2ecc71]' : 'bg-white/10'}`}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className={`text-xl font-bold ${movementMode === 'ENTRADA' ? 'text-[#2ecc71]' : 'text-gray-400'}`}>ENTRADA</span>
            </div>
            {movementMode === 'ENTRADA' && (
              <div className="absolute top-3 right-3 w-4 h-4 bg-[#2ecc71] rounded-full animate-pulse"></div>
            )}
          </button>

          <button
            onClick={() => setMovementMode('SAIDA')}
            className={`relative p-6 rounded-2xl border-2 transition-all ${
              movementMode === 'SAIDA'
                ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/20'
                : 'bg-white/5 border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${movementMode === 'SAIDA' ? 'bg-orange-500' : 'bg-white/10'}`}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className={`text-xl font-bold ${movementMode === 'SAIDA' ? 'text-orange-400' : 'text-gray-400'}`}>SAÍDA</span>
            </div>
            {movementMode === 'SAIDA' && (
              <div className="absolute top-3 right-3 w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
            )}
          </button>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Scanner Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tab selector */}
            <div className="flex gap-2">
              <button onClick={() => { setScannerTab('camera'); if (!cameraActive) startCamera(); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${scannerTab === 'camera' ? 'bg-[#2ecc71] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Câmara
              </button>
              <button onClick={() => { setScannerTab('manual'); stopCamera(); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${scannerTab === 'manual' ? 'bg-[#2ecc71] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Manual
              </button>
            </div>

            {/* Camera Scanner */}
            {scannerTab === 'camera' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                {cameraActive ? (
                  <div className="relative">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover rounded-xl bg-black" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 pointer-events-none rounded-xl">
                      <div className="absolute inset-8 border-2 border-[#2ecc71]/60 rounded-lg">
                        <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-[#2ecc71] rounded-tl"></div>
                        <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-[#2ecc71] rounded-tr"></div>
                        <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-[#2ecc71] rounded-bl"></div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-[#2ecc71] rounded-br"></div>
                      </div>
                      <div className="absolute inset-8 flex items-center">
                        <div className="w-full h-0.5 bg-[#2ecc71]/40 animate-pulse"></div>
                      </div>
                    </div>
                    {processing && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
                      </div>
                    )}
                    <button onClick={stopCamera} className="absolute bottom-3 right-3 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-sm transition-colors">
                      Parar
                    </button>
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-white/5 rounded-xl flex flex-col items-center justify-center">
                    <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <button onClick={startCamera} className="px-6 py-3 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-semibold rounded-lg transition-colors">
                      Iniciar Câmara
                    </button>
                    <p className="text-gray-500 text-xs mt-3 text-center px-4">
                      Aponte a câmara para o QR Code do aluno
                    </p>
                  </div>
                )}
                <p className="text-gray-500 text-xs mt-3">
                  A câmara lê automaticamente QR Codes. Se o seu navegador não suportar leitura automática, use o modo Manual.
                </p>
              </div>
            )}

            {/* Manual Mode */}
            {scannerTab === 'manual' && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h2 className="text-lg font-semibold text-white mb-4">Entrada Manual</h2>
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Código QR ou ID do aluno"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2ecc71] font-mono"
                    autoFocus
                  />
                  <button type="submit" disabled={processing || !manualCode.trim()}
                    className="w-full py-3 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
                    {processing ? 'A processar...' : `Registar ${movementMode}`}
                  </button>
                </form>
              </div>
            )}

            {/* Demo QR Codes */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              <h2 className="text-sm font-semibold text-gray-300 mb-3">Teste Rápido (Demo)</h2>
              <div className="grid grid-cols-1 gap-2">
                {demoStudents.map((qr) => (
                  <button key={qr.token} onClick={() => processQRCode(qr.token)} disabled={processing}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition-colors disabled:opacity-50">
                    <div className="w-8 h-8 bg-[#2ecc71]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#2ecc71]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium">{qr.name}</p>
                      <p className="text-gray-500 text-xs">{qr.grade}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${movementMode === 'ENTRADA' ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-orange-500/20 text-orange-400'}`}>
                      {movementMode}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result & Recent Scans */}
          <div className="lg:col-span-3 space-y-4">
            {/* Current Result */}
            {result && (
              <div className={`rounded-2xl p-6 border-2 transition-all animate-in fade-in duration-300 ${
                result.success
                  ? result.movement_type === 'ENTRADA' ? 'bg-[#2ecc71]/10 border-[#2ecc71]/40' : 'bg-orange-500/10 border-orange-500/40'
                  : 'bg-red-500/10 border-red-500/40'
              }`}>
                {result.success ? (
                  <div className="flex items-center gap-6">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 ${result.movement_type === 'ENTRADA' ? 'bg-[#2ecc71]' : 'bg-orange-500'}`}>
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                          result.movement_type === 'ENTRADA' ? 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' : 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                        } />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-2xl font-bold ${result.movement_type === 'ENTRADA' ? 'text-[#2ecc71]' : 'text-orange-400'}`}>
                        {result.movement_type}
                      </h3>
                      <p className="text-white text-xl font-semibold">{result.student?.name}</p>
                      <p className="text-gray-300">{result.student?.grade} - {result.student?.class}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <p className="text-gray-400 text-sm">{result.timestamp?.date} às {result.timestamp?.time}</p>
                        {result.parents_notified && result.parents_notified > 0 && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {result.parents_notified} pai(s) notificado(s)
                          </span>
                        )}
                        {result.notifications_sent && result.notifications_sent.some((n: any) => n.channel === 'email') && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">Email enviado</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-red-400">Erro</h3>
                      <p className="text-gray-300 mt-1">{result.error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {processing && (
              <div className="rounded-2xl p-6 border border-yellow-500/30 bg-yellow-500/5 flex items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-yellow-500 border-t-transparent"></div>
                <div>
                  <p className="text-yellow-400 font-medium">A registar {movementMode}...</p>
                  <p className="text-gray-400 text-sm">A comunicar com a base de dados</p>
                </div>
              </div>
            )}

            {/* Recent Scans */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Registos da Sessão</h3>
                <span className="text-gray-400 text-sm">{recentScans.length} registos</span>
              </div>
              {recentScans.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-400">Nenhum registo nesta sessão</p>
                  <p className="text-gray-500 text-sm mt-1">Seleccione ENTRADA ou SAÍDA e leia um QR Code</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Hora</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Aluno</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Classe</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300">Movimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {recentScans.map((scan, index) => (
                        <tr key={index} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-white text-sm font-mono">{scan.timestamp?.time}</td>
                          <td className="px-4 py-3 text-white text-sm font-medium">{scan.student?.name}</td>
                          <td className="px-4 py-3 text-gray-400 text-sm">{scan.student?.grade}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              scan.movement_type === 'ENTRADA' ? 'bg-[#2ecc71]/20 text-[#2ecc71]' : 'bg-orange-500/20 text-orange-400'
                            }`}>{scan.movement_type}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const QRScanner: React.FC = () => (
  <SystemAuthProvider>
    <QRScannerContent />
  </SystemAuthProvider>
);

export default QRScanner;
