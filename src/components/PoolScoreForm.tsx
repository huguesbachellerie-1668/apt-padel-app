'use client';

import { useState, useEffect, useRef } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { saveScoresAction, registerPlayersNextSession } from '@/app/pool/[id]/actions';
import { Prisma } from '@prisma/client';

type PoolWithDetails = Prisma.PoolGetPayload<{
  include: {
    session: true;
    players: {
      include: { user: true };
    };
    matches: {
      include: {
        team1Player1: true;
        team1Player2: true;
        team2Player1: true;
        team2Player2: true;
      };
    };
  };
}>;

type PoolScoreFormProps = {
  pool: PoolWithDetails;
  partnerPool?: PoolWithDetails | null;
  nextSession: { id: string; date: Date } | null;
  canEditScores: boolean;
};

export default function PoolScoreForm({ pool, partnerPool, nextSession, canEditScores }: PoolScoreFormProps) {
  const isPairedTournament = Boolean(pool.session.isTournament && partnerPool);
  const poolA = isPairedTournament && partnerPool
    ? (pool.level < partnerPool.level ? pool : partnerPool)
    : pool;
  const poolB = isPairedTournament && partnerPool
    ? (pool.level < partnerPool.level ? partnerPool : pool)
    : null;

  // Build ordered list of matches to display (3 for classic, 6 for paired tournament)
  const displayMatches = (() => {
    if (!isPairedTournament || !poolB) {
      return pool.matches.map((m, idx) => ({
        formIndex: idx + 1,
        match: m,
        label: `Match ${m.order}`,
        subLabel: null as string | null,
      }));
    }
    const items: {
      formIndex: number;
      match: PoolWithDetails['matches'][0];
      label: string;
      subLabel: string | null;
    }[] = [];
    for (let rot = 1; rot <= 3; rot++) {
      const mA = poolA.matches.find(m => m.order === rot);
      const mB = poolB.matches.find(m => m.order === rot);
      if (mA) {
        items.push({
          formIndex: items.length + 1,
          match: mA,
          label: `Rotation ${rot} — Terrain ${poolA.level}`,
          subLabel: rot === 1 ? 'Équipe 1 vs Équipe 2' : rot === 2 ? 'Équipe 1 vs Équipe 3' : 'Équipe 1 vs Équipe 4'
        });
      }
      if (mB) {
        items.push({
          formIndex: items.length + 1,
          match: mB,
          label: `Rotation ${rot} — Terrain ${poolB.level}`,
          subLabel: rot === 1 ? 'Équipe 3 vs Équipe 4' : rot === 2 ? 'Équipe 2 vs Équipe 4' : 'Équipe 2 vs Équipe 3'
        });
      }
    }
    return items;
  })();

  const allPlayers = isPairedTournament && poolB
    ? [...poolA.players, ...poolB.players]
    : pool.players;

  const totalExpectedMatches = displayMatches.length;
  const allMatchesFinishedInitial =
    displayMatches.length === totalExpectedMatches &&
    displayMatches.every(dm => dm.match.team1Games !== null && dm.match.team2Games !== null);
  
  const [currentScores, setCurrentScores] = useState<Record<number, {t1: string, t2: string}>>(() => {
     const init: Record<number, {t1: string, t2: string}> = {};
     displayMatches.forEach(dm => {
         if (dm.match.team1Games !== null && dm.match.team2Games !== null) {
             init[dm.formIndex] = { t1: String(dm.match.team1Games), t2: String(dm.match.team2Games) };
         }
     });
     return init;
  });

  const [hasPromptedModal, setHasPromptedModal] = useState(allMatchesFinishedInitial); // if already finished before rendering, don't pop up again
  const [showModal, setShowModal] = useState(false);
  const [playersNextStatus, setPlayersNextStatus] = useState<Record<string, boolean>>({});
  const [isRegistering, setIsRegistering] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize checklist state securely
  useEffect(() => {
     const st: Record<string, boolean> = {};
     allPlayers.forEach(p => {
        st[p.userId] = true; // Par défaut: inscrits
     });
     setPlayersNextStatus(st);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.id, partnerPool?.id]);

  // Listen to input changes dynamically without React formal state bindings
  const handleInputBlur = () => {
     if (!formRef.current) return;
     const formData = new FormData(formRef.current);
     
     let allFilled = true;
     const newScores: Record<number, {t1: string, t2: string}> = {};
     for (let i = 1; i <= totalExpectedMatches; i++) {
        const t1 = formData.get(`m${i}_t1`) as string;
        const t2 = formData.get(`m${i}_t2`) as string;
        if (!t1 || !t2) {
           allFilled = false;
        } else {
           newScores[i] = {t1, t2};
        }
     }

     setCurrentScores(newScores);

     if (allFilled && !hasPromptedModal) {
        setHasPromptedModal(true);
        setShowModal(true);
     }
  };

  const generateWhatsAppText = () => {
      let text = isPairedTournament && poolB
        ? `🏆 *Scores Tournoi — Poules ${poolA.level} & ${poolB.level}*\n\n`
        : `🎾 *Scores Poule ${pool.level}*\n\n`;
      displayMatches.forEach(dm => {
          const m = dm.match;
          const s = currentScores[dm.formIndex];
          if (s) {
              const p1 = m.team1Player1.nickname || m.team1Player1.name.split(' ')[0];
              const p2 = m.team1Player2.nickname || m.team1Player2.name.split(' ')[0];
              const p3 = m.team2Player1.nickname || m.team2Player1.name.split(' ')[0];
              const p4 = m.team2Player2.nickname || m.team2Player2.name.split(' ')[0];
              text += `${p1} & ${p2}  *${s.t1} - ${s.t2}*  ${p3} & ${p4}\n`;
          }
      });
      const standings = allPlayers.map(pt => {
          let sessionPoints = 0;
          let wins = 0;
          let draws = 0;
          let losses = 0;
          
          displayMatches.forEach(dm => {
              const m = dm.match;
              const s = currentScores[dm.formIndex];
              if (!s) return;
              
              const isTeam1 = m.team1Player1Id === pt.userId || m.team1Player2Id === pt.userId;
              const isTeam2 = m.team2Player1Id === pt.userId || m.team2Player2Id === pt.userId;
              
              if (!isTeam1 && !isTeam2) return;
              
              const myGames = isTeam1 ? parseInt(s.t1) : parseInt(s.t2);
              const theirGames = isTeam1 ? parseInt(s.t2) : parseInt(s.t1);
                                 
              if (!isNaN(myGames) && !isNaN(theirGames)) {
                  sessionPoints += myGames;
                  if (myGames > theirGames) { sessionPoints += 30; wins++; }
                  else if (myGames === theirGames) { sessionPoints += 20; draws++; }
                  else { sessionPoints += 10; losses++; }
              }
          });
          return { player: pt.user, wins, draws, losses, sessionPoints };
      });
      
      standings.sort((a, b) => b.sessionPoints - a.sessionPoints);
      const topPlayers = standings.filter(s => s.wins === 3 || (s.wins === 2 && s.draws === 1));
      const flopPlayers = standings.filter(s => s.losses === 3);
      
      if (topPlayers.length > 0 || flopPlayers.length > 0) {
          text += `\n`;
          if (topPlayers.length > 0) {
              text += `🏆 *TOP* : ${topPlayers.map(tp => `${tp.player.nickname || tp.player.name.split(' ')[0]} (Moy: ${(tp.sessionPoints / 3).toFixed(2).replace('.', ',')})`).join(', ')}\n`;
          }
          if (flopPlayers.length > 0) {
              text += `💩 *FLOP* : ${flopPlayers.map(fp => `${fp.player.nickname || fp.player.name.split(' ')[0]} (Moy: ${(fp.sessionPoints / 3).toFixed(2).replace('.', ',')})`).join(', ')}\n`;
          }
      }

      if (nextSession) {
          text += `\n📅 *Présents prochaine session (${new Date(nextSession.date).toLocaleDateString('fr-FR')})* :\n`;
          let hasPresences = false;
          allPlayers.forEach(p => {
              if (playersNextStatus[p.userId]) {
                  text += `- ${p.user.nickname || p.user.name.split(' ')[0]}\n`;
                  hasPresences = true;
              }
          });
          if (!hasPresences) {
              text += `(Aucun inscrit pour le moment)\n`;
          }
      }
      return text;
  };

  const handleFinalize = async () => {
    setIsRegistering(true);
    
    // 1. WhatsApp Share (déclenché immédiatement pour éviter les bloqueurs de pop-ups)
    const textToShare = generateWhatsAppText();
    if (navigator.share && navigator.canShare && navigator.canShare({ text: textToShare })) {
        navigator.share({ title: "APT Padel", text: textToShare }).catch(e => console.log(e));
    } else {
        const encodedText = encodeURIComponent(textToShare);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }

    // 2. Enregistrement en base de données
    try {
        if (nextSession) {
            const usersToRegister = Object.keys(playersNextStatus).filter(uid => playersNextStatus[uid]);
            await registerPlayersNextSession(nextSession.id, usersToRegister);
        }
        
        if (formRef.current) {
            const formData = new FormData(formRef.current);
            formData.set('redirect', 'true');
            await saveScoresAction(formData);
        }
    } catch(e) {
        console.error("Failed to finalize", e);
        setIsRegistering(false);
    }
  };

  const isTournamentStyle = Boolean(pool.session.isTournament);

  return (
    <>
      <form ref={formRef} action={saveScoresAction} className="space-y-8" onBlur={handleInputBlur}>
          <input type="hidden" name="poolId" value={pool.id} />
          {partnerPool && <input type="hidden" name="partnerPoolId" value={partnerPool.id} />}
          <input type="hidden" name="sessionId" value={pool.sessionId} />
          
          {displayMatches.map(dm => {
              const m = dm.match;
              return (
              <div key={m.id} className={`border-2 rounded-2xl overflow-hidden transition-colors ${isTournamentStyle ? 'border-blue-100 hover:border-blue-300' : 'border-gray-100 hover:border-orange-200'}`}>
                  <div className={`px-5 py-3 font-bold text-white flex flex-wrap justify-between items-center gap-2 ${isTournamentStyle ? 'bg-gradient-to-r from-blue-800 to-indigo-900' : 'bg-gradient-to-r from-club-green to-emerald-800'}`}>
                    <div className="flex items-center gap-2">
                      <span>{dm.label}</span>
                      {dm.subLabel && (
                        <span className="text-xs font-bold bg-blue-950/60 text-blue-200 px-2.5 py-0.5 rounded-full border border-blue-600">
                          {dm.subLabel}
                        </span>
                      )}
                    </div>
                    {m.team1Games !== null ? <span className="text-orange-300 text-sm">Terminé</span> : <span className="text-blue-200 text-sm">En attente</span>}
                  </div>
                  <div className="flex flex-col md:flex-row p-6 gap-6 items-center justify-between bg-white">
                      <input type="hidden" name={`m${dm.formIndex}_id`} value={m.id} />
                      
                      <div className="flex-1 text-center md:text-right">
                          <div className={`font-black text-xl px-4 py-2 rounded-xl inline-block border shadow-sm ${isTournamentStyle ? 'text-blue-900 bg-blue-50 border-blue-200' : 'text-orange-900 bg-orange-50 border-orange-200'}`}>
                            {m.team1Player1.nickname || m.team1Player1.name.split(' ')[0]} <span className="text-gray-400">&</span> {m.team1Player2.nickname || m.team1Player2.name.split(' ')[0]}
                          </div>
                      </div>
                      
                      {canEditScores && pool.session.status !== 'TERMINEE' ? (
                          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                              <input type="number" name={`m${dm.formIndex}_t1`} defaultValue={m.team1Games ?? ''} min="0" max="20" placeholder="Jeux" required className={`w-20 h-14 border-2 rounded-xl text-center font-black text-2xl focus:outline-none focus:ring-4 ${isTournamentStyle ? 'border-blue-300 text-blue-700 focus:ring-blue-200' : 'border-orange-300 text-orange-600 focus:ring-orange-200'}`} />
                              <span className="font-black text-gray-400 text-2xl">-</span>
                              <input type="number" name={`m${dm.formIndex}_t2`} defaultValue={m.team2Games ?? ''} min="0" max="20" placeholder="Jeux" required className={`w-20 h-14 border-2 rounded-xl text-center font-black text-2xl focus:outline-none focus:ring-4 ${isTournamentStyle ? 'border-indigo-300 text-indigo-700 focus:ring-indigo-200' : 'border-green-300 text-green-600 focus:ring-green-200'}`} />
                          </div>
                      ) : (
                          <div className="flex items-center gap-6 font-black text-4xl">
                              <span className={m.winningTeam === 1 ? (isTournamentStyle ? 'text-blue-600' : 'text-orange-500') : m.team1Games !== null ? 'text-gray-800' : 'text-gray-300'}>{m.team1Games ?? '-'}</span>
                              <span className="text-gray-200 text-2xl">-</span>
                              <span className={m.winningTeam === 2 ? (isTournamentStyle ? 'text-indigo-600' : 'text-green-500') : m.team2Games !== null ? 'text-gray-800' : 'text-gray-300'}>{m.team2Games ?? '-'}</span>
                          </div>
                      )}

                      <div className="flex-1 text-center md:text-left">
                          <div className={`font-black text-xl px-4 py-2 rounded-xl inline-block border ${isTournamentStyle ? 'text-indigo-900 bg-indigo-50 border-indigo-200' : 'text-green-900 bg-green-50 border-green-100'}`}>
                            {m.team2Player1.nickname || m.team2Player1.name.split(' ')[0]} <span className="text-gray-400">&</span> {m.team2Player2.nickname || m.team2Player2.name.split(' ')[0]}
                          </div>
                      </div>
                  </div>
              </div>
          )})}
          
          {canEditScores && pool.session.status !== 'TERMINEE' && (
              <div className="text-center pt-8 border-t border-gray-200">
                  {allMatchesFinishedInitial || hasPromptedModal ? (
                      <div className="flex flex-col items-center gap-4">
                        <button type="button" onClick={() => setShowModal(true)} className={`${isTournamentStyle ? 'bg-blue-700 hover:bg-blue-800' : 'bg-green-500 hover:bg-green-600'} text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.02] text-lg w-full md:w-auto animate-bounce-short`}>
                            ✅ Finaliser la session 👉
                        </button>
                      </div>
                  ) : (
                      <>
                        <p className="text-gray-500 mb-4 text-sm font-medium">Assurez-vous que les scores des {totalExpectedMatches} matchs sont saisis.</p>
                        <input type="hidden" name="redirect" value="false" />
                        <SubmitButton pendingText="Sauvegarde..." formAction={saveScoresAction} className={`${isTournamentStyle ? 'bg-blue-700 hover:bg-blue-800' : 'bg-orange-500 hover:bg-orange-600'} text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.02] text-lg w-full md:w-auto`}>
                            💾 Enregistrer les scores provisoires
                        </SubmitButton>
                      </>
                  )}
              </div>
          )}
      </form>

      {/* MODAL FINALISATION */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up max-h-[90vh] flex flex-col">
               <div className={`${isTournamentStyle ? 'bg-gradient-to-r from-blue-800 to-indigo-900' : 'bg-gradient-to-r from-club-green to-emerald-800'} p-6 text-white text-center relative shrink-0`}>
                  <button onClick={() => setShowModal(false)} type="button" className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                  <div className="text-4xl mb-3">✅</div>
                  <h3 className="text-2xl font-black">Finalisation</h3>
                  {nextSession && (
                     <p className="font-medium opacity-90 mt-1">Inscriptions pour la session du {new Date(nextSession.date).toLocaleDateString('fr-FR')}</p>
                  )}
               </div>
               
               <div className="p-6 space-y-4 overflow-y-auto">
                  {nextSession && allPlayers.map(p => {
                     const isYes = playersNextStatus[p.userId] === true;
                     return (
                        <div key={p.userId} className="flex justify-between items-center p-3 sm:p-4 border border-gray-100 rounded-2xl bg-gray-50">
                           <span className="font-bold text-gray-800 flex-1 flex items-center gap-1">
                             {(p.user.stars || 0) > 0 && <span className="text-yellow-400 drop-shadow-sm">{'⭐'.repeat(p.user.stars)}</span>}
                             {p.user.nickname || p.user.name}
                           </span>
                           <div className="flex bg-white rounded-full p-1 border border-gray-200 shadow-sm shrink-0">
                              <button 
                                 type="button"
                                 onClick={() => setPlayersNextStatus(prev => ({...prev, [p.userId]: true}))}
                                 className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${isYes ? 'bg-green-500 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                              >
                                Oui
                              </button>
                              <button 
                                 type="button"
                                 onClick={() => setPlayersNextStatus(prev => ({...prev, [p.userId]: false}))}
                                 className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${!isYes ? 'bg-red-500 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                              >
                                Non
                              </button>
                           </div>
                        </div>
                     )
                  })}

                  <div className="mt-8 space-y-4 pt-4 border-t border-gray-100">
                     <button 
                       onClick={handleFinalize} 
                       disabled={isRegistering}
                       className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-black py-4 rounded-2xl shadow-lg transition-transform transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                     >
                       {isRegistering ? 'Enregistrement en cours...' : '💬 Valider, Enregistrer et Partager'}
                     </button>
                  </div>
               </div>
            </div>
        </div>
      )}
    </>
  );
}
