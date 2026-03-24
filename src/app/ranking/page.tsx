import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

import Link from "next/link";

export default async function RankingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Fetch players with at least 1 match played, sorted by average points descending
  const players = await prisma.user.findMany({
    where: { totalMatches: { gt: 0 } },
    orderBy: { averagePoints: 'desc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <span className="text-4xl">🏆</span> Classement APT
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Saison en cours - Actualisé après chaque session</p>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-900 to-blue-800">
              <tr>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Rang</th>
                <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Joueur</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-orange-300 uppercase tracking-wider">Moyenne pts</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-green-300 uppercase tracking-wider hidden sm:table-cell">Tops</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-red-300 uppercase tracking-wider hidden sm:table-cell">Flops</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-blue-200 uppercase tracking-wider hidden md:table-cell">Matchs Joués</th>
                <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-blue-200 uppercase tracking-wider hidden md:table-cell">Points Totaux</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {players.map((player: any, index: number) => {
                const isCurrentUser = player.id === user.id;
                
                return (
                  <tr 
                    key={player.id} 
                    className={`${isCurrentUser ? 'bg-orange-50' : 'hover:bg-blue-50'} transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm shadow-sm border border-blue-200">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-lg font-black tracking-tight uppercase ${isCurrentUser ? 'text-orange-700 hover:text-orange-800' : 'text-gray-900 hover:text-blue-600'} transition-colors`}>
                        <Link href={`/profile/${player.id}`} title="Voir le profil et les statistiques">
                          {player.nickname ? player.nickname : player.name}
                        </Link>
                      </div>
                      {player.nickname && (
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          {player.name}
                        </div>
                      )}
                      {isCurrentUser && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-200 text-orange-800">C'est vous</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="text-xl font-black text-blue-700">{player.averagePoints.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-bold hidden sm:table-cell">
                      {player.tops > 0 ? <span className="text-green-600">{player.tops}</span> : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-bold hidden sm:table-cell">
                      {player.flops > 0 ? <span className="text-red-600">{player.flops}</span> : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-bold hidden md:table-cell">
                      {player.totalMatches}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-bold hidden md:table-cell">
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
