import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

import BackButton from "@/components/BackButton";
import MatchTimer from "@/components/MatchTimer";
import PoolScoreForm from "@/components/PoolScoreForm";

export default async function PoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const pool = await prisma.pool.findUnique({
    where: { id },
    include: {
      session: true,
      players: {
        orderBy: { seed: 'asc' },
        include: { user: true }
      },
      courtReservation: {
        include: { club: true }
      },
      matches: {
        orderBy: { order: 'asc' },
        include: {
          team1Player1: true,
          team1Player2: true,
          team2Player1: true,
          team2Player2: true
        }
      }
    }
  });

  if (!pool) return <div className="text-center py-20 text-gray-500">Poule introuvable.</div>;

  const partnerLevel = pool.level % 2 === 1 ? pool.level + 1 : pool.level - 1;
  const partnerPool = pool.session.isTournament
    ? await prisma.pool.findFirst({
        where: { sessionId: pool.sessionId, level: partnerLevel },
        include: {
          session: true,
          players: {
            orderBy: { seed: 'asc' },
            include: { user: true }
          },
          courtReservation: {
            include: { club: true }
          },
          matches: {
            orderBy: { order: 'asc' },
            include: {
              team1Player1: true,
              team1Player2: true,
              team2Player1: true,
              team2Player2: true
            }
          }
        }
      })
    : null;

  const isPairedTournament = Boolean(pool.session.isTournament && partnerPool);
  const poolA = isPairedTournament && partnerPool ? (pool.level < partnerPool.level ? pool : partnerPool) : pool;
  const poolB = isPairedTournament && partnerPool ? (pool.level < partnerPool.level ? partnerPool : pool) : null;

  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
  const matchDuration = settings?.matchDuration || 25;

  const isSeed1 = pool.players[0]?.userId === user.id || (partnerPool ? partnerPool.players[0]?.userId === user.id : false);
  const isBoard = ['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role);
  const canEditScores = isSeed1 || isBoard;

  const nextSession = await prisma.session.findFirst({
    where: {
      date: { gt: pool.session.date },
      status: { in: ['PREVUE', 'INSCRIPTIONS_OUVERTES'] }
    },
    orderBy: { date: 'asc' },
    select: { id: true, date: true }
  });

  // Fixed teams for paired tournament
  const fixedTeams = isPairedTournament && poolB && poolA.players.length === 4 && poolB.players.length === 4
    ? [
        { num: 1, pA: poolA.players[0], pB: poolB.players[3] },
        { num: 2, pA: poolA.players[1], pB: poolB.players[2] },
        { num: 3, pA: poolA.players[2], pB: poolB.players[1] },
        { num: 4, pA: poolA.players[3], pB: poolB.players[0] },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-wrap justify-between items-end mb-6 gap-4">
        <div>
          <BackButton />
          <h1 className={`text-3xl font-black flex flex-wrap items-center gap-3 ${pool.session.isTournament ? 'text-blue-800' : 'text-club-green'}`}>
            <span>{isPairedTournament && poolB ? `🎾 Poules #${poolA.level} & #${poolB.level}` : `🎾 Poule #${pool.level}`}</span>
            <span className={`text-xl px-4 py-1.5 rounded-xl shadow-sm border flex items-center gap-2 ${pool.session.isTournament ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-slate-100 text-emerald-800 border-slate-200'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5h16M4 19h16M4 5v14M20 5v14M12 5v14M4 12h16"></path></svg>
              {isPairedTournament && poolB
                ? `Terrains ${poolA.courtReservation ? poolA.courtReservation.name : poolA.courtNumber} & ${poolB.courtReservation ? poolB.courtReservation.name : poolB.courtNumber}`
                : (pool.courtReservation ? pool.courtReservation.name : `Terrain ${pool.courtNumber}`)}
            </span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium flex flex-wrap items-center gap-3">
            <span>Session {pool.session.isTournament ? 'Tournoi ' : ''}du {new Date(pool.session.date).toLocaleDateString('fr-FR')}</span>
            {pool.courtReservation ? (
              <span className={`px-3 py-1 rounded-full text-sm font-bold border shadow-sm flex items-center gap-1 ${pool.session.isTournament ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                🏟️ {pool.courtReservation.club.name} ({pool.courtReservation.club.city})
                <span className="mx-1">|</span>
                🕒 {pool.courtReservation.startTime}
              </span>
            ) : pool.startTime && (
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold border border-orange-200 shadow-sm">
                🕒 {pool.startTime}
              </span>
            )}
          </p>
        </div>
      </div>
      
      {isPairedTournament && poolB ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[poolA, poolB].map((currentPool, pIdx) => (
              <div key={currentPool.id} className="bg-white rounded-3xl shadow-sm border border-blue-200 p-6">
                <h2 className="text-xl font-bold text-blue-800 mb-4 flex items-center justify-between">
                  <span>👥 Joueurs Poule #{currentPool.level}</span>
                  <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                    Terrain {currentPool.courtReservation ? currentPool.courtReservation.name : currentPool.courtNumber}
                  </span>
                </h2>
                <ul className="space-y-3">
                  {currentPool.players.map((p, idx) => {
                    const teamNum = pIdx === 0 ? idx + 1 : 4 - idx;
                    return (
                      <li key={p.userId} className="flex justify-between items-center font-medium bg-blue-50/40 p-3 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-blue-800 text-white rounded-full flex items-center justify-center text-xs font-bold">{p.seed}</span>
                          <div className="flex flex-col">
                            <span className={p.userId === user.id ? 'text-orange-600 font-black' : 'text-gray-800 font-bold'}>
                              {p.user.nickname || p.user.name.split(' ')[0]} {p.userId === user.id && "(Vous)"}
                            </span>
                            <span className="text-[11px] font-bold text-blue-700">🤝 Équipe {teamNum}</span>
                          </div>
                        </div>
                        <span className="text-blue-700 text-sm font-bold bg-white border border-blue-100 px-2 py-1 rounded">{p.user.averagePoints.toFixed(2).replace('.', ',')} pts</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {fixedTeams.length === 4 && (
            <div className="bg-blue-50 rounded-3xl border border-blue-200 p-5">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-3">
                🤝 Les 4 Équipes Fixes du Binôme (Poules #{poolA.level} & #{poolB.level})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {fixedTeams.map(ft => (
                  <div key={ft.num} className="bg-white rounded-2xl p-3 border border-blue-200 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black bg-blue-800 text-white px-2.5 py-0.5 rounded-full">Équipe {ft.num}</span>
                      <span className="text-[10px] font-bold text-blue-600">#{ft.pA.seed} P{poolA.level} + #{ft.pB.seed} P{poolB.level}</span>
                    </div>
                    <div className="font-black text-sm text-gray-800">
                      {ft.pA.user.nickname || ft.pA.user.name.split(' ')[0]} <span className="text-blue-500">&</span> {ft.pB.user.nickname || ft.pB.user.name.split(' ')[0]}
                    </div>
                  </div>
                ))}
              </div>
              {isSeed1 && (
                <div className="mt-4 p-3 bg-white text-blue-900 text-xs font-bold rounded-xl border border-blue-200">
                  👑 Vous êtes Joueur #1 d'une des deux poules du binôme. Vous pouvez saisir et valider les scores des 3 rotations (6 matchs).
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-club-green mb-4">👥 Joueurs</h2>
              <ul className="space-y-3">
                  {pool.players.map(p => (
                      <li key={p.userId} className="flex justify-between items-center font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-emerald-800 text-white rounded-full flex items-center justify-center text-xs">{p.seed}</span>
                              <span className={p.userId === user.id ? 'text-orange-600 font-black' : 'text-gray-800'}>
                                  {p.user.nickname || p.user.name.split(' ')[0]} {p.userId === user.id && "(Vous)"}
                              </span>
                          </div>
                          <span className="text-blue-500 text-sm font-bold bg-slate-100 px-2 py-1 rounded">{p.user.averagePoints.toFixed(2).replace('.', ',')} pts</span>
                      </li>
                  ))}
              </ul>
              {isSeed1 && (
                  <div className="mt-6 p-4 bg-orange-50 text-orange-800 text-sm font-bold rounded-xl border-2 border-orange-200">
                      👑 Vous êtes le Joueur 1 de la poule. <br/>C'est à vous de saisir et valider les scores des 3 matchs en fin de session.
                  </div>
              )}
          </div>
        </div>
      )}

      <MatchTimer initialMinutes={matchDuration} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h2 className={`text-2xl font-bold mb-6 border-b pb-4 ${pool.session.isTournament ? 'text-blue-900' : 'text-gray-800'}`}>
            ⚔️ {isPairedTournament ? `Matchs des 3 Rotations (${matchDuration} minutes par rotation)` : `Matchs (${matchDuration} minutes ou 1 set)`}
          </h2>
          <PoolScoreForm pool={pool} partnerPool={partnerPool} nextSession={nextSession} canEditScores={canEditScores} />
      </div>
    </div>
  );
}
