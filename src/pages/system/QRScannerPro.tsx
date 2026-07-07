import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner/qr-scanner.min.js';
import { saveStudentEntry } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, ScanLine, AlertCircle } from 'lucide-react';

interface Student {
  code: string;
  name: string;
  className: string;
}

const QRScannerPro = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const isScanningRef = useRef(true);
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('A iniciar scanner...');

  const parseStudentPayload = (rawData: string): Student | null => {
    const trimmedData = rawData.trim();

    if (!trimmedData) {
      return null;
    }

    try {
      const parsedData = JSON.parse(trimmedData);

      if (parsedData && typeof parsedData === 'object') {
        const parsedCode =
          String(
            parsedData.code
            || parsedData.qrcode_id
            || parsedData.qrCodeId
            || parsedData.student_code
            || parsedData.studentId
            || ''
          ).trim();

        return {
          code: parsedCode,
          name: String(parsedData.name || '').trim(),
          className: String(parsedData.className || parsedData.class_name || '').trim(),
        };
      }
    } catch {
      // Fallback para QR codes que carregam apenas o identificador do aluno.
    }

    // Permite QR no formato URL com query param (?code=... ou ?qrcode_id=...)
    if (trimmedData.startsWith('http://') || trimmedData.startsWith('https://')) {
      try {
        const parsedUrl = new URL(trimmedData);
        const codeFromUrl =
          parsedUrl.searchParams.get('code')
          || parsedUrl.searchParams.get('qrcode_id')
          || parsedUrl.searchParams.get('student_code')
          || parsedUrl.searchParams.get('id')
          || '';

        if (codeFromUrl.trim()) {
          return {
            code: codeFromUrl.trim(),
            name: '',
            className: '',
          };
        }
      } catch {
        // Ignora URL inválida e segue fallback texto simples.
      }
    }

    return {
      code: trimmedData,
      name: '',
      className: '',
    };
  };

  useEffect(() => {
    if (!videoRef.current) return;

    const scannerInstance = new QrScanner(
      videoRef.current,
      async (result) => {
        try {
          if (!isScanningRef.current) {
            return;
          }

          const rawData = typeof result === 'string' ? result : String(result?.data || '');
          const student = parseStudentPayload(rawData);

          if (!student?.code) {
            setScannerStatus('QR inválido detectado. Aguardando novo cartão...');
            return;
          }

          isScanningRef.current = false;
          setIsScanning(false);
          setScannerStatus(`QR lido: ${student.code}. A validar...`);
          scannerInstance.pause();

          try {
            const entryResult = await saveStudentEntry(student);
            const entryType = entryResult?.[0]?.tipo || 'entrada';

            setStudents((prev) => {
              const nextStudent = {
                code: student.code,
                name: student.name || student.code,
                className: student.className || 'Turma não informada',
              };

              const existingIndex = prev.findIndex((item) => item.code === nextStudent.code);

              if (existingIndex >= 0) {
                const next = [...prev];
                next.splice(existingIndex, 1);
                return [nextStudent, ...next].slice(0, 10);
              }

              return [nextStudent, ...prev].slice(0, 10);
            });

            setScannerStatus(`${entryType === 'saida' ? 'Saída' : 'Entrada'} validada e registada.`);
            toast({
              title: 'Sucesso!',
              description: `${entryType === 'saida' ? 'Saída' : 'Entrada'} registada: ${student.name || student.code}${student.className ? ` - ${student.className}` : ''}`,
              className: 'bg-[#2ecc71] text-white border-none',
            });
          } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao guardar registo.';
            setScannerStatus(`Falha no registo: ${errorMessage}`);
            toast({
              title: 'Erro no Registo',
              description: `Não foi possível registar ${student.name || student.code}. ${errorMessage}`,
              variant: 'destructive',
            });
          } finally {
            setTimeout(() => {
              isScanningRef.current = true;
              setIsScanning(true);
              setScannerStatus('Scanner pronto. Aguardando cartão...');
              scannerInstance.start().catch((restartError) => {
                console.error('Falha ao reiniciar scanner:', restartError);
                setScannerStatus('Falha ao reiniciar câmera. Verifique permissões.');
              });
            }, 1200);
          }
        } catch (callbackError) {
          console.error('Erro interno no callback do scanner:', callbackError);
          setScannerStatus('Erro interno no scanner. Recarregue a página.');
        }
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
        returnDetailedScanResult: true,
        onDecodeError: () => {
          // Não interrompe o fluxo; QR inválido é comum durante foco da câmera.
        },
      }
    );

    scannerInstance.start()
      .then(() => {
        setCameraReady(true);
        setScannerStatus('Scanner ativo. Aguardando cartão...');
      })
      .catch((error: unknown) => {
        console.error('Falha ao iniciar câmera:', error);
        setCameraReady(false);
        setScannerStatus('Câmera indisponível ou sem permissão.');
        toast({
          title: 'Erro da Câmera',
          description: 'Não foi possível iniciar a câmera. Verifique as permissões do navegador.',
          variant: 'destructive',
        });
      });

    scannerRef.current = scannerInstance;

    return () => {
      isScanningRef.current = false;
      setIsScanning(false);
      setCameraReady(false);
      scannerRef.current = null;
      scannerInstance.destroy();
    };
  }, [toast]);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-md card overflow-hidden">
        <div className="border-b border-[#2e5a6e] p-6 text-center">
          <div className="w-16 h-16 bg-[#2ecc71]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
             <ScanLine className="h-8 w-8 text-[#2ecc71]" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Scanner EduGuard
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Posicione o cartão do aluno na câmara</p>
        </div>

        <div className="p-6">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center shadow-inner border border-white/10">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />
            {!cameraReady && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-center px-4">
                <p className="text-xs text-gray-300">A inicializar câmera...</p>
              </div>
            )}
            {/* Visual overlay for scanning status */}
            <div className={`absolute inset-0 border-4 transition-colors duration-300 pointer-events-none ${isScanning ? 'border-blue-500/50' : 'border-[#2ecc71]/80'}`}></div>
          </div>

          <div className="mt-8">
            <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-xs text-gray-300">Estado: {scannerStatus}</p>
            </div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                Últimos Registos
              </h2>
              <span className="bg-[#2ecc71]/10 text-[#2ecc71] border border-[#2ecc71]/20 text-xs px-2 py-1 rounded-full font-medium">
                {students.length} hoje
              </span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {students.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                  <AlertCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">A aguardar leitura de cartão...</p>
                </div>
              ) : (
                students.map((s, index) => (
                  <div
                    key={`${s.code}-${index}`}
                    className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2"
                  >
                    <CheckCircle2 className="h-5 w-5 text-[#2ecc71] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-white leading-tight">{s.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.className}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScannerPro;