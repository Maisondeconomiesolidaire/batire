import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Les photos de matériaux partaient brutes, à 4 ou 5 Mo pièce : elles sont
 * ramenées à 1600 px de côté avant l'envoi. Sans encodeur WebP (Safari),
 * `toBlob` rend un PNG plus lourd que l'original : on se replie alors sur le
 * JPEG. Les PDF et autres fichiers passent tels quels.
 */
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.78;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close?.();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const encode = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    let blob = await encode("image/webp", WEBP_QUALITY);
    if (blob && blob.type !== "image/webp") {
      blob = (await encode("image/jpeg", JPEG_QUALITY)) ?? blob;
    }
    if (!blob || blob.size >= file.size) return file;
    const extension = blob.type === "image/webp" ? ".webp" : blob.type === "image/jpeg" ? ".jpg" : ".png";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + extension, { type: blob.type });
  } catch {
    return file;
  }
}

/** Envoi de photos vers le stockage Convex, une par une (compressées au passage). */
export function useUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (files: File[]): Promise<Id<"_storage">[]> => {
      setUploading(true);
      try {
        const ids: Id<"_storage">[] = [];
        for (const original of files) {
          const file = await compressImage(original);
          const url = await generateUploadUrl();
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!response.ok) throw new Error(`Envoi de « ${file.name} » impossible.`);
          const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
          ids.push(storageId);
        }
        return ids;
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl],
  );

  return { upload, uploading };
}

export function useAnalyzePhotos() {
  return useAction(api.batire.analyzeMaterialPhotos);
}
