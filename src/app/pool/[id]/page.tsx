import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import SubmitButton from "@/components/SubmitButton";
import BackButton from "@/components/BackButton";

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

  const isSeed1 = pool.players[0]?.userId === user.id;
  const isBoard = ['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role);
  const canEditScores = isSeed1 || isBoard;

  async function saveScores(formData: FormData) {
    'use server';
    for (let i = 1; i <= 3; i++) {
        const t1 = formData.get(`m${i}_t1`) as string;
        const t2 = formData.get(`m${i}_t2`) as string;
        const matchId = formData.get(`m${i}_id`) as string;

        if (t1 !== null && t2 !== null && matchId) {
            const games1 = parseInt(t1, 10);
            const games2 = parseInt(t2, 10);
            
            if (isNaN(games1) || isNaN(games2)) continue;

            let winningTeam = 0;
            if (games1 > games2) winningTeam = 1;
            else if (games2 > games1) winningTeam = 2;

            await prisma.match.update({
                where: { id: matchId },
                data: { team1Games: games1, team2Games: games2, winningTeam }
            });
        }
    }
    revalidatePath(`/pool/${id}`);
    revalidatePath(`/`);
  }

  async function saveAndRedirect(formData: FormData) {
    'use server';
    for (let i = 1; i <= 3; i++) {
        const t1 = formData.get(`m${i}_t1`) as string;
        const t2 = formData.get(`m${i}_t2`) as string;
        const matchId = formData.get(`m${i}_id`) as string;

        if (t1 !== null && t2 !== null && matchId) {
            const games1 = parseInt(t1, 10);
            const games2 = parseInt(t2, 10);
            
            if (isNaN(games1) || isNaN(games2)) continue;

            let winningTeam = 0;
            if (games1 > games2) winningTeam = 1;
            else if (games2 > games1) winningTeam = 2;

            await prisma.match.update({
                where: { id: matchId },
                data: { team1Games: games1, team2Games: games2, winningTeam }
            });
        }
    }
    revalidatePath(`/pool/${id}`);
    if (pool?.sessionId) {
      revalidatePath(`/session/${pool.sessionId}/results`);
      revalidatePath(`/`);
      redirect(`/session/${pool.sessionId}/results`);
    }
  }

  const allMatchesFinished = pool.matches.length === 3 && pool.matches.every((m: any) => m.team1Games !== null && m.team2Games !== null);

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

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">⚔️ Matchs (25 minutes ou 1 set)</h2>
          <form action={saveScores} className="space-y-8">
              {pool.matches.map((m: any) => (
                  <div key={m.id} className="border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-orange-200 transition-colors">
                      <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-3 font-bold text-white flex justify-between">
                        <span>Match {m.order}</span>
                        {m.team1Games !== null ? <span className="text-orange-300 text-sm">Terminé</span> : <span className="text-blue-300 text-sm">En attente</span>}
                      </div>
                      <div className="flex flex-col md:flex-row p-6 gap-6 items-center justify-between bg-white">
                          <input type="hidden" name={`m${m.order}_id`} value={m.id} />
                          
                          <div className="flex-1 text-center md:text-right">
                              <div className="font-black text-xl text-orange-900 bg-orange-50 px-4 py-2 rounded-xl inline-block border border-orange-200 shadow-sm">
                                {m.team1Player1.nickname || m.team1Player1.name.split(' ')[0]} <span className="text-gray-400">&</span> {m.team1Player2.nickname || m.team1Player2.name.split(' ')[0]}
                              </div>
                          </div>
                          
                          {canEditScores && pool.session.status !== 'TERMINEE' ? (
                              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                  <input type="number" name={`m${m.order}_t1`} defaultValue={m.team1Games ?? ''} min="0" max="20" placeholder="Jeux" required className="w-20 h-14 border-2 border-orange-300 rounded-xl text-center font-black text-2xl text-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-200" />
                                  <span className="font-black text-gray-400 text-2xl">-</span>
                                  <input type="number" name={`m${m.order}_t2`} defaultValue={m.team2Games ?? ''} min="0" max="20" placeholder="Jeux" required className="w-20 h-14 border-2 border-green-300 rounded-xl text-center font-black text-2xl text-green-600 focus:outline-none focus:ring-4 focus:ring-green-200" />
                              </div>
                          ) : (
                              <div className="flex items-center gap-6 font-black text-4xl">
                                  <span className={m.winningTeam === 1 ? 'text-orange-500' : m.team1Games !== null ? 'text-gray-800' : 'text-gray-300'}>{m.team1Games ?? '-'}</span>
                                  <span className="text-gray-200 text-2xl">-</span>
                                  <span className={m.winningTeam === 2 ? 'text-green-500' : m.team2Games !== null ? 'text-gray-800' : 'text-gray-300'}>{m.team2Games ?? '-'}</span>
                              </div>
                          )}

                          <div className="flex-1 text-center md:text-left">
                              <div className="font-black text-xl text-green-900 bg-green-50 px-4 py-2 rounded-xl inline-block border border-green-100">
                                {m.team2Player1.nickname || m.team2Player1.name.split(' ')[0]} <span className="text-gray-400">&</span> {m.team2Player2.nickname || m.team2Player2.name.split(' ')[0]}
                              </div>
                          </div>
                      </div>
                  </div>
              ))}
              
              {canEditScores && pool.session.status !== 'TERMINEE' && (
                  <div className="text-center pt-8 border-t border-gray-200">
                      {allMatchesFinished ? (
                          <>
                            <p className="text-green-600 mb-4 text-sm font-bold">Tous les matchs de la poule sont terminés.</p>
                            <SubmitButton pendingText="Enregistrement..." formAction={saveAndRedirect} className="bg-green-500 hover:bg-green-600 text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.02] text-lg w-full md:w-auto">
                                ✅ Scores enregistrés ! Voir les Résultats 👉
                            </SubmitButton>
                          </>
                      ) : (
                          <>
                            <p className="text-gray-500 mb-4 text-sm font-medium">Assurez-vous que les scores des {pool.matches.length} matchs sont saisis.</p>
                            <SubmitButton pendingText="Sauvegarde..." formAction={saveScores} className="bg-orange-500 hover:bg-orange-600 text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.02] text-lg w-full md:w-auto">
                                💾 Enregistrer les scores
                            </SubmitButton>
                          </>
                      )}
                  </div>
              )}
          </form>
      </div>
    </div>
  );
}
