'use client';

import SubmitButton from "@/components/SubmitButton";

export default function DeleteSessionButton() {
  return (
    <SubmitButton 
      pendingText="Suppression..." 
      className="w-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm border border-red-200 hover:border-red-600 transition-all h-full"
      onClick={(e) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer définitivement cette session ? Toutes les données associées seront perdues.")) {
          e.preventDefault();
        }
      }}
    >
      Supprimer la session 🗑️
    </SubmitButton>
  );
}
