import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Envoi de photos vers le stockage Convex.
 *
 * Les fichiers partent un par un : sur un dépôt, la connexion est souvent
 * médiocre, et un lot entier qui échoue à cause d'une seule photo ferait
 * recommencer toute la saisie.
 */
export function useUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (files: File[]): Promise<Id<"_storage">[]> => {
      setUploading(true);
      try {
        const ids: Id<"_storage">[] = [];
        for (const file of files) {
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
