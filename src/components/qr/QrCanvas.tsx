import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QrCanvas({ value }: { value: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    }).then(setSrc);
  }, [value]);

  return src ? <img src={src} alt="Attendance QR code" className="qr-image" /> : <div className="qr-placeholder" />;
}
