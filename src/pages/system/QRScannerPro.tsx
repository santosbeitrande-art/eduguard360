import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner/qr-scanner.min.js';
import { saveStudentEntry } from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

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

  useEffect(() => {
    if (!videoRef.current) return;

    const scannerInstance = new QrScanner(
      videoRef.current,
      async (result) => {
        try {
          const student: Student = JSON.parse(result.data);

          const exists = students.find(
            (s) => s.code === student.code
          );

          if (!exists) {
            setStudents((prev) => [...prev, student]);

            await saveStudentEntry(student);

            toast({
              title: "Aluno Detectado",
              description: `${student.name} - ${student.className}`,
            });
          }
        } catch {
          console.warn("QR inválido");
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
  }, [students]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Scanner Profissional de Alunos
      </h1>

      <video
        ref={videoRef}
        className="w-full max-w-xl mx-auto border-2 border-blue-500 rounded-lg"
      />

      <div className="mt-4">
        <h2 className="font-semibold">
          Alunos Detectados:
        </h2>

        {students.length === 0 && (
          <p>Nenhum aluno detectado ainda.</p>
        )}

        <ul className="mt-2 space-y-1">
          {students.map((s) => (
            <li
              key={s.code}
              className="p-2 border rounded bg-gray-100"
            >
              {s.name} - {s.className}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default QRScannerPro;