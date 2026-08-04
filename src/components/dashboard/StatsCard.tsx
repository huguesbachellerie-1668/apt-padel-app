import React from 'react';

interface StatsCardProps {
  user: {
    id: string;
    averagePoints: number;
    totalMatches: number;
    tops: number;
    flops: number;
  };
  rank: string;
}

export default function StatsCard({ user, rank }: StatsCardProps) {
  return (
    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="text-2xl">📊</span> Mes Statistiques
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-indigo-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-indigo-100">
          <span className="text-sm text-indigo-600 font-semibold mb-1">Classement</span>
          <span className="text-3xl font-black text-indigo-900">{rank !== '-' ? `#${rank}` : rank}</span>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-blue-100">
          <span className="text-sm text-blue-600 font-semibold mb-1">Moyenne</span>
          <span className="text-3xl font-black text-blue-900">{user.averagePoints.toFixed(2).replace('.', ',')}</span>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-orange-100">
          <span className="text-sm text-orange-600 font-semibold mb-1">Sessions jouées</span>
          <span className="text-3xl font-black text-orange-900">{Math.floor(user.totalMatches / 3)}</span>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-green-100">
          <span className="text-sm text-green-600 font-semibold mb-1">TOP (Invaincu)</span>
          <span className="text-3xl font-black text-green-700">{user.tops}</span>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-red-100">
          <span className="text-sm text-red-600 font-semibold mb-1">FLOP (3 Défaites)</span>
          <span className="text-3xl font-black text-red-700">{user.flops}</span>
        </div>
        <a href={`/profile/${user.id}`} className="bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-md transform transition-transform hover:scale-105 border border-gray-900">
          <span className="text-2xl mb-1">👤</span>
          <span className="text-xs text-white uppercase font-black tracking-widest text-center mt-1">Stats Complètes</span>
        </a>
      </div>
    </section>
  );
}
