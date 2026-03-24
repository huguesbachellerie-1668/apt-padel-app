import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createSeason, createSession, updateSessionStatus, generatePools, finishSessionAndCalculatePoints, reopenSession, updateSessionCourtsAction } from "./actions";

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') redirect("/");

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
  const sessions = activeSeason ? await prisma.session.findMany({ 
    where: { seasonId: activeSeason.id },
    orderBy: { date: 'desc' }
  }) : [];

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

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          👥 Gestion des Joueurs
        </h2>
        <p className="text-gray-500 mb-5 font-medium">Ajouter de nouveaux membres, éditer leurs informations personnelles, changer leurs rôles ou ajuster leur notation.</p>
        <a href="/admin/joueurs" className="inline-flex bg-gray-800 text-white font-bold py-3 px-6 rounded-2xl hover:bg-gray-900 transition-colors shadow-md border-b-4 border-gray-950 items-center justify-center gap-2">
          <span>Ouvrir l'annuaire des joueurs 👉</span>
        </a>
      </div>

      {!activeSeason ? (
        <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-orange-500 text-center max-w-2xl mx-auto mt-10">
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="text-2xl font-black text-orange-800 mb-4">Lancement d'une nouvelle saison</h2>
          <p className="text-gray-600 mb-8">Pour organiser des matchs, vous devez d'abord initialiser une saison active (ex: Saison 2026-2027).</p>
          <form action={createSeason} className="flex flex-col gap-4 max-w-md mx-auto">
            <input name="name" type="text" placeholder="Ex: Saison 2026-2027" className="border-2 border-gray-200 p-3 rounded-xl focus:border-orange-500 focus:outline-none" required />
            <button type="submit" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 shadow-md transition-transform hover:scale-105">
              Démarrer la saison
            </button>
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
              <div className="flex-1 min-w-[250px]">
                <label className="block text-sm font-bold text-blue-900 mb-2">Planifier la prochaine session</label>
                <input name="date" type="datetime-local" className="border-2 border-gray-200 p-3 rounded-xl w-full text-gray-700 bg-white focus:border-blue-500 focus:ring-0" required />
              </div>
              <div className="w-[140px]">
                <label className="block text-sm font-bold text-blue-900 mb-2">Terrains</label>
                <input name="courts" type="number" min="1" max="20" defaultValue="1" className="border-2 border-gray-200 p-3 rounded-xl w-full text-gray-700 bg-white focus:border-blue-500 focus:ring-0" required />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-md transition-colors whitespace-nowrap">
                + Créer la session
              </button>
            </form>

            <div className="space-y-4">
              {sessions.map(session => (
                <div key={session.id} className={`border-2 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 justify-between items-center transition-all ${
                  session.status === 'PREVUE' ? 'border-gray-200 bg-gray-50' : 
                  session.status === 'INSCRIPTIONS_OUVERTES' ? 'border-green-400 bg-green-50 shadow-md transform scale-[1.01]' : 
                  session.status === 'POULES_GENEREES' ? 'border-orange-400 bg-orange-50' : 
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
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {session.status === 'PREVUE' && (
                      <form action={updateSessionStatus.bind(null, session.id, 'INSCRIPTIONS_OUVERTES')} className="w-full sm:w-auto">
                        <button className="w-full bg-green-500 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-green-600 transition-colors">
                          Ouvrir Inscriptions 🟢
                        </button>
                      </form>
                    )}
                    {session.status === 'INSCRIPTIONS_OUVERTES' && (
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <form action={updateSessionCourtsAction} className="flex items-center gap-2 bg-blue-50 p-2 rounded-xl border border-blue-200">
                           <input type="hidden" name="sessionId" value={session.id} />
                           <div>
                             <label className="text-xs font-bold text-blue-800 block mb-1">Modifier Terrains</label>
                             <input name="courts" type="number" min="1" max="20" defaultValue={session.courts > 0 ? session.courts : 1} className="w-20 p-2 border border-blue-300 rounded-lg text-sm font-bold text-center" />
                           </div>
                           <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors h-full">
                             Sauver 💾
                           </button>
                        </form>

                        <form action={generatePools} className="flex items-center gap-2 bg-orange-50 p-2 rounded-xl border border-orange-200">
                          <input type="hidden" name="sessionId" value={session.id} />
                          <input type="hidden" name="courtsCount" value={session.courts > 0 ? session.courts : 1} />
                          <button className="w-full bg-orange-500 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-orange-600 transition-colors h-full whitespace-nowrap">
                            Générer les Poules 🎲
                          </button>
                        </form>
                      </div>
                    )}
                    {session.status === 'POULES_GENEREES' && (
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <form action={reopenSession.bind(null, session.id)}>
                          <button className="w-full bg-red-500 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-red-600 transition-colors">
                            Recalculer les poules ⏪
                          </button>
                        </form>
                        <form action={finishSessionAndCalculatePoints.bind(null, session.id)}>
                          <button className="w-full bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                            Terminer session 🏁
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="text-4xl mb-3">🕸️</div>
                  <p className="font-medium">Aucune session n'est encore prévue.</p>
                  <p className="text-sm">Utilisez le formulaire ci-dessus pour planifier le prochain dimanche !</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
