'use client';

import { useState, useEffect, useRef } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { saveScoresAction, registerPlayersNextSession } from '@/app/pool/[id]/actions';
import WhatsAppShareTextButton from '@/components/WhatsAppShareTextButton';

type PoolScoreFormProps = {
  pool: any;
  nextSession: { id: string; date: Date } | null;
  canEditScores: boolean;
};

export default function PoolScoreForm({ pool, nextSession, canEditScores }: PoolScoreFormProps) {
  const allMatchesFinishedInitial = pool.matches.length === 3 && pool.matches.every((m: any) => m.team1Games !== null && m.team2Games !== null);
  
  const [currentScores, setCurrentScores] = useState<Record<string, {t1: string, t2: string}>>(() => {
     const init: Record<string, {t1: string, t2: string}> = {};
     pool.matches.forEach((m: any) => {
         if (m.team1Games !== null && m.team2Games !== null) {
             init[m.order] = { t1: String(m.team1Games), t2: String(m.team2Games) };
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
     pool.players.forEach((p: any) => {
        st[p.userId] = true; // Par défaut: inscrits
     });
     setPlayersNextStatus(st);
  }, [pool.players]);

  // Listen to input changes dynamically without React formal state bindings
  const handleInputBlur = () => {
     if (!formRef.current) return;
     const formData = new FormData(formRef.current);
     
     let allFilled = true;
     const newScores: Record<string, {t1: string, t2: string}> = {};
     for (let i = 1; i <= 3; i++) {
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
      let text = `🎾 *Scores Poule ${pool.level}*\n\n`;
      pool.matches.forEach((m: any) => {
          const s = currentScores[m.order];
          if (s) {
              const p1 = m.team1Player1.nickname || m.team1Player1.name.split(' ')[0];
              const p2 = m.team1Player2.nickname || m.team1Player2.name.split(' ')[0];
              const p3 = m.team2Player1.nickname || m.team2Player1.name.split(' ')[0];
              const p4 = m.team2Player2.nickname || m.team2Player2.name.split(' ')[0];
              text += `${p1} & ${p2}  *${s.t1} - ${s.t2}*  ${p3} & ${p4}\n`;
          }
      });

      if (nextSession) {
          text += `\n📅 *Présents prochaine session (${new Date(nextSession.date).toLocaleDateString('fr-FR')})* :\n`;
          let hasPresences = false;
          pool.players.forEach((p: any) => {
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

  return (
    <>
      <form ref={formRef} action={saveScoresAction} className="space-y-8" onBlur={handleInputBlur}>
          <input type="hidden" name="poolId" value={pool.id} />
          <input type="hidden" name="sessionId" value={pool.sessionId} />
          
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
                  {allMatchesFinishedInitial || hasPromptedModal ? (
                      <div className="flex flex-col items-center gap-4">
                        <button type="button" onClick={() => setShowModal(true)} className="bg-green-500 hover:bg-green-600 text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.02] text-lg w-full md:w-auto animate-bounce-short">
                            ✅ Finaliser la session 👉
                        </button>
                      </div>
                  ) : (
                      <>
                        <p className="text-gray-500 mb-4 text-sm font-medium">Assurez-vous que les scores des {pool.matches.length} matchs sont saisis.</p>
                        <input type="hidden" name="redirect" value="false" />
                        <SubmitButton pendingText="Sauvegarde..." formAction={saveScoresAction} className="bg-orange-500 hover:bg-orange-600 text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.02] text-lg w-full md:w-auto">
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
               <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 text-white text-center relative shrink-0">
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
                  {nextSession && pool.players.map((p: any) => {
                     const isYes = playersNextStatus[p.userId] === true;
                     return (
                        <div key={p.userId} className="flex justify-between items-center p-3 sm:p-4 border border-gray-100 rounded-2xl bg-gray-50">
                           <span className="font-bold text-gray-800 flex-1">{p.user.nickname || p.user.name}</span>
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
                     <WhatsAppShareTextButton 
                        textToShare={generateWhatsAppText()}
                        label="1. Partager sur WhatsApp"
                        className="w-full flex justify-center text-lg py-4"
                     />
                     <button 
                       onClick={handleFinalize} 
                       disabled={isRegistering}
                       className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg transition-transform transform hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
                     >
                       {isRegistering ? 'Enregistrement...' : '2. Valider et Terminer 👉'}
                     </button>
                  </div>
               </div>
            </div>
        </div>
      )}
    </>
  );
}
