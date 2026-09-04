import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

import Link from "next/link";

export default async function RankingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Fetch players with at least 1 match played OR an existing average points (from previous season)
  const players = await prisma.user.findMany({
    where: { 
      OR: [
        { totalMatches: { gt: 0 } },
        { averagePoints: { gt: 0 } }
      ]
    },
    orderBy: { averagePoints: 'desc' }
  });

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black text-club-green flex items-center gap-3">
            <span className="text-4xl">🏆</span> Classement APT
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            {activeSeason?.name || 'Saison en cours'} - Actualisé après chaque session
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rang</th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Joueur</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-club-green uppercase tracking-wider">Moyenne pts</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-emerald-600 uppercase tracking-wider hidden sm:table-cell">Tops</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-red-600 uppercase tracking-wider hidden sm:table-cell">Flops</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Sessions</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Matchs</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Points Totaux</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {players.map((player, index: number) => {
                const isCurrentUser = player.id === user.id;
                
                return (
                  <tr 
                    key={player.id} 
                    className={`${isCurrentUser ? 'bg-green-50' : 'hover:bg-slate-50'} transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-club-green font-bold text-sm shadow-sm border border-slate-200">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-lg font-black tracking-tight ${isCurrentUser ? 'text-club-green' : 'text-slate-800'} transition-colors inline-block`}>
                        <Link 
                          href={`/profile/${player.id}`} 
                          title="Voir le profil et les statistiques" 
                          className="flex items-center gap-3 group hover:opacity-80 transition-opacity"
                        >
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className={`uppercase ${isCurrentUser ? 'group-hover:text-emerald-700' : 'group-hover:text-club-green'} transition-colors flex items-center gap-1`}>
                              {(player.stars || 0) > 0 && <span className="text-club-gold drop-shadow-sm">{'⭐'.repeat(player.stars)}</span>}
                              {player.nickname || player.name}
                            </span>
                            {player.nickname && (
                              <span className="text-xs font-medium text-slate-400 normal-case">
                                {player.name}
                              </span>
                            )}
                          </div>
                          
                          {/* Stat Graph Icon */}
                          <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-slate-50 text-slate-400 rounded-full shadow-sm border border-slate-200 group-hover:bg-club-green group-hover:text-white group-hover:border-club-green transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                              <line x1="18" y1="20" x2="18" y2="10"></line>
                              <line x1="12" y1="20" x2="12" y2="4"></line>
                              <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                          </span>
                        </Link>
                      </div>
                      {isCurrentUser && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-club-green text-white">C'est vous</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="text-xl font-black text-club-green tabular-nums">{player.averagePoints.toFixed(2).replace('.', ',')}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold hidden sm:table-cell">
                      {player.tops > 0 ? <span className="text-emerald-600">{player.tops}</span> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold hidden sm:table-cell">
                      {player.flops > 0 ? <span className="text-red-600">{player.flops}</span> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-slate-500 font-bold hidden md:table-cell tabular-nums">
                      {Math.round(player.totalMatches / 3)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-slate-500 font-bold hidden md:table-cell tabular-nums">
                      {player.totalMatches}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-slate-500 font-bold hidden md:table-cell tabular-nums">
                      {Math.floor(player.points)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
