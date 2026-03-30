'use client'

import { useState } from 'react';
import { updatePlayer, resetPasswordToDefault } from './actions';
import SubmitButton from '@/components/SubmitButton';

export default function AdminPlayerList({ players, user }: { players: any[], user: any }) {
  const [search, setSearch] = useState('');
  
  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.nickname && p.nickname.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 mt-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span>✏️</span> Modifier les joueurs existants ({filteredPlayers.length} / {players.length})
      </h2>

      <div className="relative mb-6">
        <span className="absolute left-4 top-3 text-xl">🔍</span>
        <input 
          type="text" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Rechercher un joueur..." 
          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none shadow-sm text-lg font-medium"
        />
      </div>

      <div className="space-y-4">
        {filteredPlayers.map((player: any) => {
          const isTargetPresident = player.role === 'PRESIDENT';
          const canEdit = user.role === 'PRESIDENT' || !isTargetPresident;

          return (
            <form key={player.id} action={updatePlayer} className={`flex flex-col gap-4 p-5 md:p-6 mb-5 rounded-3xl border transition-all shadow-sm ${!canEdit ? 'bg-gray-50 border-gray-200 opacity-80' : 'bg-white hover:border-blue-300 border-gray-200 hover:shadow-md'}`}>
              <input type="hidden" name="id" value={player.id} />
              
              <div className="flex flex-wrap gap-4 items-start">
                  <div className="flex-[2] min-w-[200px]">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Nom</label>
                      <input name="name" type="text" defaultValue={player.name} disabled={!canEdit} required className="w-full p-3.5 border-2 border-gray-200 rounded-xl font-bold text-base bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 transition-colors" />
                  </div>
                  <div className="flex-[1.5] min-w-[150px]">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Surnom</label>
                      <input name="nickname" type="text" defaultValue={player.nickname || ''} disabled={!canEdit} className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 transition-colors" />
                  </div>
                  <div className="flex-[1.5] min-w-[150px]">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Rôle</label>
                      <select name="role" defaultValue={player.role} disabled={!canEdit} className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-sm font-bold bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-gray-800 disabled:bg-gray-100 transition-colors">
                        <option value="JOUEUR">Joueur</option>
                        <option value="ORGA">Vice-Président</option>
                        <option value="TRESORIER">Trésorier</option>
                        {(user.role === 'PRESIDENT' || player.role === 'PRESIDENT') && <option value="PRESIDENT">Président</option>}
                      </select>
                  </div>
                  <div className="w-24">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Points</label>
                      <input name="points" type="number" step="0.01" defaultValue={player.points} disabled={!canEdit} className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white font-black text-center text-orange-600 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100 transition-colors" title="Points totaux" />
                  </div>
                  <div className="w-24">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Sessions</label>
                      <input name="sessions" type="number" defaultValue={Math.floor((player.totalMatches || 0) / 3)} disabled={!canEdit} className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-white text-center font-bold text-blue-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 transition-colors" title="Sessions jouées" />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                      <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Inscription</label>
                      <input name="createdAt" type="date" defaultValue={player.createdAt ? new Date(player.createdAt).toISOString().split('T')[0] : ''} disabled={!canEdit} className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-sm font-bold bg-white text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 transition-colors" title="Date d'inscription" />
                  </div>
              </div>

              <div className="flex flex-wrap justify-between items-end gap-4 mt-2 pt-5 border-t-2 border-gray-100">
                  <div className="flex flex-wrap gap-4 w-full md:w-auto">
                      <div className="w-36">
                          <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5 flex items-center gap-1">Historique <span className="text-blue-500">23/24</span></label>
                          <input name="hist2324" type="number" step="0.01" defaultValue={(player as any).historicalStats?.['2023-2024'] || ''} disabled={!canEdit} className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-blue-50/30 font-bold focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 transition-colors" placeholder="Vide" />
                      </div>
                      <div className="w-36">
                          <label className="text-xs font-bold text-gray-400 uppercase block mb-1.5 flex items-center gap-1">Historique <span className="text-blue-500">24/25</span></label>
                          <input name="hist2425" type="number" step="0.01" defaultValue={(player as any).historicalStats?.['2024-2025'] || ''} disabled={!canEdit} className="w-full p-3.5 border-2 border-gray-200 rounded-xl text-base bg-blue-50/30 font-bold focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 transition-colors" placeholder="Vide" />
                      </div>
                  </div>
                  <div className="w-full md:w-auto flex justify-end gap-3 items-center">
                      <SubmitButton pendingText="⏳" formAction={resetPasswordToDefault.bind(null, player.id)} disabled={!canEdit} className="bg-white text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300 border-2 border-gray-200 font-bold py-3.5 px-4 rounded-xl text-sm shadow-sm transition-all disabled:opacity-50" title="Remettre le mot de passe sur Apt2026!">
                        Reset Mdp 🔑
                      </SubmitButton>
                      <SubmitButton pendingText="⏳" disabled={!canEdit} className="bg-blue-600 disabled:bg-gray-400 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl text-sm shadow-md transition-transform hover:scale-105 border-b-4 border-blue-800 active:border-b-0 active:mt-[4px] disabled:border-b-0 disabled:transform-none">
                        Enregistrer ✔️
                      </SubmitButton>
                  </div>
              </div>
            </form>
          );
        })}  
      </div>
    </div>
  );
}
