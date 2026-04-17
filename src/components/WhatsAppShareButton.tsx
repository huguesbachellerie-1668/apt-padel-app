"use client";

import { useState } from 'react';
import html2canvas from 'html2canvas';

type Props = {
  elementId: string;
  text: string;
  fileName?: string;
  className?: string;
};

export default function WhatsAppShareButton({ elementId, text, fileName = 'partage.png', className }: Props) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;
    try {
      setIsSharing(true);
      
      const element = document.getElementById(elementId);
      if (!element) {
        alert("Section à capturer introuvable. (" + elementId + ")");
        return;
      }

      // Generation de l'image via html2canvas (mieux supporté par Safari/iOS pour la netteté)
      const canvas = await html2canvas(element, {
        scale: 3,
        backgroundColor: "#ffffff",
        ignoreElements: (node) => {
          return node instanceof HTMLElement && node.dataset && 'html2canvasIgnore' in node.dataset;
        }
      });
      
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));

      if (!blob) {
        alert("Erreur: Impossible de générer l'image.");
        setIsSharing(false);
        return;
      }

      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            text: text,
            files: [file],
          });
        } catch (shareError) {
          console.log("Share cancelled", shareError);
        }
      } else {
        // Fallback presse-papier
        try {
          if (navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({
                [blob.type]: blob,
              })
            ]);
            alert("📸 L'image a été copiée dans le presse-papier !\n\nOuvrez WhatsApp Web et faites 'Coller' (Ctrl+V).");
          } else {
             throw new Error("Presse-papier non supporté");
          }
        } catch (clipError) {
           console.error("Erreur copie", clipError);
           // Fallback téléchargement
           const imgUrl = URL.createObjectURL(blob);
           const a = document.createElement("a");
           a.href = imgUrl;
           a.download = fileName;
           a.click();
           URL.revokeObjectURL(imgUrl);
           alert("L'image a été téléchargée (impossible de copier directement). Vous pourrez l'envoyer manuellement.");
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
