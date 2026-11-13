import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { finishSessionAndCalculatePoints } from "@/app/admin/actions";
import SubmitButton from "@/components/SubmitButton";

export default async function SessionResultsPage({ params }: { params: Promise<{ id: string }> }) {
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
    pool => pool.matches.length === 3 && pool.matches.every(m => m.team1Games !== null && m.team2Games !== null)
  );

  const allPoolsFinished = session.pools.length > 0 && finishedPools.length === session.pools.length;
  const isBoard = ['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role);

  // Build result groups (1 pool per group in classic mode, 2 paired pools per group in tournament mode)
  type SessionPool = (typeof session.pools)[number];
  type ResultGroup = {
    id: string;
    isPaired: boolean;
    title: string;
    courtsLabel: string;
    shareLabel: string;
    fileName: string;
    players: SessionPool['players'];
    matches: SessionPool['matches'];
  };

  const resultGroups: ResultGroup[] = [];
  if (!session.isTournament) {
    finishedPools.forEach(pool => {
      resultGroups.push({
        id: `capture-pool-${pool.id}`,
        isPaired: false,
        title: `Poule #${pool.level}`,
        courtsLabel: `Terrain ${pool.courtNumber}`,
        shareLabel: `Scores Poule ${pool.level}`,
        fileName: `scores-poule-${pool.level}.png`,
        players: pool.players,
        matches: pool.matches,
      });
    });
  } else {
    const pairsCount = Math.floor(session.pools.length / 2);
    for (let k = 0; k < pairsCount; k++) {
      const poolA: SessionPool = session.pools[2 * k];
      const poolB: SessionPool = session.pools[2 * k + 1];
      const aDone = poolA.matches.length === 3 && poolA.matches.every(m => m.team1Games !== null && m.team2Games !== null);
      const bDone = poolB.matches.length === 3 && poolB.matches.every(m => m.team1Games !== null && m.team2Games !== null);
      if (aDone && bDone) {
        const interleavedMatches: SessionPool['matches'] = [];
        for (let rot = 1; rot <= 3; rot++) {
          const mA = poolA.matches.find(m => m.order === rot);
          const mB = poolB.matches.find(m => m.order === rot);
          if (mA) interleavedMatches.push(mA);
          if (mB) interleavedMatches.push(mB);
        }
        resultGroups.push({
          id: `capture-pool-${poolA.id}`,
          isPaired: true,
          title: `Binôme ${k + 1} : Poules #${poolA.level} & #${poolB.level}`,
          courtsLabel: `Terrains ${poolA.courtNumber} & ${poolB.courtNumber}`,
          shareLabel: `Scores Tournoi Poules ${poolA.level} & ${poolB.level}`,
          fileName: `scores-tournoi-poules-${poolA.level}-${poolB.level}.png`,
          players: [...poolA.players, ...poolB.players],
          matches: interleavedMatches,
        });
      }
    }
    if (session.pools.length % 2 === 1) {
      const orphan = session.pools[session.pools.length - 1];
      const oDone = orphan.matches.length === 3 && orphan.matches.every(m => m.team1Games !== null && m.team2Games !== null);
      if (oDone) {
        resultGroups.push({
          id: `capture-pool-${orphan.id}`,
          isPaired: false,
          title: `Poule #${orphan.level} (Classique)`,
          courtsLabel: `Terrain ${orphan.courtNumber}`,
          shareLabel: `Scores Poule ${orphan.level}`,
          fileName: `scores-poule-${orphan.level}.png`,
          players: orphan.players,
          matches: orphan.matches,
        });
      }
    }
  }

  let finalWhatsAppText = `🏆 *Résultats de la session ${session.isTournament ? 'Tournoi ' : ''}du ${new Date(session.date).toLocaleDateString('fr-FR')}*\n\nVoici les classements de toutes les poules !\n`;
  if (session.status === 'TERMINEE') {
      resultGroups.forEach(group => {
          const standings = group.players.map(pt => {
              let sessionPoints = 0; let wins = 0; let draws = 0; let losses = 0;
              for (const match of group.matches) {
                  const isTeam1 = match.team1Player1Id === pt.userId || match.team1Player2Id === pt.userId;
                  const isTeam2 = match.team2Player1Id === pt.userId || match.team2Player2Id === pt.userId;
                  if (!isTeam1 && !isTeam2) continue;
                  const myGames = isTeam1 ? match.team1Games : match.team2Games;
                  const theirGames = isTeam1 ? match.team2Games : match.team1Games;
                  if (myGames === null || theirGames === null) continue;
                  sessionPoints += myGames;
                  if (myGames > theirGames) { sessionPoints += 30; wins++; }
                  else if (myGames === theirGames) { sessionPoints += 20; draws++; }
                  else { sessionPoints += 10; losses++; }
              }
              return { player: pt.user, wins, draws, losses, sessionPoints };
          });
          standings.sort((a, b) => b.sessionPoints - a.sessionPoints);
          const topPlayers = standings.filter(s => s.wins === 3 || (s.wins === 2 && s.draws === 1));
          const flopPlayers = standings.filter(s => s.losses === 3);

          if (topPlayers.length > 0 || flopPlayers.length > 0) {
              finalWhatsAppText += `\n🎾 *${group.title}* :\n`;
              if (topPlayers.length > 0) finalWhatsAppText += `🏆 TOP : ${topPlayers.map(tp => `${tp.player.nickname || tp.player.name.split(' ')[0]} (Moy: ${(tp.sessionPoints / 3).toFixed(2).replace('.', ',')})`).join(', ')}\n`;
              if (flopPlayers.length > 0) finalWhatsAppText += `💩 FLOP : ${flopPlayers.map(fp => `${fp.player.nickname || fp.player.name.split(' ')[0]} (Moy: ${(fp.sessionPoints / 3).toFixed(2).replace('.', ',')})`).join(', ')}\n`;
          }
      });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div>
          <BackButton />
          <h1 className={`text-3xl font-black flex items-center gap-3 ${session.isTournament ? 'text-blue-800' : 'text-club-green'}`}>
            <span className="text-4xl">🏆</span> {session.isTournament ? 'Résultats du Tournoi (Paires Fixes)' : 'Résultats de la Session'}
          </h1>
          <p className="text-gray-500 mt-2 font-medium capitalize">
            {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {isBoard && allPoolsFinished && session.status !== 'TERMINEE' && (
           <div className="flex flex-col gap-2 items-end">
             <form action={finishSessionAndCalculatePoints.bind(null, session.id)} className="flex flex-col gap-2 items-end">
               <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-gray-200 shadow-sm w-fit">
                 <input type="checkbox" name="countPoints" value="true" defaultChecked className="w-4 h-4 text-orange-500" />
                 <span className="text-xs font-bold text-gray-700">Comptabiliser pour le classement général</span>
               </label>
               <SubmitButton pendingText="Fermeture en cours..." className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-xl shadow-md transition-colors text-center inline-block">
                 Clôturer la session définitivement
               </SubmitButton>
             </form>
           </div>
        )}
        {isBoard && session.status === 'TERMINEE' && (
           <div data-html2canvas-ignore>
               <WhatsAppShareButton 
                   elementIds={resultGroups.map(g => g.id)}
                   text={finalWhatsAppText}
                   fileName="resultats.png"
               />
           </div>
        )}
      </div>

      {allPoolsFinished && session.status !== 'TERMINEE' && (
        <div className={`${session.isTournament ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border p-5 rounded-2xl flex items-center gap-4 shadow-sm mb-8`}>
          <div className="text-3xl">✅</div>
          <div>
            <h3 className={`font-bold ${session.isTournament ? 'text-blue-900' : 'text-green-900'}`}>Tous les matchs sont terminés !</h3>
            <p className={`${session.isTournament ? 'text-blue-800' : 'text-green-800'} text-sm`}>La session est provisoirement clôturée. En attente de la validation finale par le Board pour le calcul de vos points au classement général.</p>
          </div>
        </div>
      )}

      {session.status === 'TERMINEE' && !session.isCounted && (
        <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-center gap-4 shadow-sm mb-8">
          <div className="text-3xl">⚠️</div>
          <div>
            <h3 className="font-bold text-red-900">Session non comptabilisée</h3>
            <p className="text-red-800 text-sm">Les points de cette session n'ont pas été pris en compte pour le classement général.</p>
          </div>
        </div>
      )}

      {resultGroups.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 text-center text-gray-500 font-medium">
          <div className="text-4xl mb-4">⏳</div>
          Aucune poule n'a encore validé tous ses matchs. Revenez un peu plus tard !
        </div>
      ) : (
        <div className="space-y-8">
          {resultGroups.map(group => {
            // Calculate standings
            const standings = group.players.map(pt => {
              let sessionPoints = 0;
              let wins = 0;
              let draws = 0;
              let losses = 0;
              let gamesWon = 0;
              
              for (const match of group.matches) {
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
                  sessionPoints += 20; draws++;
                } else {
                  sessionPoints += 10; losses++;
                }
              }
              return { player: pt.user, wins, draws, losses, gamesWon, sessionPoints };
            });

            standings.sort((a, b) => b.sessionPoints - a.sessionPoints);

            const topPlayers = standings.filter(s => s.wins === 3 || (s.wins === 2 && s.draws === 1));
            const flopPlayers = standings.filter(s => s.losses === 3);

            return (
              <div key={group.id} id={group.id} className={`bg-white rounded-3xl shadow-sm border overflow-hidden mb-8 ${session.isTournament ? 'border-blue-200' : 'border-gray-200'}`}>
                <div className={`${session.isTournament ? 'bg-blue-950' : 'bg-slate-800'} px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-white`}>
                   <div className="flex flex-wrap items-center gap-4">
                     <h2 className="font-black text-xl">{group.title}</h2>
                     <span className={`${session.isTournament ? 'bg-blue-800 border-blue-600' : 'bg-emerald-800 border-indigo-700'} px-4 py-1 rounded-full text-sm font-bold border flex items-center gap-1`}>
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5h16M4 19h16M4 5v14M20 5v14M12 5v14M4 12h16"></path></svg>
                       {group.courtsLabel}
                     </span>
                   </div>
                   {session.status !== 'TERMINEE' && (
                     <div data-html2canvas-ignore>
                       <WhatsAppShareButton 
                         elementId={group.id} 
                         text={group.shareLabel} 
                         fileName={group.fileName}
                         className="py-1.5 px-3 text-sm"
                       />
                     </div>
                   )}
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Standings Table */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      📊 {group.isPaired ? 'Classement du binôme' : 'Classement de la poule'}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs rounded-lg">
                          <tr>
                            <th className="px-4 py-3 rounded-l-xl">Joueur</th>
                            <th className="px-4 py-3 text-center">V</th>
                            <th className="px-4 py-3 text-center">N</th>
                            <th className="px-4 py-3 text-center">D</th>
                            <th className="px-4 py-3 text-center">Jeux</th>
                            <th className="px-4 py-3 text-center">Points</th>
                            <th className="px-4 py-3 text-right rounded-r-xl">Moy.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((s, idx: number) => (
                            <tr key={s.player.id} className="border-b border-gray-50 last:border-0 hover:bg-orange-50/30 transition-colors">
                              <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${idx === 0 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                                  {idx + 1}
                                </span>
                                <span className="flex items-center gap-1">
                                  {(s.player.stars || 0) > 0 && <span className="text-yellow-400">{'⭐'.repeat(s.player.stars)}</span>}
                                  {s.player.nickname || s.player.name.split(' ')[0]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-green-600">{s.wins}</td>
                              <td className="px-4 py-3 text-center font-bold text-yellow-600">{s.draws}</td>
                              <td className="px-4 py-3 text-center font-bold text-red-500">{s.losses}</td>
                              <td className="px-4 py-3 text-center text-gray-500 font-medium">{s.gamesWon}</td>
                              <td className="px-4 py-3 text-center font-bold text-slate-800">+{s.sessionPoints}</td>
                              <td className={`px-4 py-3 text-right font-black bg-slate-50/30 rounded-r-xl ${session.isTournament ? 'text-blue-800' : 'text-club-green'}`}>{(s.sessionPoints / 3).toFixed(2).replace('.', ',')}</td>
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
                      {group.matches.map(m => (
                        <div key={m.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between text-sm">
                          <div className="flex-1 text-right font-medium text-gray-700">
                            {m.team1Player1.nickname || m.team1Player1.name.split(' ')[0]} / {m.team1Player2.nickname || m.team1Player2.name.split(' ')[0]}
                          </div>
                          <div className="px-4 font-black flex items-center gap-2 shrink-0">
                            <span className={(m.team1Games || 0) > (m.team2Games || 0) ? 'text-green-500' : (m.team1Games || 0) < (m.team2Games || 0) ? 'text-red-500' : 'text-orange-500'}>{m.team1Games ?? 0}</span>
                            <span className="text-gray-300">-</span>
                            <span className={(m.team2Games || 0) > (m.team1Games || 0) ? 'text-green-500' : (m.team2Games || 0) < (m.team1Games || 0) ? 'text-red-500' : 'text-orange-500'}>{m.team2Games ?? 0}</span>
                          </div>
                          <div className="flex-1 text-left font-medium text-gray-700">
                            {m.team2Player1.nickname || m.team2Player1.name.split(' ')[0]} / {m.team2Player2.nickname || m.team2Player2.name.split(' ')[0]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top / Flop */}
                {(topPlayers.length > 0 || flopPlayers.length > 0) && (
                  <div className={`${session.isTournament ? 'bg-blue-50/50' : 'bg-orange-50/50'} px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4`}>
                      {topPlayers.length > 0 ? (
                        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-orange-100 flex-1">
                           <span className="text-3xl">🏆</span>
                           <div>
                              <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">TOP</span><br/>
                              <span className="font-black text-gray-800 text-base">
                                {topPlayers.map(tp => `${tp.player.nickname || tp.player.name.split(' ')[0]} (${(tp.sessionPoints / 3).toFixed(2).replace('.', ',')})`).join(' & ')}
                              </span>
                           </div>
                        </div>
                      ) : <div className="flex-1"></div>}
                      
                      {flopPlayers.length > 0 ? (
                        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-orange-100 flex-1 justify-end text-right">
                           <div>
                              <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">FLOP</span><br/>
                              <span className="font-black text-gray-800 text-base">
                                {flopPlayers.map(fp => `${fp.player.nickname || fp.player.name.split(' ')[0]} (${(fp.sessionPoints / 3).toFixed(2).replace('.', ',')})`).join(' & ')}
                              </span>
                           </div>
                           <span className="text-3xl">💩</span>
                        </div>
                      ) : <div className="flex-1"></div>}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
