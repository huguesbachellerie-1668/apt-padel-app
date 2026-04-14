'use client'

import { useState } from 'react';
import { updateContactInfo } from './actions';
import Link from 'next/link';
import SubmitButton from '@/components/SubmitButton';

export default function DirectoryList({ players, user }: { players: any[], user: any }) {
  const [search, setSearch] = useState('');
  
  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.nickname && p.nickname.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="relative mb-6">
        <span className="absolute left-4 top-3.5 text-xl">🔍</span>
        <input 
          type="text" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Rechercher un joueur (nom, surnom)..." 
          className="w-full pl-12 pr-4 py-3.5 border-2 border-orange-200 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:outline-none shadow-sm text-lg font-medium transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.map((player: any) => (
          <div key={player.id} className={`bg-white rounded-2xl shadow-sm border p-5 transition-shadow ${player.id === user.id ? 'border-orange-300 ring-2 ring-orange-100' : 'border-gray-100 hover:shadow-md'}`}>
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/profile/${player.id}`} className="shrink-0 w-12 h-12 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold text-xl shadow-sm border border-blue-200 hover:bg-blue-200 hover:scale-105 transition-all">
                {(player.nickname || player.name).charAt(0).toUpperCase()}
              </Link>
              <div className="flex-1 px-1">
                <h3 className="font-bold text-gray-900 flex flex-wrap items-center gap-2">
                  <Link href={`/profile/${player.id}`} className="hover:text-blue-600 hover:underline transition-colors flex items-baseline gap-2">
                    <span className="text-lg">{player.nickname || player.name}</span>
                    {player.nickname && <span className="text-sm font-medium text-gray-500">{player.name}</span>}
                  </Link>
                  {player.id === user.id && <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase cursor-default">Vous</span>}
                </h3>
                {player.role !== 'JOUEUR' && <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-bold rounded">{player.role}</span>}
              </div>

              <Link href={`/profile/${player.id}`} className="shrink-0 w-12 h-12 bg-white border-2 border-orange-200 text-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-sm hover:bg-orange-50 hover:scale-105 transition-all" title="Voir les statistiques">
                📊
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                <div className="text-xl font-black text-blue-900">{Math.floor((player.totalMatches || 0) / 3)}</div>
                <div className="text-[10px] font-bold text-blue-600 uppercase">Sessions</div>
              </div>
              <div className="bg-orange-50 p-2 rounded-xl border border-orange-100">
                <div className="text-xl font-black text-orange-900">{(player.averagePoints || 0).toFixed(2)}</div>
                <div className="text-[10px] font-bold text-orange-600 uppercase">Moyenne</div>
              </div>
              <div className="bg-green-50 p-2 rounded-xl border border-green-100">
                <div className="text-sm font-black text-green-900 flex items-center justify-center h-[28px]">
                  {player.createdAt ? new Date(player.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) : 'N/A'}
                </div>
                <div className="text-[10px] font-bold text-green-600 uppercase">Inscrit</div>
              </div>
            </div>

            <div className="space-y-3 text-sm bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-lg">📱</span>
                {player.phone ? (
                  <a href={`tel:${player.phone}`} className="hover:text-blue-600 hover:underline font-medium">{player.phone}</a>
                ) : (
                  <span className="text-gray-400 italic text-xs">Non renseigné</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-lg">📧</span>
                {player.email ? (
                  <a href={`mailto:${player.email}`} className="hover:text-blue-600 hover:underline font-medium break-all">{player.email}</a>
                ) : (
                  <span className="text-gray-400 italic text-xs">Non renseigné</span>
                )}
              </div>
            </div>
            
            
          </div>
        ))}
      </div>
    </>
  );
}
