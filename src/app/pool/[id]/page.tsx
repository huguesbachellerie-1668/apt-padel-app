import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import BackButton from "@/components/BackButton";
import MatchTimer from "@/components/MatchTimer";
import PoolScoreForm from "@/components/PoolScoreForm";

export default async function PoolPage({ params }: { params: { id: string } }) {
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

  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
  const matchDuration = settings?.matchDuration || 25;

  const isSeed1 = pool.players[0]?.userId === user.id;
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-wrap justify-between items-end mb-6 gap-4">
        <div>
          <BackButton />
          <h1 className="text-3xl font-black text-blue-900 flex flex-wrap items-center gap-3">
            <span>🎾 Poule #{pool.level}</span>
            <span className="text-xl bg-blue-100 text-blue-800 px-4 py-1.5 rounded-xl shadow-sm border border-blue-200 flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5h16M4 19h16M4 5v14M20 5v14M12 5v14M4 12h16"></path></svg>
              {pool.courtReservation ? pool.courtReservation.name : `Terrain ${pool.courtNumber}`}
            </span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium flex items-center gap-3">
            <span>Session du {new Date(pool.session.date).toLocaleDateString('fr-FR')}</span>
            {pool.courtReservation ? (
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold border border-orange-200 shadow-sm flex items-center gap-1">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-blue-100 p-6">
              <h2 className="text-xl font-bold text-blue-900 mb-4">👥 Joueurs</h2>
              <ul className="space-y-3">
                  {pool.players.map((p: any) => (
                      <li key={p.userId} className="flex justify-between items-center font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-blue-800 text-white rounded-full flex items-center justify-center text-xs">{p.seed}</span>
                              <span className={p.userId === user.id ? 'text-orange-600 font-black' : 'text-gray-800'}>
                                  {p.user.nickname || p.user.name.split(' ')[0]} {p.userId === user.id && "(Vous)"}
                              </span>
                          </div>
                          <span className="text-blue-500 text-sm font-bold bg-blue-100 px-2 py-1 rounded">{p.user.averagePoints.toFixed(2)} pts</span>
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

      <MatchTimer initialMinutes={matchDuration} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">⚔️ Matchs ({matchDuration} minutes ou 1 set)</h2>
          <PoolScoreForm pool={pool} nextSession={nextSession} canEditScores={canEditScores} />
      </div>
    </div>
  );
}
