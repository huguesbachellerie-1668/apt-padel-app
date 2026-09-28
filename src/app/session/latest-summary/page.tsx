import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Play } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function LatestSessionSummary() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const session = await prisma.session.findFirst({
    where: { status: 'TERMINEE' },
    orderBy: { date: 'desc' },
    include: { pools: { include: { players: { include: { user: true } }, matches: true } } }
  });

  if (!session) {
    return (
      <main className="p-4 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Bilan de la dernière session</h1>
        <p>Aucune session terminée trouvée.</p>
        <Link href="/" className="text-blue-500 hover:underline mt-4 inline-block">Retour à l'accueil</Link>
      </main>
    );
  }

  const allUsers = await prisma.user.findMany();
  const usersBefore: any[] = [];
  const usersAfter: any[] = [];

  for (const u of allUsers) {
    let sessionAverage = 0;
    let validMatches = 0;
    let playedInSession = false;

    for (const pool of session.pools) {
      const pp = pool.players.find(p => p.userId === u.id);
      if (pp) {
        playedInSession = true;
        let sessionPoints = 0;
        for (const match of pool.matches) {
          const isTeam1 = match.team1Player1Id === u.id || match.team1Player2Id === u.id;
          const isTeam2 = match.team2Player1Id === u.id || match.team2Player2Id === u.id;
          if (!isTeam1 && !isTeam2) continue;
          
          const myGames = isTeam1 ? match.team1Games : match.team2Games;
          const theirGames = isTeam1 ? match.team2Games : match.team1Games;
          if (myGames === null || theirGames === null || (myGames === 0 && theirGames === 0)) continue;
          
          validMatches++;
          sessionPoints += myGames;
          if (myGames > theirGames) sessionPoints += 30;
          else if (myGames === theirGames) sessionPoints += 20;
          else sessionPoints += 10;
        }
        sessionAverage = sessionPoints / 3;
        break;
      }
    }

    let beforePoints = u.points || 0;
    let beforeMatches = u.totalMatches || 0;
    if (playedInSession) {
      beforePoints -= sessionAverage;
      beforeMatches -= validMatches;
    }
    const realSessionsBefore = beforeMatches / 3;
    let beforeAvg = 0;
    let ghostAverage = 0;

    const histStats = u.historicalStats ? (typeof u.historicalStats === 'object' ? u.historicalStats : JSON.parse(u.historicalStats as string)) : {};
    const keys = Object.keys(histStats).sort();
    if (keys.length > 0) {
      const lastStat = histStats[keys[keys.length - 1]];
      if (typeof lastStat === 'object' && lastStat !== null && 'averagePoints' in lastStat) {
        ghostAverage = Number(lastStat.averagePoints) || 0;
      } else {
        ghostAverage = Number(lastStat) || 0;
      }
    }

    if (realSessionsBefore > 0) {
      if (realSessionsBefore < 4) {
        if (ghostAverage > 0) {
          beforeAvg = (ghostAverage + beforePoints) / (1 + realSessionsBefore);
        } else {
          beforeAvg = beforePoints / realSessionsBefore;
        }
      } else {
        beforeAvg = beforePoints / realSessionsBefore;
      }
    } else {
      beforeAvg = ghostAverage > 0 ? ghostAverage : 0;
    }

    usersBefore.push({ id: u.id, name: u.nickname || u.name, avg: beforeAvg || 0, playedBefore: realSessionsBefore > 0 });
    usersAfter.push({ id: u.id, name: u.nickname || u.name, avg: u.averagePoints || 0, playedAfter: (u.totalMatches || 0) > 0, played: playedInSession, sessionAverage });
  }

  const validBefore = usersBefore.filter(u => u.playedBefore).sort((a, b) => b.avg - a.avg);
  validBefore.forEach((u, i) => u.rank = i + 1);
  
  const validAfter = usersAfter.filter(u => u.playedAfter).sort((a, b) => b.avg - a.avg);
  validAfter.forEach((u, i) => u.rank = i + 1);

  const sessionRanking = usersAfter.filter(u => u.played).sort((a, b) => b.sessionAverage - a.sessionAverage);
  
  const fmt = (n: number) => n.toFixed(2).replace('.', ',');

  return (
    <main className="p-4 max-w-5xl mx-auto bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center text-slate-500 hover:text-club-green transition-colors font-semibold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <ArrowLeft className="mr-2" size={20} /> Retour
        </Link>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
          Bilan de la session du {new Date(session.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </h1>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className="bg-slate-100 text-slate-600 text-sm uppercase tracking-wider">
                <th className="p-4 font-bold border-b border-slate-200 text-center w-24 bg-slate-100">Cl. Session</th>
                <th className="p-4 font-bold border-b border-slate-200 bg-slate-100">Joueur</th>
                <th className="p-4 font-bold border-b border-slate-200 text-center w-28 bg-slate-100">Class. Avant</th>
                <th className="p-4 font-bold border-b border-slate-200 text-center w-28 bg-slate-100">Class. Après</th>
                <th className="p-4 font-bold border-b border-slate-200 text-center w-28 bg-slate-100">Évolution</th>
                <th className="p-4 font-bold border-b border-slate-200 text-right w-32 bg-slate-100">Moy. Avant</th>
                <th className="p-4 font-bold border-b border-slate-200 text-right text-club-green w-36 bg-slate-100">Points Session</th>
                <th className="p-4 font-bold border-b border-slate-200 text-right w-32 bg-slate-100">Moy. Après</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessionRanking.map((u, index) => {
                const before = validBefore.find(b => b.id === u.id);
                const beforeData = usersBefore.find(b => b.id === u.id);
                const beforeRankStr = before ? before.rank.toString() : 'NC';
                const afterRank = u.rank;
                
                let evIcon = <span className="flex items-center justify-center gap-1 text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-lg"><Minus size={16}/> 0</span>;
                if (!before) {
                  evIcon = <span className="flex items-center justify-center gap-1 text-orange-500 font-bold bg-orange-50 px-2 py-1 rounded-lg"><Play size={14} className="fill-current"/> Entrée</span>;
                } else {
                  const diff = before.rank - (afterRank as number);
                  if (diff > 0) {
                    evIcon = <span className="flex items-center justify-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg"><TrendingUp size={16}/> +{diff}</span>;
                  } else if (diff < 0) {
                    evIcon = <span className="flex items-center justify-center gap-1 text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg"><TrendingDown size={16}/> {diff}</span>;
                  }
                }

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-center font-black text-slate-400 bg-slate-50/50">{index + 1}</td>
                    <td className="p-4 font-bold text-slate-800">{u.name}</td>
                    <td className="p-4 text-center font-medium text-slate-500">{beforeRankStr}</td>
                    <td className="p-4 text-center font-black text-slate-800">{afterRank}</td>
                    <td className="p-4 text-center">{evIcon}</td>
                    <td className="p-4 text-right font-medium text-slate-500">{fmt(beforeData?.avg || 0)}</td>
                    <td className="p-4 text-right font-black text-club-green bg-green-50/20">{fmt(u.sessionAverage)}</td>
                    <td className="p-4 text-right font-bold text-slate-800">{fmt(u.avg)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
