import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** QR que lleva a la sala. Se muestra cuando está listo. */
export function RoomQr({ code, url }: { code: string; url: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toString(url, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#141414', light: '#FFFFFF' },
    }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [url]);

  if (!svg) return <div className="qr qr--loading" aria-hidden="true" />;
  return (
    <div
      className="qr"
      role="img"
      aria-label={`QR de la sala ${code}`}
      data-url={url}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
