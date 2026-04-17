"use client";

import { useState } from 'react';
import { toBlob } from 'html-to-image';

type Props = {
  elementId?: string;
  elementIds?: string[];
  text: string;
  fileName?: string;
  className?: string;
};

export default function WhatsAppShareButton({ elementId, elementIds, text, fileName = 'partage.png', className }: Props) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;
    try {
      setIsSharing(true);
      
      const targetIds = elementIds || (elementId ? [elementId] : []);
      if (targetIds.length === 0) return setIsSharing(false);

      const files: File[] = [];
      for (let i = 0; i < targetIds.length; i++) {
        const id = targetIds[i];
        const element = document.getElementById(id);
        if (!element) continue;

        // Generation de l'image (html-to-image supporte Tailwind v4 oklch/lab)
        const blob = await toBlob(element, {
          backgroundColor: "#ffffff",
          pixelRatio: 2.5,
          filter: (node) => {
            if (node instanceof HTMLElement && node.dataset && 'html2canvasIgnore' in node.dataset) return false;
            return true;
          }
        });

        if (blob) {
          const name = targetIds.length > 1 ? `poule_${i+1}.png` : fileName;
          files.push(new File([blob], name, { type: 'image/png' }));
        }
      }

      if (files.length === 0) {
        alert("Erreur: Impossible de générer la moindre image.");
        setIsSharing(false);
        return;
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        try {
          await navigator.share({ text: text, files: files });
        } catch (shareError) {
          console.log("Share cancelled", shareError);
        }
      } else {
        // Fallback presse-papier pour UNE seule image (copie native clipboard ne gère qu'un item/blob)
        try {
          if (navigator.clipboard && navigator.clipboard.write && files.length === 1) {
            await navigator.clipboard.write([
              new ClipboardItem({ [files[0].type]: files[0] })
            ]);
            alert("📸 L'image a été copiée dans le presse-papier !\n\nOuvrez WhatsApp Web et faites 'Coller'.");
          } else {
             throw new Error("Presse-papier insuffisant pour gérer plusieurs images ou API non dispo");
          }
        } catch (clipError) {
           console.error("Erreur copie", clipError);
           // Fallback téléchargement multiple
           for(let f of files) {
             const imgUrl = URL.createObjectURL(f);
             const a = document.createElement("a");
             a.href = imgUrl;
             a.download = f.name;
             a.click();
             URL.revokeObjectURL(imgUrl);
           }
           alert(files.length > 1 
            ? "Les " + files.length + " images ont été téléchargées.\n\nVous pouvez maintenant les glisser dans WhatsApp Web."
            : "L'image a été téléchargée. Vous pouvez maintenant la glisser manuellement.");
        }
      }
    } catch (error: any) {
      console.error(error);
      alert("Erreur détaillée : " + (error?.message || String(error)));
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button 
      onClick={handleShare}
      disabled={isSharing}
      type="button"
      className={`inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all ${isSharing ? 'opacity-70 cursor-wait' : ''} ${className || ''}`}
    >
      <span className="text-xl">💬</span> 
      <span>{isSharing ? 'Préparation...' : 'Partager sur le Groupe APT'}</span>
    </button>
  );
}
