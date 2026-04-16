"use client";

import { useState } from 'react';

type Props = {
  textToShare: string;
  className?: string;
  label?: string;
};

export default function WhatsAppShareTextButton({ textToShare, className, label = 'Partager en texte brut' }: Props) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing) return;
    try {
      setIsSharing(true);

      if (navigator.share && navigator.canShare && navigator.canShare({ text: textToShare })) {
        try {
          await navigator.share({ title: "APT Padel", text: textToShare });
        } catch (e) {
          console.log("Share cancelled", e);
        }
      } else {
        // Si Web Share n'est pas dispo (PC), on ouvre directement web.whatsapp / wa.me
        const encodedText = encodeURIComponent(textToShare);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
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
      <span>{label}</span>
    </button>
  );
}
