// src/pages/system/QRScanner.tsx
import React, { useState } from 'react';
import QrScanner from 'react-qr-scanner';

const QRScanner: React.FC = () => {
  const [result, setResult] = useState<string>('Nenhum QR code lido ainda');

  // Configurações da câmera (opcional)
  const previewStyle: React.CSSProperties = {
    height: 300,
    width: 300,
  };

  const handleScan = (data: string | null) => {
    if (data) {
      setResult(data);
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    setResult('Erro ao acessar a câmera');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
      <h1>Scanner de QR Code</h1>
      <QrScanner
        delay={300}          // intervalo de leitura em ms
        style={previewStyle} // tamanho do preview
        onError={handleError}
        onScan={handleScan}
      />
      <div>
        <strong>Resultado:</strong> {result}
      </div>
    </div>
  );
};

export default QRScanner;