import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import ChangePasswordForm from './ChangePasswordForm';

export default async function PlayerProfilePage({ params }: { params: any }) {
  const p = await params;
  const currentUser = await getSessionUser();
  if (!currentUser) redirect("/login");

  // Fetch the target user
  const player = await prisma.user.findUnique({
    where: { id: p.id }
  });

  if (!player) return <div className="text-center p-10 font-bold text-gray-500">Joueur introuvable</div>;

  // Fetch all completed pools/matches for this user
  const poolPlayers = await prisma.poolPlayer.findMany({
    where: { 
      userId: player.id,
      pool: { session: { status: 'TERMINEE' } }
    },
    include: {
      pool: {
        include: {
          session: true,
          matches: {
            include: {
              team1Player1: true,
              team1Player2: true,
              team2Player1: true,
              team2Player2: true
            }
          }
        }
      }
    },
    orderBy: {
      pool: { session: { date: 'desc' } }
    }
  });

  const totalSessions = poolPlayers.length;
  let totalMatchesPlayed = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let totalGamesWon = 0;
  let bestPoolReached = Infinity;

  const teammateStats = new Map<string, { user: any, totalPoints: number, matchesPlayed: number }>();
  const opponentStats = new Map<string, { user: any, lossesAgainst: number, matchesAgainst: number }>();

  for (const pp of poolPlayers) {
    if (pp.pool.level < bestPoolReached) bestPoolReached = pp.pool.level;

    for (const match of pp.pool.matches) {
      const isTeam1 = match.team1Player1Id === player.id || match.team1Player2Id === player.id;
      const isTeam2 = match.team2Player1Id === player.id || match.team2Player2Id === player.id;
      if (!isTeam1 && !isTeam2) continue;

      const myGames = isTeam1 ? match.team1Games : match.team2Games;
      const theirGames = isTeam1 ? match.team2Games : match.team1Games;
      if (myGames === null || theirGames === null) continue;

      totalMatchesPlayed++;
      totalGamesWon += myGames;
      let pointsEarnedInMatch = myGames;

      if (myGames > theirGames) {
         wins++;
         pointsEarnedInMatch += 30;
      } else if (myGames === theirGames) {
         draws++;
         pointsEarnedInMatch += 20;
      } else {
         losses++;
         pointsEarnedInMatch += 10;
      }

      // Teammate Tracking
      const myTeammateUser = isTeam1 
          ? (match.team1Player1Id === player.id ? match.team1Player2 : match.team1Player1)
          : (match.team2Player1Id === player.id ? match.team2Player2 : match.team2Player1);
      
      if (myTeammateUser) {
          const existingT = teammateStats.get(myTeammateUser.id) || { user: myTeammateUser, totalPoints: 0, matchesPlayed: 0 };
          existingT.matchesPlayed++;
          existingT.totalPoints += pointsEarnedInMatch;
          teammateStats.set(myTeammateUser.id, existingT);
      }

      // Opponents Tracking
      const opponents = isTeam1 ? [match.team2Player1, match.team2Player2] : [match.team1Player1, match.team1Player2];
      for (const opp of opponents) {
          if (!opp) continue;
          const existingO = opponentStats.get(opp.id) || { user: opp, lossesAgainst: 0, matchesAgainst: 0 };
          existingO.matchesAgainst++;
          if (myGames < theirGames) {
              existingO.lossesAgainst++;
          }
          opponentStats.set(opp.id, existingO);
      }
    }
  }

  const winRate = totalMatchesPlayed > 0 ? Math.round((wins / totalMatchesPlayed) * 100) : 0;
  
  // Calculate Best Teammate (min 3 matches to be significant if possible, else just highest avg)
  const bestTeammates = Array.from(teammateStats.values())
    .sort((a,b) => {
        const avgA = a.totalPoints / a.matchesPlayed;
        const avgB = b.totalPoints / b.matchesPlayed;
        if (Math.abs(avgA - avgB) < 0.1) return b.matchesPlayed - a.matchesPlayed; // tie breaker on matches played
        return avgB - avgA;
    });
  const bestTeammate = bestTeammates[0];

  // Calculate Nemesis (highest losses against, tie broken by win rate against them)
  const nemeses = Array.from(opponentStats.values())
    .filter(o => o.lossesAgainst > 0)
    .sort((a,b) => {
        if (b.lossesAgainst !== a.lossesAgainst) return b.lossesAgainst - a.lossesAgainst;
        return (b.lossesAgainst / b.matchesAgainst) - (a.lossesAgainst / a.matchesAgainst);
    });
  const nemesis = nemeses[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="mb-8">
        <Link href="/history" className="text-blue-500 font-bold hover:underline mb-2 inline-block">← Retour à l'historique</Link>
        <div className="flex items-center gap-6 mt-4">
           <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 rounded-full flex items-center justify-center font-black text-4xl shadow-sm border-4 border-white">
             {player.name.charAt(0)}
           </div>
           <div>
              <h1 className="text-4xl font-black text-blue-900 flex items-center gap-3">
                {player.name}
              </h1>
              {player.nickname && <p className="text-xl text-gray-400 italic font-medium mt-1">"{player.nickname}"</p>}
              <div className="flex gap-3 mt-3">
                 <span className="bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full text-sm">
                   {totalSessions} Sessions
                 </span>
                 <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm">
                   Moyenne: {(player.averagePoints || 0).toFixed(2)} pts
                 </span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Win Rate */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">Taux de Victoire</h3>
            <div className="text-4xl font-black text-gray-800 flex items-end gap-1">
              {winRate}<span className="text-xl text-gray-400">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">{wins}V - {draws}N - {losses}D</p>
        </div>
        
        {/* Best Rule Reached */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">Meilleure Poule</h3>
            {bestPoolReached !== Infinity ? (
              <>
                <div className="text-4xl font-black text-blue-600 flex items-end gap-1">
                  #{bestPoolReached}
                </div>
                <p className="text-xs text-gray-400 mt-2 font-medium">Niveau le plus élevé atteint</p>
              </>
            ) : (
              <span className="text-gray-300 font-medium">N/A</span>
            )}
        </div>

        {/* Total Matches */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">Matchs Joués</h3>
            <div className="text-4xl font-black text-gray-800">
              {totalMatchesPlayed}
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">{totalGamesWon} jeux marqués</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
         {/* Best Teammate */}
         <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-3xl border border-green-100/50 relative overflow-hidden">
            <div className="absolute top-4 right-4 text-5xl opacity-20">🤝</div>
            <h3 className="text-green-800 font-black text-xl mb-4">Meilleur Partenaire</h3>
            {bestTeammate ? (
              <div>
                <Link href={`/profile/${bestTeammate.user.id}`} className="text-2xl font-black text-green-700 hover:text-green-900 transition-colors">
                  {bestTeammate.user.name}
                </Link>
                <p className="text-green-600 font-medium mt-2">
                  <strong className="text-green-800">{(bestTeammate.totalPoints / bestTeammate.matchesPlayed).toFixed(1)} pts</strong> gagnés en moyenne par match.
                </p>
                <p className="text-xs text-green-500/80 mt-1 uppercase tracking-wider font-bold">Associés {bestTeammate.matchesPlayed} fois</p>
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic">Pas encore assez de matchs joués.</div>
            )}
         </div>

         {/* Nemesis */}
         <div className="bg-gradient-to-br from-red-50 to-rose-50 p-8 rounded-3xl border border-red-100/50 relative overflow-hidden">
            <div className="absolute top-4 right-4 text-5xl opacity-20">🧛‍♂️</div>
            <h3 className="text-red-800 font-black text-xl mb-4">La Bête Noire</h3>
            {nemesis ? (
              <div>
                <Link href={`/profile/${nemesis.user.id}`} className="text-2xl font-black text-red-700 hover:text-red-900 transition-colors">
                  {nemesis.user.name}
                </Link>
                <p className="text-red-600 font-medium mt-2">
                  <strong className="text-red-800">{nemesis.lossesAgainst} défaites</strong> en face à face.
                </p>
                <p className="text-xs text-red-500/80 mt-1 uppercase tracking-wider font-bold">Joué contre {nemesis.matchesAgainst} fois</p>
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic">Aucun adversaire imbattable pour le moment !</div>
            )}
         </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 mb-6">
          <span className="text-3xl">🗂️</span> Archives du joueur
        </h2>
        {poolPlayers.length === 0 ? (
          <p className="text-gray-500 text-center py-10">Aucune session enregistrée.</p>
        ) : (
          <div className="space-y-4">
             {poolPlayers.map(pp => (
               <Link href={`/session/${pp.pool.sessionId}/results`} key={pp.poolId} className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-6">
                    <div className="bg-blue-50 text-blue-800 font-black text-xl px-4 py-3 rounded-xl">
                      Poule #{pp.pool.level}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-lg capitalize">{new Date(pp.pool.session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      <div className="text-sm text-gray-500 font-medium">Seed {pp.seed} sur le Terrain {pp.pool.courtNumber}</div>
                    </div>
                  </div>
                  <div className="text-orange-500 font-black text-2xl group-hover:scale-110 transition-transform">
                    👉
                  </div>
               </Link>
             ))}
          </div>
        )}
      </div>

      {currentUser.id === player.id && (
        <ChangePasswordForm userId={player.id} />
      )}
    </div>
  );
}
