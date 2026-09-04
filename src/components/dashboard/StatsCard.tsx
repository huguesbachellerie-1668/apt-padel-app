import React from 'react';
import { BarChart2, User as UserIcon } from 'lucide-react';

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
    <section className="card-club rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-club-green opacity-5 rounded-full blur-3xl"></div>
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
        <BarChart2 className="text-club-green" size={24} /> Mes Statistiques
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200 shadow-sm">
          <span className="text-sm text-slate-500 font-semibold mb-1">Classement</span>
          <span className="text-3xl font-black text-club-green tabular-nums">{rank !== '-' ? `#${rank}` : rank}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200 shadow-sm">
          <span className="text-sm text-slate-500 font-semibold mb-1">Moyenne</span>
          <span className="text-3xl font-black text-club-green tabular-nums">{user.averagePoints.toFixed(2).replace('.', ',')}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200 shadow-sm">
          <span className="text-sm text-slate-500 font-semibold mb-1">Sessions</span>
          <span className="text-3xl font-black text-slate-800 tabular-nums">{Math.floor(user.totalMatches / 3)}</span>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-emerald-200 shadow-sm">
          <span className="text-sm text-emerald-700 font-semibold mb-1">TOP (Invaincu)</span>
          <span className="text-3xl font-black text-emerald-600 tabular-nums">{user.tops}</span>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-red-200 shadow-sm">
          <span className="text-sm text-red-700 font-semibold mb-1">FLOP (3 Défaites)</span>
          <span className="text-3xl font-black text-red-600 tabular-nums">{user.flops}</span>
        </div>
        <a href={`/profile/${user.id}`} className="bg-slate-50 hover:bg-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm transform transition-transform hover:scale-105 border border-slate-200">
          <UserIcon className="text-slate-500 mb-1" size={28} />
          <span className="text-xs text-slate-600 uppercase font-black tracking-widest text-center mt-1">Stats Complètes</span>
        </a>
      </div>
    </section>
  );
}
