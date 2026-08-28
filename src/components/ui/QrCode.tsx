import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** QR code rendu en data-URL : rien à charger depuis un service externe. */
export function QrCode({ value, size = 128 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(value, { width: size, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) return <div style={{ width: size, height: size }} className="bg-[var(--muted)]" />;
  return <img src={dataUrl} alt={`QR code ${value}`} width={size} height={size} />;
}
