import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SessionResultsPage({ params }: { params: any }) {
  const p = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const session = await prisma.session.findUnique({
    where: { id: p.id },
    include: {
      pools: {
        include: {
          players: { include: { user: true } },
          matches: {
            include: {
              team1Player1: true,
              team1Player2: true,
              team2Player1: true,
              team2Player2: true
            },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { level: 'asc' }
      }
    }
  });

  if (!session) return <div className="text-center p-10 font-bold text-gray-500">Session introuvable</div>;

  const finishedPools = session.pools.filter(
    (pool: any) => pool.matches.length === 3 && pool.matches.every((m: any) => m.team1Games !== null && m.team2Games !== null)
  );

  const allPoolsFinished = session.pools.length > 0 && finishedPools.length === session.pools.length;
  const isBoard = ['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div>
          <Link href="/" className="text-blue-500 font-bold hover:underline mb-2 inline-block">← Retour à l'accueil</Link>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <span className="text-4xl">🏆</span> Résultats de la Session
          </h1>
          <p className="text-gray-500 mt-2 font-medium capitalize">
            {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {isBoard && allPoolsFinished && session.status !== 'TERMINEE' && (
           <a href="/admin" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-colors text-center inline-block">
             Clôturer la session définitivement
           </a>
        )}
      </div>

      {allPoolsFinished && session.status !== 'TERMINEE' && (
        <div className="bg-green-50 border border-green-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm mb-8">
          <div className="text-3xl">✅</div>
          <div>
            <h3 className="font-bold text-green-900">Tous les matchs sont terminés !</h3>
            <p className="text-green-800 text-sm">La session est provisoirement clôturée. En attente de la validation finale par le Board pour le calcul de vos points au classement général.</p>
          </div>
        </div>
      )}

      {finishedPools.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center text-gray-500 font-medium">
          <div className="text-4xl mb-4">⏳</div>
          Aucune poule n'a encore validé tous ses matchs. Revenez un peu plus tard !
        </div>
      ) : (
        <div className="space-y-8">
          {finishedPools.map((pool: any) => {
            // Calculate standings
            const standings = pool.players.map((pt: any) => {
              let sessionPoints = 0;
              let wins = 0;
              let gamesWon = 0;
              
              for (const match of pool.matches) {
                const isTeam1 = match.team1Player1Id === pt.userId || match.team1Player2Id === pt.userId;
                const isTeam2 = match.team2Player1Id === pt.userId || match.team2Player2Id === pt.userId;
                
                if (!isTeam1 && !isTeam2) continue;
                
                const myGames = isTeam1 ? match.team1Games : match.team2Games;
                const theirGames = isTeam1 ? match.team2Games : match.team1Games;
                
                if (myGames === null || theirGames === null) continue;
                
                sessionPoints += myGames;
                gamesWon += myGames;
                
                if (myGames > theirGames) {
                  sessionPoints += 30; wins++;
                } else if (myGames === theirGames) {
                  sessionPoints += 20; 
                } else {
                  sessionPoints += 10;
                }
              }
              return { player: pt.user, wins, gamesWon, sessionPoints };
            });

            standings.sort((a: any, b: any) => b.sessionPoints - a.sessionPoints);

            return (
              <div key={pool.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-indigo-900 px-6 py-4 flex justify-between items-center text-white">
                   <h2 className="font-black text-xl">Poule #{pool.level}</h2>
                   <span className="bg-indigo-800 px-4 py-1 rounded-full text-sm font-bold border border-indigo-700">Terrain {pool.courtNumber}</span>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Standings Table */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">📊 Classement de la poule</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs rounded-lg">
                          <tr>
                            <th className="px-4 py-3 rounded-l-xl">Joueur</th>
                            <th className="px-4 py-3 text-center">V</th>
                            <th className="px-4 py-3 text-center">Jeux</th>
                            <th className="px-4 py-3 text-center">Points</th>
                            <th className="px-4 py-3 text-right rounded-r-xl">Moy.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((s: any, idx: number) => (
                            <tr key={s.player.id} className="border-b border-gray-50 last:border-0 hover:bg-orange-50/30 transition-colors">
                              <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${idx === 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                  {idx + 1}
                                </span>
                                {s.player.name.split(' ')[0]}
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-green-600">{s.wins}</td>
                              <td className="px-4 py-3 text-center text-gray-500 font-medium">{s.gamesWon}</td>
                              <td className="px-4 py-3 text-center font-bold text-indigo-600">+{s.sessionPoints}</td>
                              <td className="px-4 py-3 text-right font-black text-blue-600 bg-blue-50/30 rounded-r-xl">{(s.sessionPoints / 3).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Matches List */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">⚔️ Scores finaux</h3>
                    <div className="space-y-3">
                      {pool.matches.map((m: any) => ( // assuming matches are naturally complete if pool is here
                        <div key={m.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between text-sm">
                          <div className="flex-1 text-right font-medium text-gray-700">
                            {m.team1Player1.name.split(' ')[0]} / {m.team1Player2.name.split(' ')[0]}
                          </div>
                          <div className="px-4 font-black flex items-center gap-2 shrink-0">
                            <span className={m.team1Games > m.team2Games ? 'text-orange-500' : 'text-gray-800'}>{m.team1Games}</span>
                            <span className="text-gray-300">-</span>
                            <span className={m.team2Games > m.team1Games ? 'text-green-500' : 'text-gray-800'}>{m.team2Games}</span>
                          </div>
                          <div className="flex-1 text-left font-medium text-gray-700">
                            {m.team2Player1.name.split(' ')[0]} / {m.team2Player2.name.split(' ')[0]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
