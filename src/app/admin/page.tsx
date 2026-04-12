import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createSeason, createSession, updateSessionStatus, generatePools, finishSessionAndCalculatePoints, reopenSession, updateSessionCourtsAction } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') redirect("/");

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
  const sessions = activeSeason ? await prisma.session.findMany({ 
    where: { seasonId: activeSeason.id },
    orderBy: { date: 'desc' }
  }) : [];

  const activeSessions = sessions.filter(s => s.status !== 'TERMINEE');
  const closedSessions = sessions.filter(s => s.status === 'TERMINEE');

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <span className="text-4xl">⚙️</span> Administration Board APT
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Interface centralisée de gestion du club APT</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              👥 Joueurs
            </h2>
            <p className="text-gray-500 mb-5 font-medium">Ajouter de nouveaux membres, éditer leurs rôles ou informations.</p>
          </div>
          <a href="/admin/joueurs" className="inline-flex bg-gray-800 text-white font-bold py-3 px-6 rounded-2xl hover:bg-gray-900 transition-colors shadow-sm border-b-4 border-gray-950 items-center justify-center gap-2 text-sm w-fit">
            <span>Ouvrir l'annuaire 👉</span>
          </a>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              🏟️ Clubs de Padel
            </h2>
            <p className="text-gray-500 mb-5 font-medium">Gérez le dictionnaire des lieux (noms, adresses) pour réserver les terrains plus tard.</p>
          </div>
          <a href="/admin/clubs" className="inline-flex bg-gray-800 text-white font-bold py-3 px-6 rounded-2xl hover:bg-gray-900 transition-colors shadow-sm border-b-4 border-gray-950 items-center justify-center gap-2 text-sm w-fit">
            <span>Gérer les Clubs 👉</span>
          </a>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              📢 Communication
            </h2>
            <p className="text-gray-500 mb-5 font-medium">Pilotez la page Le Club : publiez des News, présentez vos Sponsors ou la Boutique.</p>
          </div>
          <a href="/admin/communication" className="inline-flex bg-orange-600 text-white font-bold py-3 px-6 rounded-2xl hover:bg-orange-700 transition-colors shadow-sm border-b-4 border-orange-800 active:border-b-0 active:mt-[4px] items-center justify-center gap-2 text-sm w-fit">
            <span>Gérer la vitrine 👉</span>
          </a>
        </div>
      </div>

      {!activeSeason ? (
        <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-orange-500 text-center max-w-2xl mx-auto mt-10">
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="text-2xl font-black text-orange-800 mb-4">Lancement d'une nouvelle saison</h2>
          <p className="text-gray-600 mb-8">Pour organiser des matchs, vous devez d'abord initialiser une saison active (ex: Saison 2026-2027).</p>
          <form action={createSeason} className="flex flex-col gap-4 max-w-md mx-auto">
            <input name="name" type="text" placeholder="Ex: Saison 2026-2027" className="border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none" required />
            <SubmitButton pendingText="Démarrage..." className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 shadow-md transition-transform hover:scale-105">
              Démarrer la saison
            </SubmitButton>
          </form>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Season Info */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-6 rounded-3xl shadow-lg flex justify-between items-center text-white">
            <div>
              <p className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-1">Saison Active</p>
              <h2 className="text-3xl font-black">{activeSeason.name}</h2>
              <p className="text-sm mt-2 text-blue-100">Démarrée le {activeSeason.startDate.toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-orange-500">{sessions.length}</div>
              <div className="text-sm text-blue-200 font-medium">Session(s)</div>
            </div>
          </div>

          {/* Sessions Management */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              📅 Gestion des Sessions
            </h2>
            
            <form action={createSession} className="flex flex-wrap gap-4 mb-8 bg-blue-50/50 p-6 rounded-2xl border border-blue-100 items-end">
              <input type="hidden" name="seasonId" value={activeSeason.id} />
              <div className="flex-1 flex flex-col sm:flex-row gap-4 min-w-[250px] bg-white p-3 rounded-2xl border border-blue-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                <div className="flex-1">
                  <label className="text-xs font-black text-blue-600 uppercase tracking-widest block mb-2 px-1">📅 Date</label>
                  <input name="date_part" type="date" className="border-2 border-gray-100 bg-gray-50 p-2.5 rounded-xl w-full text-gray-800 font-bold focus:bg-white focus:border-blue-500 transition-colors" required />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-black text-blue-600 uppercase tracking-widest block mb-2 px-1">🕒 Heure</label>
                  <input name="time_part" type="time" defaultValue="18:30" className="border-2 border-gray-100 bg-gray-50 p-2.5 rounded-xl w-full text-gray-800 font-bold focus:bg-white focus:border-blue-500 transition-colors" required />
                </div>
              </div>
              <div className="w-[140px]">
                <label className="block text-sm font-bold text-blue-900 mb-2">Terrains</label>
                <input name="courts" type="number" min="1" max="20" defaultValue="1" className="border-2 border-gray-200 p-3 rounded-xl w-full text-gray-700 bg-white focus:border-blue-500 focus:ring-0" required />
              </div>
              <SubmitButton pendingText="Création..." className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-colors whitespace-nowrap">
                + Créer la session
              </SubmitButton>
            </form>

            <div className="space-y-4">
              {activeSessions.map(session => (
                <div key={session.id} className={`border-2 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 justify-between items-center transition-all ${
                  session.status === 'PREVUE' ? 'border-gray-200 bg-gray-50' : 
                  session.status === 'INSCRIPTIONS_OUVERTES' ? 'border-green-400 bg-green-50 shadow-md transform scale-[1.01]' : 
                  session.status === 'POULES_GENEREES' ? 'border-orange-400 bg-orange-50' : 
                  session.status === 'POULES_EN_ATTENTE' ? 'border-red-400 bg-red-50 shadow-md animate-pulse' : 
                  'border-gray-100 opacity-70'
                }`}>
                  <div>
                    <div className="font-black text-xl text-gray-800">
                      {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' }).replace(':', 'h')}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-500 font-medium">Statut actuel :</span>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        session.status === 'PREVUE' ? 'bg-gray-200 text-gray-700' : 
                        session.status === 'INSCRIPTIONS_OUVERTES' ? 'bg-green-500 text-white animate-pulse' : 
                        session.status === 'POULES_GENEREES' ? 'bg-orange-500 text-white' : 
                        session.status === 'POULES_EN_ATTENTE' ? 'bg-red-600 text-white animate-pulse' : 
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {session.status === 'PREVUE' && (
                      <form action={updateSessionStatus.bind(null, session.id, 'INSCRIPTIONS_OUVERTES')} className="w-full sm:w-auto">
                        <SubmitButton pendingText="Ouverture..." className="w-full bg-green-500 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-green-600 transition-colors">
                          Ouvrir Inscriptions 🟢
                        </SubmitButton>
                      </form>
                    )}
                    {session.status === 'INSCRIPTIONS_OUVERTES' && (
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <form action={updateSessionCourtsAction} className="flex items-center gap-2 bg-blue-50 p-2 rounded-xl border border-blue-200">
                           <input type="hidden" name="sessionId" value={session.id} />
                           <div>
                             <label className="text-xs font-bold text-blue-800 block mb-1">✏️ Terrains</label>
                             <input name="courts" type="number" min="1" max="20" defaultValue={session.courts > 0 ? session.courts : 1} className="w-20 p-2 border border-blue-300 rounded-lg text-sm font-bold text-center" />
                           </div>
                           <SubmitButton pendingText="Sauvegarde..." className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors h-full">
                             Sauver 💾
                           </SubmitButton>
                        </form>

                        <form action={generatePools} className="flex items-center gap-2 bg-orange-50 p-2 rounded-xl border border-orange-200">
                          <input type="hidden" name="sessionId" value={session.id} />
                          <input type="hidden" name="courtsCount" value={session.courts > 0 ? session.courts : 1} />
                          <SubmitButton pendingText="Génération..." className="w-full bg-orange-500 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-orange-600 transition-colors h-full whitespace-nowrap">
                            Générer les Poules 🎲
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                    {session.status === 'POULES_GENEREES' && (
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <form action={reopenSession.bind(null, session.id)}>
                          <SubmitButton pendingText="Annulation..." className="w-full bg-red-500 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-red-600 transition-colors">
                            Annuler les Poules ⏪
                          </SubmitButton>
                        </form>
                        <form action={finishSessionAndCalculatePoints.bind(null, session.id)}>
                          <SubmitButton pendingText="Fermeture..." className="w-full bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                            Terminer session 🏁
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                    {session.status === 'POULES_EN_ATTENTE' && (
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <form action={generatePools} className="flex items-center gap-2 bg-red-100 p-2 rounded-xl border border-red-300">
                          <input type="hidden" name="sessionId" value={session.id} />
                          <input type="hidden" name="courtsCount" value={session.courts > 0 ? session.courts : 1} />
                          <SubmitButton pendingText="Recalcul..." className="w-full bg-red-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-red-700 transition-colors h-full whitespace-nowrap">
                            Recalculer les Poules 🎲
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activeSessions.length === 0 && (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="text-4xl mb-3">🕸️</div>
                  <p className="font-medium">Aucune session en cours ou prévue.</p>
                  <p className="text-sm">Utilisez le formulaire ci-dessus pour planifier le prochain dimanche !</p>
                </div>
              )}
            </div>
          </div>

          {closedSessions.length > 0 && (
          <div className="bg-gray-50 p-8 rounded-3xl shadow-sm border border-gray-200 opacity-90 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                🗄️ Sessions clôturées
              </h2>
              <a href="/history" className="text-sm font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 py-2 px-4 rounded-xl transition-colors">
                 Historique du Club 👉
              </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {closedSessions.map(session => (
                <div key={session.id} className="border-2 border-gray-200 bg-white rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-center opacity-80 hover:opacity-100 transition-opacity shadow-sm">
                  <div>
                    <div className="font-black text-lg text-gray-800">
                      {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded inline-block mt-1">Session {session.status.toLowerCase()}</div>
                  </div>
                  <a href={`/session/${session.id}/results`} className="text-blue-700 font-bold bg-blue-50 px-4 py-2 rounded-xl text-sm border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm">
                     Résultats 🏆
                  </a>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
