// src/pages/system/QRScanner.tsx
import React, { useState } from 'react';
import QrScanner from 'react-qr-scanner';
import { Button } from '@/components/ui/button'; // botão estilizado do seu sistema
import { toast } from '@/components/ui/toaster'; // para mensagens toast do seu tema

const QRScanner: React.FC = () => {
  const [result, setResult] = useState<string>('Nenhum QR code lido ainda');
  const [error, setError] = useState<string>('');

  const previewStyle: React.CSSProperties = {
    height: 350,
    width: 350,
    borderRadius: '12px',
    border: '2px solid #ccc',
  };

  const handleScan = (data: string | null) => {
    if (data) {
      setResult(data);
      setError('');
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    setError('Erro ao acessar a câmera. Verifique as permissões do navegador.');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    toast({
      title: 'Copiado!',
      description: 'O resultado do QR code foi copiado para a área de transferência.',
    });
  };

  return (
    <div className="flex flex-col items-center justify-start mt-10 gap-6">
      <h1 className="text-2xl font-bold">Scanner de QR Code</h1>

      {error ? (
        <div className="text-red-600 font-semibold">{error}</div>
      ) : (
        <QrScanner
          delay={300}
          style={previewStyle}
          onError={handleError}
          onScan={handleScan}
        />
      )}

      <div className="flex flex-col items-center gap-2">
        <div className="bg-gray-100 p-3 rounded-md w-80 text-center break-words">
          <strong>Resultado:</strong> {result}
        </div>
        <Button onClick={handleCopy} disabled={!result || result === 'Nenhum QR code lido ainda'}>
          Copiar Resultado
        </Button>
      </div>
    </div>
  );
};

export default QRScanner;