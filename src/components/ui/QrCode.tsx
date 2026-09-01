import { useMemo } from "react";
import QRCode from "qrcode";

/**
 * QR code rendu en SVG vectoriel : il reste net à l'impression quelle que soit
 * sa taille, et prend la couleur du texte courant. Une image matricielle, elle,
 * ressort floue dès qu'on l'imprime plus grande que ses pixels.
 */
export function QrCode({
  value,
  size = 128,
  margin = 2,
  className,
}: {
  value: string;
  /** Nombre = pixels, chaîne = unité CSS (« 22mm »). */
  size?: number | string;
  /** Zone de silence, en modules. Sans elle, le code se lit mal. */
  margin?: number;
  className?: string;
}) {
  const qr = useMemo(() => {
    if (!value) return null;
    try {
      const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
      const count = modules.size;
      const data = modules.data;
      // Un seul `path` plutôt qu'un rect par module : plus léger à imprimer.
      let path = "";
      for (let row = 0; row < count; row += 1) {
        for (let col = 0; col < count; col += 1) {
          if (data[row * count + col]) {
            path += `M${col + margin} ${row + margin}h1v1h-1z`;
          }
        }
      }
      return { path, extent: count + margin * 2 };
    } catch {
      return null;
    }
  }, [value, margin]);

  if (!qr) return null;

  const cssSize = typeof size === "number" ? `${size}px` : size;

  return (
    <svg
      viewBox={`0 0 ${qr.extent} ${qr.extent}`}
      style={{ width: cssSize, height: cssSize }}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code ${value}`}
      className={className}
    >
      <path d={qr.path} fill="currentColor" />
    </svg>
  );
}
