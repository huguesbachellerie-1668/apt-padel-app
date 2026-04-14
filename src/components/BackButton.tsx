'use client'

import { useRouter } from 'next/navigation';

export default function BackButton({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.history.length > 2) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <button 
      onClick={handleBack} 
      className="text-blue-500 font-bold hover:text-blue-700 hover:underline mb-2 inline-flex items-center gap-1 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
      Retour
    </button>
  );
}
