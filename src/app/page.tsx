import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { registerForSession, unregisterFromSession } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Get active session if any
  const activeSession = await prisma.session.findFirst({
    where: { status: { in: ['PREVUE', 'INSCRIPTIONS_OUVERTES', 'POULES_GENEREES', 'POULES_EN_ATTENTE'] } },
    orderBy: { date: 'asc' },
    include: {
      pools: {
        include: { matches: true }
      }
    }
  });

  let hasFinishedPool = false;
  let allPoolsFinished = false;
  if (activeSession && activeSession.status === 'POULES_GENEREES' && activeSession.pools) {
    const finishedPools = activeSession.pools.filter((p: any) => p.matches.length === 3 && p.matches.every((m: any) => m.team1Games !== null && m.team2Games !== null));
    hasFinishedPool = finishedPools.length > 0;
    allPoolsFinished = activeSession.pools.length > 0 && finishedPools.length === activeSession.pools.length;
  }

  let userRegistration = null;
  let userPoolPlayer = null;
  if (activeSession) {
    userRegistration = await prisma.registration.findFirst({
      where: { userId: user.id, sessionId: activeSession.id }
    });
    if (activeSession.status === 'POULES_GENEREES' || activeSession.status === 'POULES_EN_ATTENTE') {
      if (userRegistration) {
        userPoolPlayer = await prisma.poolPlayer.findFirst({
          where: { userId: user.id, pool: { sessionId: activeSession.id } },
          include: { pool: true }
        });
      }
    }
  }

  // Rank calculation
  const rankedPlayers = await prisma.user.findMany({
    where: { totalMatches: { gt: 0 } },
    orderBy: { averagePoints: 'desc' },
    select: { id: true }
  });
  const rankIndex = rankedPlayers.findIndex((p: { id: string }) => p.id === user.id);
  const rank = rankIndex !== -1 ? `${rankIndex + 1}` : '-';

  const registeredAt = user.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) 
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Welcome & Stats Card */}
      <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="text-2xl">📊</span> Mes Statistiques
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-indigo-100">
            <span className="text-sm text-indigo-600 font-semibold mb-1">Classement</span>
            <span className="text-3xl font-black text-indigo-900">{rank !== '-' ? `#${rank}` : rank}</span>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-blue-100">
            <span className="text-sm text-blue-600 font-semibold mb-1">Moyenne</span>
            <span className="text-3xl font-black text-blue-900">{user.averagePoints.toFixed(2)}</span>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-orange-100">
            <span className="text-sm text-orange-600 font-semibold mb-1">Points totaux</span>
            <span className="text-3xl font-black text-orange-900">{Math.floor(user.points)}</span>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-green-100">
            <span className="text-sm text-green-600 font-semibold mb-1">TOP (Invaincu)</span>
            <span className="text-3xl font-black text-green-700">{user.tops}</span>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-red-100">
            <span className="text-sm text-red-600 font-semibold mb-1">FLOP (3 Défaites)</span>
            <span className="text-3xl font-black text-red-700">{user.flops}</span>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-gray-200">
            <span className="text-sm text-gray-600 font-semibold mb-1">Inscrit depuis</span>
            <span className="text-xl font-black text-gray-800 tracking-tight capitalize">{registeredAt}</span>
          </div>
        </div>
      </section>

      {/* Dynamic Session Dashboard */}
      {activeSession ? (
        <div className="space-y-6">
          {/* Card 1: Inscription & Présence */}
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className="flex flex-wrap justify-between items-center mb-5 gap-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="text-2xl">📋</span> Prochaine Session
              </h2>
              {activeSession.status !== 'POULES_GENEREES' && (
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${activeSession.status === 'INSCRIPTIONS_OUVERTES' ? 'bg-orange-500 text-white' : activeSession.status === 'POULES_EN_ATTENTE' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700'}`}>
                  {activeSession.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            
            <p className="text-md text-blue-900 font-black capitalize mb-5 bg-blue-50 p-3 rounded-xl border border-blue-100 inline-block">
               Dimanche {new Date(activeSession.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' }).replace(':', 'h')}
            </p>

            {activeSession.status === 'INSCRIPTIONS_OUVERTES' && (
              userRegistration ? (
                <div className="bg-green-500/10 border border-green-200 p-5 rounded-2xl text-center mb-4">
                  <p className="font-black text-green-700 flex items-center justify-center gap-2 mb-4 text-lg">
                    ✅ Vous êtes bien inscrit(e) sur la liste !
                  </p>
                  <form action={unregisterFromSession.bind(null, activeSession.id)}>
                    <SubmitButton className="text-sm border border-red-200 text-red-600 hover:bg-red-50 bg-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-sm">
                      Me désinscrire
                    </SubmitButton>
                  </form>
                </div>
              ) : (
                <form action={registerForSession.bind(null, activeSession.id)} className="bg-orange-50 p-5 rounded-2xl border border-orange-100 mb-4">
                  <div className="flex items-start gap-3 mb-5 text-left bg-white/50 p-3 rounded-xl">
                    <input type="checkbox" id="injury" name="isReturningFromInjury" value="true" className="w-5 h-5 mt-0.5 text-orange-500 rounded border-orange-300 focus:ring-orange-500 cursor-pointer flex-shrink-0 shadow-sm" />
                    <label htmlFor="injury" className="text-orange-900 text-sm font-bold cursor-pointer leading-tight">
                      Signaler un "retour de blessure" <br/><span className="text-[11px] text-orange-700 font-medium uppercase tracking-wider block mt-1">Vous descendrez d'une poule calculée pour ce dimanche.</span>
                    </label>
                  </div>
                  <SubmitButton pendingText="Inscription..." className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 px-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 text-lg">
                    🎾 M'inscrire pour ce dimanche !
                  </SubmitButton>
                </form>
              )
            )}

            {(activeSession.status === 'POULES_GENEREES' || activeSession.status === 'POULES_EN_ATTENTE') && (
               userPoolPlayer ? (
                 <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 text-sm font-bold mb-4 flex items-center justify-between gap-3">
                   <div className="flex items-center gap-3">
                     <span className="text-xl">✅</span> Inscrit
                   </div>
                   <form action={unregisterFromSession.bind(null, activeSession.id)}>
                     <SubmitButton className="text-xs border border-red-200 text-red-600 bg-white hover:bg-red-50 py-1.5 px-3 rounded-lg font-bold transition-colors">
                       Me désinscrire
                     </SubmitButton>
                   </form>
                 </div>
               ) : userRegistration ? (
                 <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-200 text-sm font-bold mb-4 flex items-center justify-between gap-3">
                   <div className="flex items-center gap-3">
                     <span className="text-xl">⏳</span> Vous êtes sur liste d'attente.
                   </div>
                   <form action={unregisterFromSession.bind(null, activeSession.id)}>
                     <SubmitButton className="text-xs border border-red-200 text-red-600 bg-white hover:bg-red-50 py-1.5 px-3 rounded-lg font-bold transition-colors">
                       Me désinscrire
                     </SubmitButton>
                   </form>
                 </div>
               ) : (
                 <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm font-bold mb-4 flex items-center gap-3">
                   <span className="text-xl">⛔</span> Non Inscrit
                 </div>
               )
            )}

            {activeSession.status === 'PREVUE' && (
              <div className="bg-blue-50 text-blue-800 p-5 rounded-2xl border border-blue-100 text-sm font-bold mb-4 text-center">
                 L'ouverture des inscriptions approche !
              </div>
            )}
            
            <a href={`/session/${activeSession.id}`} className="block text-center text-lg font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md py-4 rounded-xl transition-transform transform hover:scale-[1.02]">
               🔎  Voir la Session 👉
            </a>
          </section>

          {/* Grid Layout for Matches & Results if generated */}
          {activeSession.status === 'POULES_GENEREES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 2: My Matches Input */}
              <section className="bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl shadow-lg p-6 text-white relative overflow-hidden group flex flex-col">
                 <div className="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                 <h2 className="text-xl font-black mb-6 flex items-center gap-2 relative z-10">
                   <span className="text-2xl">🎾</span> Saisie des Scores
                 </h2>
                 {userPoolPlayer ? (
                   <div className="space-y-4 relative z-10 flex flex-col h-full justify-between">
                     <div className="bg-white/10 p-5 border border-white/20 rounded-2xl backdrop-blur-sm">
                        <p className="text-2xl font-black mb-1">Poule #{userPoolPlayer.pool.level}</p>
                     </div>
                     <a href={`/pool/${userPoolPlayer.poolId}`} className="block text-center bg-white text-orange-600 font-black py-4 px-6 rounded-xl transition-transform transform hover:scale-105 shadow-md">
                       Voir Ma Poule 👉
                     </a>
                   </div>
                 ) : (
                   <div className="bg-black/20 p-5 border border-white/10 rounded-2xl text-sm font-bold text-white/70 h-full flex items-center justify-center text-center backdrop-blur-sm">
                     Reposez-vous bien. Revenez la semaine prochaine pour jouer sur les terrains !
                   </div>
                 )}
              </section>

              {/* Card 3: Session Results / Rankings */}
              <section className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl shadow-lg p-6 text-white relative overflow-hidden group flex flex-col">
                 <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-400 opacity-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                 <h2 className="text-xl font-black mb-6 flex items-center gap-2 relative z-10">
                   <span className="text-2xl">🏆</span> Résultats de la Session
                 </h2>
                 <div className="space-y-4 relative z-10 flex flex-col h-full justify-between">
                   {(hasFinishedPool || allPoolsFinished) && (
                     <div className="bg-white/10 p-5 border border-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center text-center flex-1">
                       {allPoolsFinished ? (
                         <div className="font-bold text-green-300">
                           <span className="text-4xl block mb-3">🎉</span>
                           Tous les scores sont validés !<br/>Le classement final est prêt.
                         </div>
                       ) : (
                         <div className="font-bold text-blue-200">
                           Certaines poules se sont terminées.<br/>Les résultats tombent en direct !
                         </div>
                       )}
                     </div>
                   )}
                   {(hasFinishedPool || allPoolsFinished) ? (
                     <a href={`/session/${activeSession.id}/results`} className={`block text-center font-black py-4 px-6 rounded-xl transition-transform transform hover:scale-105 shadow-md ${allPoolsFinished ? 'bg-green-500 text-white hover:bg-green-400' : 'bg-white text-indigo-700'}`}>
                       Voir le Classement du Dimanche 👉
                     </a>
                   ) : (
                     <div className="bg-black/20 text-center font-bold py-4 px-6 rounded-xl text-white/50 cursor-not-allowed border border-white/5">
                       Résultats encore indisponibles
                     </div>
                   )}
                 </div>
              </section>

            </div>
          )}

          {/* Obsolete Pools Message */}
          {activeSession.status === 'POULES_EN_ATTENTE' && (
            <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-8 text-center text-red-700 shadow-sm relative overflow-hidden">
               <div className="text-4xl mb-4 animate-bounce">🚨</div>
               <h2 className="text-2xl font-black mb-2">NOUVELLES POULES EN ATTENTE</h2>
               <p className="font-bold mb-1">Un ou plusieurs joueurs se sont désinscrits à la dernière minute.</p>
               <p className="text-red-600">Les anciennes poules sont devenues obsolètes et seront recalculées par l'équipe d'organisation au plus vite.</p>
            </div>
          )}
        </div>
      ) : (
        <section className="bg-white border border-gray-100 p-12 rounded-3xl shadow-sm text-center">
          <div className="text-6xl mb-4">💤</div>
          <p className="text-gray-500 font-bold text-lg">Aucune session n'est planifiée par le Board pour le moment.</p>
        </section>
      )}
      
      {/* Quick stats / info */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
         <div className="flex bg-orange-50 rounded-full w-12 h-12 items-center justify-center text-orange-500 text-xl font-bold">
            ⚠️
         </div>
         <div className="flex-1 ml-4">
            <h3 className="text-gray-800 font-bold">Cartons Jaunes</h3>
            <p className="text-gray-500 text-sm">Vous avez {user.yellowCards} carton(s) jaune(s)</p>
         </div>
         {user.yellowCards > 0 && (
           <div className="text-red-500 font-bold">Attention !</div>
         )}
      </section>
    </div>
  );
}
