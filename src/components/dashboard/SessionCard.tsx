import React from 'react';
import { registerForSession } from "@/app/actions";
import SubmitButton from "@/components/SubmitButton";
import UnregisterButtonWithWhatsApp from "@/components/UnregisterButtonWithWhatsApp";
import { Prisma } from '@prisma/client';

type SessionWithPools = Prisma.SessionGetPayload<{
  include: {
    pools: {
      include: { matches: true, courtReservation: true }
    }
  }
}>;

type UserRegistration = Prisma.RegistrationGetPayload<Record<string, never>>;
type UserPoolPlayer = Prisma.PoolPlayerGetPayload<{
  include: {
    pool: {
      include: { courtReservation: true }
    }
  }
}>;

interface SessionCardProps {
  activeSession: SessionWithPools;
  index: number;
  user: {
    id: string;
    nickname: string | null;
    name: string;
    role: string;
  };
  hasFinishedPool: boolean;
  allPoolsFinished: boolean;
  userRegistration: UserRegistration | null;
  userPoolPlayer: UserPoolPlayer | null;
  isUnregisterLocked: boolean;
}

export default function SessionCard({
  activeSession,
  index,
  user,
  hasFinishedPool,
  allPoolsFinished,
  userRegistration,
  userPoolPlayer,
  isUnregisterLocked
}: SessionCardProps) {
  const sessionDateObj = new Date(activeSession.date);
  const todayObj = new Date();
  const isToday = sessionDateObj.toDateString() === todayObj.toDateString();
  const isPast = sessionDateObj < todayObj && !isToday;
  
  let sessionTitle = isToday ? "Session Aujourd'hui" : (index === 0 ? "Prochaine Session" : "Session Suivante");
  if (isPast) sessionTitle = "Dernière Session jouée";

  return (
    <div className="space-y-6">
      {index > 0 && <hr className="my-10 border-slate-200" />}

      {/* Card 1: Inscription & Présence */}
      <section className="card-club rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-wrap justify-between items-center mb-5 gap-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-2xl">📋</span> {sessionTitle}
          </h2>
          {activeSession.status !== 'POULES_GENEREES' && (
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${activeSession.status === 'INSCRIPTIONS_OUVERTES' ? 'bg-club-green text-white shadow-sm' : activeSession.status === 'POULES_EN_ATTENTE' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
              {activeSession.status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <p className="text-md text-club-green font-black capitalize bg-club-green-light/50 p-3 rounded-xl border border-club-green-light inline-block m-0">
             Dimanche {new Date(activeSession.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' }).replace(':', 'h').replace(' à ', ' à partir de ')}
          </p>
        </div>

        {activeSession.status === 'INSCRIPTIONS_OUVERTES' && !isToday && (
          userRegistration ? (
            <div className="bg-green-50 border border-green-200 shadow-sm p-5 rounded-2xl text-center mb-4">
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
                  <><span className="mr-2">Me désinscrire</span><svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg></>
                ) : (
                  "Me désinscrire"
                )}
              </UnregisterButtonWithWhatsApp>
            </div>
          ) : (
            <form action={registerForSession.bind(null, activeSession.id)} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-4 shadow-inner">
              <div className="flex items-start gap-3 mb-5 text-left bg-white p-3 rounded-xl border border-slate-200">
                <input type="checkbox" id={`injury-${activeSession.id}`} name="isReturningFromInjury" value="true" className="w-5 h-5 mt-0.5 text-club-clay rounded border-slate-300 bg-white focus:ring-club-clay cursor-pointer flex-shrink-0 shadow-sm" />
                <label htmlFor={`injury-${activeSession.id}`} className="text-slate-700 text-sm font-bold cursor-pointer leading-tight">
                  Signaler un &quot;retour de blessure&quot; <br/><span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider block mt-1">Vous descendrez d&apos;une poule calculée pour ce dimanche.</span>
                </label>
              </div>
              <SubmitButton pendingText="Inscription..." className="w-full bg-club-clay hover:bg-orange-700 text-white font-black py-4 px-4 rounded-xl transition-all shadow-md flex justify-center items-center gap-2 text-lg">
                🎾 M'inscrire pour ce dimanche !
              </SubmitButton>
            </form>
          )
        )}

        {(activeSession.status === 'POULES_GENEREES' || activeSession.status === 'POULES_EN_ATTENTE') && !isToday && (
            userPoolPlayer ? (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 text-sm font-bold mb-4 flex items-center justify-between gap-3 shadow-sm">
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
              <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl border border-yellow-200 text-sm font-bold mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⏳</span> Vous êtes sur liste d&apos;attente.
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
          <div className="bg-slate-50 text-club-green p-5 rounded-2xl border border-slate-200 text-sm font-bold mb-4 text-center">
              L&apos;ouverture des inscriptions approche !
          </div>
        )}
        
        <a href={`/session/${activeSession.id}`} className="block text-center text-lg font-black text-white bg-club-green hover:bg-emerald-700 shadow-md py-4 rounded-xl transition-all hover:scale-[1.02]">
            🔎  Voir la Session 👉
        </a>
      </section>

      {/* Grid Layout for Matches & Results if generated */}
      {activeSession.status === 'POULES_GENEREES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 2: My Matches Input */}
          <section className="bg-emerald-50 border border-emerald-100 rounded-3xl shadow-sm p-6 text-slate-800 relative overflow-hidden group flex flex-col">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-200 opacity-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 relative z-10 text-emerald-800">
                <span className="text-2xl">🎾</span> Saisie des Scores
              </h2>
              {userPoolPlayer ? (
                <div className="space-y-4 relative z-10 flex flex-col h-full justify-between">
                  <div className="bg-white/60 p-5 border border-emerald-100 rounded-2xl backdrop-blur-sm flex flex-col gap-1">
                    <p className="text-3xl font-black text-emerald-800 mb-2">Poule #{userPoolPlayer.pool.level}</p>
                    {userPoolPlayer.pool.courtReservation && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1">
                          <div className="bg-white text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-center gap-2 text-xl font-black">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5h16M4 19h16M4 5v14M20 5v14M12 5v14M4 12h16"></path></svg> 
                            {userPoolPlayer.pool.courtReservation.name}
                          </div>
                          <div className="bg-white text-emerald-700 px-4 py-3 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-center gap-2 text-xl font-black">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 
                            {userPoolPlayer.pool.courtReservation.startTime}
                          </div>
                      </div>
                    )}
                  </div>
                  <a href={`/pool/${userPoolPlayer.poolId}`} className="block text-center bg-club-green text-white font-black py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-md hover:bg-emerald-700">
                    Voir Ma Poule 👉
                  </a>
                </div>
              ) : (
                <div className="bg-slate-100/50 p-5 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 h-full flex items-center justify-center text-center">
                  Reposez-vous bien. Revenez la semaine prochaine pour jouer sur les terrains !
                </div>
              )}
          </section>

          {/* Card 3: Session Results / Rankings */}
          <section className="bg-slate-50 border border-slate-200 rounded-3xl shadow-sm p-6 text-slate-800 relative overflow-hidden group flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200 opacity-20 rounded-full blur-3xl group-hover:bg-slate-300 transition-colors"></div>
            
            <div className="relative z-10 flex-1 flex flex-col">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800">
                <span className="text-2xl">🏆</span> Résultats
              </h2>
              <div className="space-y-4 relative z-10 flex flex-col h-full justify-between">
                {(hasFinishedPool || allPoolsFinished) && (
                  <div className="bg-white/10 p-5 border border-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center text-center flex-1">
                    {allPoolsFinished ? (
                      <div className="font-bold text-club-gold">
                        <span className="text-4xl block mb-3 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">🎉</span>
                        Tous les scores sont validés !<br/>Le classement final est prêt.
                      </div>
                    ) : (
                      <div className="font-bold text-slate-500">
                        Certaines poules se sont terminées.<br/>Les résultats tombent en direct !
                      </div>
                    )}
                  </div>
                )}
                {allPoolsFinished ? (
                  <a href={`/session/${activeSession.id}/results`} className={`block text-center font-black py-4 px-6 rounded-xl transition-transform transform hover:scale-105 shadow-sm bg-club-gold text-slate-900 hover:bg-yellow-500`}>
                    Consulter les résultats définitifs
                  </a>
                ) : (
                  <div className="bg-slate-100 text-center font-bold py-4 px-6 rounded-xl text-slate-400 cursor-not-allowed border border-slate-200">
                    Les résultats seront disponibles à la fin de toutes les poules
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Obsolete Pools Message */}
      {activeSession.status === 'POULES_EN_ATTENTE' && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center text-red-700 shadow-sm relative overflow-hidden">
            <div className="text-4xl mb-4 animate-bounce">🚨</div>
            <h2 className="text-2xl font-black mb-2">NOUVELLES POULES EN ATTENTE</h2>
            <p className="font-bold mb-1">Un ou plusieurs joueurs se sont désinscrits à la dernière minute.</p>
            <p className="text-red-600">Les anciennes poules sont devenues obsolètes et seront recalculées par l&apos;équipe d&apos;organisation au plus vite.</p>
        </div>
      )}
    </div>
  );
}
