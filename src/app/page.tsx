import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { registerForSession, unregisterFromSession } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import UnregisterButtonWithWhatsApp from "@/components/UnregisterButtonWithWhatsApp";

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Rank calculation
  const rankedPlayers = await prisma.user.findMany({
    where: { totalMatches: { gt: 0 } },
    orderBy: { averagePoints: 'desc' },
    select: { id: true }
  });
  const rankIndex = rankedPlayers.findIndex((p: { id: string }) => p.id === user.id);
  const rank = rankIndex !== -1 ? `${rankIndex + 1}` : '-';

  // Settings for limits
  const globalSettings = await prisma.settings.findUnique({ where: { id: 'global' } });
  const lockDay = globalSettings?.lockUnregisterDay ?? 5;
  const lockTime = globalSettings?.lockUnregisterTime ?? "20:00";

  // Get ALL active sessions
  const activeSessions = await prisma.session.findMany({
    where: { status: { in: ['PREVUE', 'INSCRIPTIONS_OUVERTES', 'POULES_GENEREES', 'POULES_EN_ATTENTE'] } },
    orderBy: { date: 'asc' },
    include: {
      pools: {
        include: { matches: true, courtReservation: true }
      }
    }
  });

  const sessionsData = await Promise.all(activeSessions.map(async (session) => {
    let hasFinishedPool = false;
    let allPoolsFinished = false;
    if (session.status === 'POULES_GENEREES' && session.pools) {
      const finishedPools = session.pools.filter((p: any) => p.matches.length === 3 && p.matches.every((m: any) => m.team1Games !== null && m.team2Games !== null));
      hasFinishedPool = finishedPools.length > 0;
      allPoolsFinished = session.pools.length > 0 && finishedPools.length === session.pools.length;
    }

    const userRegistration = await prisma.registration.findFirst({
      where: { userId: user.id, sessionId: session.id }
    });

    let userPoolPlayer = null;
    if (session.status === 'POULES_GENEREES' || session.status === 'POULES_EN_ATTENTE') {
      if (userRegistration) {
        userPoolPlayer = await prisma.poolPlayer.findFirst({
          where: { userId: user.id, pool: { sessionId: session.id } },
          include: { 
            pool: {
              include: { courtReservation: true }
            } 
          }
        });
      }
    }

    // Check lockdown
    let isUnregisterLocked = false;
    const sessionDate = new Date(session.date);
    const lockdownDate = new Date(sessionDate);
    lockdownDate.setHours(0, 0, 0, 0);
    const daysToSubtract = (lockdownDate.getDay() - lockDay + 7) % 7;
    lockdownDate.setDate(lockdownDate.getDate() - daysToSubtract);
    const [hours, minutes] = lockTime.split(':').map(Number);
    lockdownDate.setHours(hours, minutes, 0, 0);

    const now = new Date();
    // Enable lockdown only for simple users, and only if deadline is passed.
    if (now > lockdownDate && !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role)) {
      isUnregisterLocked = true;
    }

    return {
      session,
      hasFinishedPool,
      allPoolsFinished,
      userRegistration,
      userPoolPlayer,
      isUnregisterLocked
    };
  }));

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
            <span className="text-3xl font-black text-blue-900">{user.averagePoints.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-orange-100">
            <span className="text-sm text-orange-600 font-semibold mb-1">Sessions jouées</span>
            <span className="text-3xl font-black text-orange-900">{Math.floor(user.totalMatches / 3)}</span>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-green-100">
            <span className="text-sm text-green-600 font-semibold mb-1">TOP (Invaincu)</span>
            <span className="text-3xl font-black text-green-700">{user.tops}</span>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-red-100">
            <span className="text-sm text-red-600 font-semibold mb-1">FLOP (3 Défaites)</span>
            <span className="text-3xl font-black text-red-700">{user.flops}</span>
          </div>
          <a href={`/profile/${user.id}`} className="bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-md transform transition-transform hover:scale-105 border border-gray-900">
            <span className="text-2xl mb-1">👤</span>
            <span className="text-xs text-white uppercase font-black tracking-widest text-center mt-1">Stats Complètes</span>
          </a>
        </div>
      </section>

      {/* Dynamic Session Dashboard (Multiple Sessions support) */}
      {sessionsData.length > 0 ? (
        <div className="space-y-12 pb-6">
          {sessionsData.map(({ session: activeSession, hasFinishedPool, allPoolsFinished, userRegistration, userPoolPlayer, isUnregisterLocked }, index) => (
             <div key={activeSession.id} className="space-y-6">
                
                {index > 0 && <hr className="my-10 border-gray-200" />}

                {/* Card 1: Inscription & Présence */}
                <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
                  <div className="flex flex-wrap justify-between items-center mb-5 gap-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <span className="text-2xl">📋</span> {index === 0 ? "Prochaine Session" : "Session Suivante"}
                    </h2>
                    {activeSession.status !== 'POULES_GENEREES' && (
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${activeSession.status === 'INSCRIPTIONS_OUVERTES' ? 'bg-orange-500 text-white' : activeSession.status === 'POULES_EN_ATTENTE' ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-700'}`}>
                        {activeSession.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    <p className="text-md text-blue-900 font-black capitalize bg-blue-50 p-3 rounded-xl border border-blue-100 inline-block m-0">
                       Dimanche {new Date(activeSession.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' }).replace(':', 'h')}
                    </p>
                    {new Date(activeSession.date).toDateString() === new Date().toDateString() && (
                       <span className="bg-red-500 text-white text-xs font-black uppercase px-3 py-1.5 rounded-full animate-pulse shadow-sm border border-red-600">
                          Aujourd'hui !
                       </span>
                    )}
                  </div>

                  {activeSession.status === 'INSCRIPTIONS_OUVERTES' && (
                    userRegistration ? (
                      <div className="bg-green-500/10 border border-green-200 p-5 rounded-2xl text-center mb-4">
                        <p className="font-black text-green-700 flex items-center justify-center gap-2 mb-4 text-lg">
                          ✅ Vous êtes bien inscrit(e) sur la liste !
                        </p>
                        <UnregisterButtonWithWhatsApp
                          sessionId={activeSession.id}
                          sessionDate={new Date(activeSession.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          userName={user.nickname || user.name.split(' ')[0]}
                          isLocked={isUnregisterLocked}
                          className={`text-sm border py-2.5 px-6 rounded-xl transition-colors shadow-sm font-bold ${isUnregisterLocked ? 'border-orange-200 text-orange-700 hover:bg-orange-50 bg-orange-100 flex items-center justify-center gap-2 mx-auto' : 'border-red-200 text-red-600 hover:bg-red-50 bg-white'}`}
                        >
                          {isUnregisterLocked ? (
                            <><span>Me désinscrire</span><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg></>
                          ) : (
                            "Me désinscrire"
                          )}
                        </UnregisterButtonWithWhatsApp>
                      </div>
                    ) : (
                      <form action={registerForSession.bind(null, activeSession.id)} className="bg-orange-50 p-5 rounded-2xl border border-orange-100 mb-4">
                        <div className="flex items-start gap-3 mb-5 text-left bg-white/50 p-3 rounded-xl">
                          <input type="checkbox" id={`injury-${activeSession.id}`} name="isReturningFromInjury" value="true" className="w-5 h-5 mt-0.5 text-orange-500 rounded border-orange-300 focus:ring-orange-500 cursor-pointer flex-shrink-0 shadow-sm" />
                          <label htmlFor={`injury-${activeSession.id}`} className="text-orange-900 text-sm font-bold cursor-pointer leading-tight">
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
                         <UnregisterButtonWithWhatsApp
                           sessionId={activeSession.id}
                           sessionDate={new Date(activeSession.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                           userName={user.nickname || user.name.split(' ')[0]}
                           className="text-xs border border-red-200 text-red-600 bg-white hover:bg-red-50 py-1.5 px-3 rounded-lg font-bold transition-colors"
                         >
                           Me désinscrire
                         </UnregisterButtonWithWhatsApp>
                       </div>
                     ) : userRegistration ? (
                       <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-200 text-sm font-bold mb-4 flex items-center justify-between gap-3">
                         <div className="flex items-center gap-3">
                           <span className="text-xl">⏳</span> Vous êtes sur liste d'attente.
                         </div>
                         <UnregisterButtonWithWhatsApp
                           sessionId={activeSession.id}
                           sessionDate={new Date(activeSession.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                           userName={user.nickname || user.name.split(' ')[0]}
                           className="text-xs border border-red-200 text-red-600 bg-white hover:bg-red-50 py-1.5 px-3 rounded-lg font-bold transition-colors"
                         >
                           Me désinscrire
                         </UnregisterButtonWithWhatsApp>
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
                           <div className="bg-white/10 p-5 border border-white/20 rounded-2xl backdrop-blur-sm flex flex-col gap-1">
                              <p className="text-3xl font-black text-white mb-2">Poule #{userPoolPlayer.pool.level}</p>
                              {userPoolPlayer.pool.courtReservation && (
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1">
                                   <div className="bg-white text-orange-600 px-4 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 text-xl font-black">
                                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5h16M4 19h16M4 5v14M20 5v14M12 5v14M4 12h16"></path></svg> 
                                     {userPoolPlayer.pool.courtReservation.name}
                                   </div>
                                   <div className="bg-white text-orange-600 px-4 py-3 rounded-xl shadow-md flex items-center justify-center gap-2 text-xl font-black">
                                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                                     {userPoolPlayer.pool.courtReservation.startTime}
                                   </div>
                                </div>
                              )}
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
          ))}
        </div>
      ) : (
        <section className="bg-white border border-gray-100 p-12 rounded-3xl shadow-sm text-center">
          <div className="text-6xl mb-4">💤</div>
          <p className="text-gray-500 font-bold text-lg">Aucune session n'est planifiée par le Board pour le moment.</p>
        </section>
      )}
      
      {/* Quick stats / info */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between mt-6">
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
