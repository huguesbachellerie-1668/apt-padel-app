'use client'

import { useState } from 'react';
import { changePassword } from '../actions';

export default function ChangePasswordForm({ userId }: { userId: string }) {
   const [status, setStatus] = useState<''|'success'|'error'>('');
   const [isPending, setIsPending] = useState(false);

   async function handleSubmit(formData: FormData) {
      setIsPending(true);
      setStatus('');
      try {
         await changePassword(formData);
         setStatus('success');
         (document.getElementById('pwdForm') as HTMLFormElement).reset();
      } catch (e) {
         setStatus('error');
      } finally {
         setIsPending(false);
      }
   }

   return (
      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 mt-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🔒</span> Sécurité : Modifier mon mot de passe
        </h3>
        
        {status === 'success' && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm font-bold border border-green-200">Mot de passe réinitialisé avec succès !</div>}
        {status === 'error' && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-bold border border-red-200">Erreur lors de la mise à jour du mot de passe.</div>}

        <form id="pwdForm" action={handleSubmit} className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <input type="hidden" name="userId" value={userId} />
          <div className="flex-1">
             <label className="text-sm font-bold text-gray-500 mb-2 block uppercase tracking-wider">Nouveau Mot de Passe (min 6)</label>
             <input type="password" name="newPassword" minLength={6} placeholder="••••••••" className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-gray-800 focus:outline-none focus:ring-0 font-bold text-gray-800" required />
          </div>
          <button type="submit" disabled={isPending} className="bg-gray-800 text-white font-bold py-3 px-8 rounded-xl shadow-sm hover:bg-black transition-colors disabled:opacity-50 whitespace-nowrap border-b-4 border-gray-950 active:border-b-0 active:mt-1">
             Sauvegarder
          </button>
        </form>
      </div>
   );
}
