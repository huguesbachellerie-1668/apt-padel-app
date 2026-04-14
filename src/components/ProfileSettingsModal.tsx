'use client'

import { useState } from 'react';
import { updateMyProfile, updateMyPassword } from '@/app/profileActions';
import SubmitButton from './SubmitButton';

export default function ProfileSettingsModal({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('infos');
  const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' });
  const [showPwd, setShowPwd] = useState(false);

  async function handleProfile(formData: FormData) {
      setProfileMsg({ text: '', type: '' });
      const res = await updateMyProfile(formData);
      if (res.error) {
          setProfileMsg({ text: res.error, type: 'error' });
      } else {
          setProfileMsg({ text: 'Profil mis à jour !', type: 'success' });
          setTimeout(() => setIsOpen(false), 2000);
      }
  }

  async function handlePassword(formData: FormData) {
      setPwdMsg({ text: '', type: '' });
      const res = await updateMyPassword(formData);
      if (res.error) {
          setPwdMsg({ text: res.error, type: 'error' });
      } else {
          setPwdMsg({ text: res.message || 'Mot de passe modifié !', type: 'success' });
          (document.getElementById('pwdForm') as HTMLFormElement).reset();
      }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="ml-2 w-8 h-8 rounded-full bg-blue-800 hover:bg-orange-500 text-white flex items-center justify-center transition-colors shadow-sm"
        title="Mon Profil"
      >
        <span className="text-xl leading-none" style={{ position: 'relative', top: '-1px' }}>👤</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-gray-800 max-h-[90vh]">
            <div className="bg-blue-900 text-white p-5 flex justify-between items-center shrink-0">
                <h2 className="font-black text-xl flex items-center gap-2">👤 Mon Espace Joueur</h2>
                <button onClick={() => setIsOpen(false)} className="text-blue-300 hover:text-white text-3xl leading-none">&times;</button>
            </div>

            <div className="flex border-b border-gray-100 bg-gray-50 shrink-0">
                <button onClick={() => setActiveTab('infos')} className={`flex-1 py-3 font-bold text-sm tracking-wide ${activeTab === 'infos' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}>
                    Mes Infos
                </button>
                <button onClick={() => setActiveTab('security')} className={`flex-1 py-3 font-bold text-sm tracking-wide ${activeTab === 'security' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}>
                    Mot de passe
                </button>
            </div>

            <div className="p-6 overflow-y-auto">
                {activeTab === 'infos' && (
                    <form action={handleProfile} className="flex flex-col gap-4">
                        {profileMsg.text && (
                            <div className={`p-3 rounded-xl text-sm font-bold text-center ${profileMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                                {profileMsg.text}
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Prénom & Nom *</label>
                            <input name="name" type="text" defaultValue={user.name} required className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-900 transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Surnom</label>
                            <input name="nickname" type="text" defaultValue={user.nickname || ''} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-900 transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email pour la connexion</label>
                            <input name="email" type="email" defaultValue={user.email || ''} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-900 transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Téléphone</label>
                            <input name="phone" type="tel" defaultValue={user.phone || ''} className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-white text-gray-900 transition-colors" />
                        </div>
                        <SubmitButton pendingText="Enregistrement..." className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-transform hover:scale-[1.02]">
                            Sauvegarder
                        </SubmitButton>
                    </form>
                )}

                {activeTab === 'security' && (
                    <form id="pwdForm" action={handlePassword} className="flex flex-col gap-4">
                        {pwdMsg.text && (
                            <div className={`p-3 rounded-xl text-sm font-bold text-center ${pwdMsg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
                                {pwdMsg.text}
                            </div>
                        )}
                        <div className="relative">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Mot de passe actuel *</label>
                            <input name="currentPassword" type={showPwd ? "text" : "password"} required className="w-full p-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none bg-white text-gray-900 transition-colors" />
                        </div>
                        <div className="relative">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nouveau mot de passe *</label>
                            <input name="newPassword" type={showPwd ? "text" : "password"} required minLength={6} className="w-full p-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none bg-white text-gray-900 transition-colors" />
                            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute bottom-3 right-4 text-gray-400 hover:text-orange-500 focus:outline-none text-xl" title={showPwd ? "Cacher" : "Afficher"}>
                                {showPwd ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl mt-2">
                            <p className="text-xs text-orange-800 font-medium">En cas d'oubli critique, un membre du Bureau peut toujours réinitialiser votre compte sur le mot de passe standard.</p>
                        </div>
                        <SubmitButton pendingText="Modification..." className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-transform hover:scale-[1.02]">
                            Changer le mot de passe
                        </SubmitButton>
                    </form>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
