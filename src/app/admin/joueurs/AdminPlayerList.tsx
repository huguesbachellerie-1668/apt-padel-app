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
            <form key={player.id} action={updatePlayer} className={`flex flex-wrap md:flex-nowrap gap-3 items-center p-4 rounded-2xl border transition-colors shadow-sm ${!canEdit ? 'bg-gray-100 border-gray-200 opacity-80' : 'bg-gray-50 hover:bg-blue-50/50 border-gray-100'}`}>
              <input type="hidden" name="id" value={player.id} />
              
              <div className="w-full md:w-[22%]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase md:hidden block mb-1">Nom</label>
                  <input name="name" type="text" defaultValue={player.name} disabled={!canEdit} required className="w-full p-2.5 border border-gray-200 rounded-lg font-bold text-sm bg-white focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
              </div>
              <div className="w-1/2 md:w-[15%]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase md:hidden block mb-1">Surnom</label>
                  <input name="nickname" type="text" defaultValue={player.nickname || ''} disabled={!canEdit} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
              </div>
              <div className="w-1/2 md:w-[18%]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase md:hidden block mb-1">Rôle</label>
                  <select name="role" defaultValue={player.role} disabled={!canEdit} className="w-full p-2.5 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:outline-none focus:border-blue-400 text-gray-700 disabled:bg-gray-50">
                    <option value="JOUEUR">Joueur</option>
                    <option value="ORGA">Vice-Président</option>
                    <option value="TRESORIER">Trésorier</option>
                    {(user.role === 'PRESIDENT' || player.role === 'PRESIDENT') && <option value="PRESIDENT">Président</option>}
                  </select>
              </div>
              <div className="w-1/4 md:w-[12%]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase md:hidden block mb-1">Points</label>
                  <input name="points" type="number" step="0.01" defaultValue={player.points} disabled={!canEdit} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white font-black text-center text-orange-600 focus:outline-none focus:border-orange-400 disabled:bg-gray-50" title="Points totaux" />
              </div>
              <div className="w-1/4 md:w-[12%]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase md:hidden block mb-1">Sessions</label>
                  <input name="sessions" type="number" defaultValue={Math.floor((player.totalMatches || 0) / 3)} disabled={!canEdit} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white text-center font-bold text-blue-800 focus:outline-none focus:border-blue-400 disabled:bg-gray-50" title="Sessions jouées" />
              </div>
              <div className="w-1/2 md:w-[16%]">
                  <label className="text-[10px] font-bold text-gray-400 uppercase md:hidden block mb-1">Inscription</label>
                  <input name="createdAt" type="date" defaultValue={player.createdAt ? new Date(player.createdAt).toISOString().split('T')[0] : ''} disabled={!canEdit} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 font-bold focus:outline-none focus:border-blue-400 disabled:bg-gray-50 uppercase" title="Date d'inscription" />
              </div>
              <div className="w-full mt-2 pt-3 border-t border-gray-100 flex flex-wrap md:flex-nowrap justify-between items-end gap-4">
                  <div className="flex gap-3 w-full md:w-auto">
                      <div className="flex-1 md:w-28">
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Moyenne 23/24</label>
                          <input name="hist2324" type="number" step="0.01" defaultValue={(player as any).historicalStats?.['2023-2024'] || ''} disabled={!canEdit} className="w-full p-2 border border-blue-100 rounded-lg text-sm bg-blue-50/50 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder="Vide" />
                      </div>
                      <div className="flex-1 md:w-28">
                          <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Moyenne 24/25</label>
                          <input name="hist2425" type="number" step="0.01" defaultValue={(player as any).historicalStats?.['2024-2025'] || ''} disabled={!canEdit} className="w-full p-2 border border-blue-100 rounded-lg text-sm bg-blue-50/50 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50" placeholder="Vide" />
                      </div>
                  </div>
                  <div className="w-full md:w-auto flex justify-end gap-2 items-center">
                      <SubmitButton pendingText="⏳" formAction={resetPasswordToDefault.bind(null, player.id)} disabled={!canEdit} className="bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-700 hover:border-red-200 border border-transparent font-bold py-2 px-3 rounded-xl text-xs shadow-sm transition-all disabled:opacity-50" title="Remettre le mot de passe sur Apt2026!">
                        Reset Mdp 🔑
                      </SubmitButton>
                      <SubmitButton pendingText="⏳" disabled={!canEdit} className="bg-blue-600 disabled:bg-gray-400 hover:bg-blue-700 text-white font-bold py-2 px-4 md:px-6 rounded-xl text-sm shadow-sm transition-transform hover:scale-105 border-b-4 border-blue-800 active:border-b-0 active:mt-[4px] disabled:border-b-0 disabled:transform-none">
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
