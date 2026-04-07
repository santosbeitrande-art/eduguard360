// src/pages/system/QRScannerAvancado.tsx
import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';

interface QRScannerAvancadoProps {
  dashboardType?: 'parent' | 'admin' | 'school';
}

const QRScannerAvancado: React.FC<QRScannerAvancadoProps> = ({ dashboardType }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let interval: number;

    const startScanner = async () => {
      try {
        if (!videoRef.current) return;

        const devices = await codeReader.listVideoInputDevices();
        const selectedDevice = devices[0]?.deviceId;
        if (!selectedDevice) {
          setError('Nenhuma câmera encontrada');
          return;
        }

        codeReader.decodeFromVideoDevice(selectedDevice, videoRef.current, (result: Result | undefined) => {
          if (result && !results.includes(result.getText())) {
            setResults(prev => [...prev, result.getText()]);
            toast({
              title: 'QR Code Detectado!',
              description: result.getText(),
            });
          }
        });
      } catch (err) {
        console.error(err);
        setError('Erro ao acessar a câmera');
      }
    };

    startScanner();

    return () => {
      codeReader.reset();
      clearInterval(interval);
    };
  }, [results]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(results.join('\n'));
    toast({
      title: 'Copiado!',
      description: 'Todos os QR codes detectados foram copiados.',
    });
  };

  return (
    <div className="flex flex-col items-center gap-6 mt-10">
      <h1 className="text-2xl font-bold">Scanner Avançado de QR Codes</h1>

      {error && <div className="text-red-600 font-semibold">{error}</div>}

      <video
        ref={videoRef}
        className="rounded-xl border-2 border-gray-300"
        style={{ width: 350, height: 350 }}
        muted
      />

      <div className="flex flex-col items-center gap-2 w-80">
        <div className="bg-gray-100 p-3 rounded-md text-center break-words w-full">
          <strong>Resultados:</strong>
          <ul className="list-disc list-inside">
            {results.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        <Button onClick={handleCopyAll} disabled={results.length === 0}>
          Copiar Todos
        </Button>
      </div>

      {dashboardType && (
        <div className="mt-4 text-sm text-gray-500">
          Integrado ao dashboard: <strong>{dashboardType}</strong>
        </div>
      )}
    </div>
  );
};

export default QRScannerAvancado;