import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";

export const revalidate = 3600; // Cache for 1 hour since historical data rarely changes for past seasons

export default async function ArchivesPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const p = await searchParams;

  const allSeasons = await prisma.season.findMany({
    orderBy: { startDate: 'desc' }
  });

  const selectedSeasonId = p.season || allSeasons[0]?.id;
  const selectedSeason = allSeasons.find(s => s.id === selectedSeasonId);

  let ranking: any[] = [];
  
  if (selectedSeason) {
    let usedPrecomputed = false;
    
    // First, check if precomputed final stats exist for this season
    const allUsers = await prisma.user.findMany({ select: { id: true, historicalStats: true } });
    for (const u of allUsers) {
       const hist = u.historicalStats ? (typeof u.historicalStats === 'object' ? u.historicalStats : JSON.parse(u.historicalStats as string)) : {};
       const finalStats = hist[`${selectedSeason.name}_Final`];
       if (finalStats) {
          usedPrecomputed = true;
          ranking.push(finalStats);
       }
    }

    if (!usedPrecomputed) {
      const sessionData = await prisma.session.findMany({
        where: { seasonId: selectedSeason.id, status: 'TERMINEE', isCounted: true },
        include: {
          pools: {
            include: {
              players: { include: { user: true } },
              matches: true
            }
          }
        }
      });

      const userStats: Record<string, any> = {};

      for (const session of sessionData) {
        for (const pool of session.pools) {
          for (const poolPlayer of pool.players) {
            const userId = poolPlayer.userId;
            if (!userStats[userId]) {
              userStats[userId] = {
                id: userId,
                name: poolPlayer.user.name,
                nickname: poolPlayer.user.nickname,
                stars: poolPlayer.user.stars,
                totalMatches: 0,
                validMatches: 0,
                wins: 0,
                points: 0,
                tops: 0,
                flops: 0,
                sessionsCount: 0
              };
            }

            const stats = userStats[userId];
            stats.sessionsCount++;

            let sessionPoints = 0;
            let wins = 0;
            let draws = 0;
            let losses = 0;
            let validMatches = 0;

            for (const match of pool.matches) {
              const isTeam1 = match.team1Player1Id === userId || match.team1Player2Id === userId;
              const isTeam2 = match.team2Player1Id === userId || match.team2Player2Id === userId;

              if (!isTeam1 && !isTeam2) continue;

              const myGames = isTeam1 ? match.team1Games : match.team2Games;
              const theirGames = isTeam1 ? match.team2Games : match.team1Games;

              if (myGames === null || theirGames === null) continue;
              if (myGames === 0 && theirGames === 0) continue; // forfait

              validMatches++;
              sessionPoints += myGames;

              if (myGames > theirGames) {
                sessionPoints += 30; wins++;
              } else if (myGames === theirGames) {
                sessionPoints += 20; draws++;
              } else {
                sessionPoints += 10; losses++;
              }
            }

            stats.validMatches += validMatches;
            stats.totalMatches += validMatches;
            stats.points += sessionPoints / 3;
            stats.wins += wins;

            const isTop = validMatches === 3 && (wins === 3 || (wins === 2 && draws === 1));
            const isFlop = validMatches === 3 && losses === 3;

            if (isTop) stats.tops++;
            if (isFlop) stats.flops++;
          }
        }
      }

      ranking = Object.values(userStats).map(s => {
        s.averagePoints = s.sessionsCount > 0 ? (s.points / s.sessionsCount) : 0;
        return s;
      }).filter(s => s.totalMatches > 0);
    }
    
    ranking.sort((a, b) => b.averagePoints - a.averagePoints);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="mb-6">
        <BackButton />
        <div className="mt-4">
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <span className="text-4xl">📜</span> Archives des Saisons
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Consultez les statistiques finales et les classements des années passées.</p>
        </div>
      </div>

      {allSeasons.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm text-center text-gray-500 font-medium">
          Aucune saison enregistrée.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {allSeasons.map(s => (
              <Link 
                key={s.id} 
                href={`/history/archives?season=${s.id}`}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm border ${
                  selectedSeasonId === s.id 
                    ? 'bg-blue-600 text-white border-blue-700' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {s.name} {s.isActive && '(En cours)'}
              </Link>
            ))}
          </div>

          {selectedSeason && (
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
              <div className="p-6 bg-gradient-to-r from-blue-900 to-blue-800 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-black">{selectedSeason.name}</h2>
                    <p className="text-blue-200 text-sm mt-1">{ranking.length} joueurs classés</p>
                 </div>
                 <div className="text-5xl opacity-20">🏆</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rang</th>
                      <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joueur</th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-blue-600 uppercase tracking-wider">Moyenne</th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-green-600 uppercase tracking-wider">Victoires</th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-indigo-600 uppercase tracking-wider">Win Rate</th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-orange-500 uppercase tracking-wider hidden sm:table-cell">Tops</th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-red-500 uppercase tracking-wider hidden sm:table-cell">Flops</th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Sessions</th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Matchs</th>
                      <th scope="col" className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Points Totaux</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {ranking.length > 0 ? ranking.map((player, index: number) => {
                      const winRate = Math.round((player.wins / player.totalMatches) * 100);
                      const isCurrentUser = player.id === user.id;
                      
                      return (
                        <tr 
                          key={player.id} 
                          className={`${isCurrentUser ? 'bg-orange-50' : 'hover:bg-blue-50'} transition-colors`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shadow-sm border ${
                               index === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                               index === 1 ? 'bg-gray-200 text-gray-700 border-gray-300' :
                               index === 2 ? 'bg-orange-100 text-orange-800 border-orange-200' :
                               'bg-blue-100 text-blue-800 border-blue-200'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/profile/${player.id}`} className="flex flex-col group">
                                <span className={`text-sm font-black uppercase ${isCurrentUser ? 'text-orange-700 group-hover:text-orange-900' : 'text-gray-900 group-hover:text-blue-700'} transition-colors`}>
                                    {(player.stars || 0) > 0 && <span className="text-yellow-400 mr-1">{'⭐'.repeat(player.stars)}</span>}
                                    {player.nickname || player.name}
                                </span>
                                {player.nickname && <span className="text-xs text-gray-500 font-medium">{player.name}</span>}
                            </Link>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="text-lg font-black text-blue-700 tabular-nums">{player.averagePoints.toFixed(2).replace('.', ',')}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-green-700">
                            {player.wins}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-indigo-700">
                            {winRate}%
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-bold hidden sm:table-cell">
                            {player.tops > 0 ? <span className="text-orange-600">{player.tops}</span> : '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-700 font-bold hidden sm:table-cell">
                            {player.flops > 0 ? <span className="text-red-600">{player.flops}</span> : '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-bold hidden md:table-cell tabular-nums">
                            {player.sessionsCount}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-bold hidden md:table-cell tabular-nums">
                            {player.totalMatches}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500 font-bold hidden md:table-cell tabular-nums">
                            {Math.floor(player.points)}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={10} className="px-6 py-10 text-center text-gray-500 font-medium italic">
                          Aucune donnée disponible pour cette saison.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
