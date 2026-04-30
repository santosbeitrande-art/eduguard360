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
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [scanner, setScanner] = useState<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;

    const scannerInstance = new QrScanner(
      videoRef.current,
      async (result) => {
        try {
          // Temporarily pause scanning to avoid multiple requests
          if (!isScanning) return;
          setIsScanning(false);

          const student: Student = JSON.parse(result.data);

          const exists = students.find(
            (s) => s.code === student.code
          );

          if (!exists) {
            setStudents((prev) => [student, ...prev]);

            try {
                const entryResult = await saveStudentEntry(student);
                const entryType = entryResult?.[0]?.tipo || 'entrada';
                toast({
                  title: "Sucesso!",
                  description: `${entryType === 'saida' ? 'Saída' : 'Entrada'} registada: ${student.name} - ${student.className}`,
                  className: "bg-[#2ecc71] text-white border-none",
                });
              } catch (error) {
                console.error(error);
                toast({
                  title: "Erro no Registo",
                  description: `Não foi possível registar ${student.name}. Tente novamente.`,
                  variant: "destructive",
                });
              }
            }
        } catch {
          console.warn("QR inválido ou não formatado corretamente.");
          setTimeout(() => setIsScanning(true), 2000);
        }
      },
      {
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );

    scannerInstance.start();
    setScanner(scannerInstance);

    return () => {
      scannerInstance.destroy();
    };
  }, [students, isScanning, toast]);

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
            />
            {/* Visual overlay for scanning status */}
            <div className={`absolute inset-0 border-4 transition-colors duration-300 pointer-events-none ${isScanning ? 'border-blue-500/50' : 'border-[#2ecc71]/80'}`}></div>
          </div>

          <div className="mt-8">
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