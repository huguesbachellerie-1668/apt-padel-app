import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { manualRegisterForSession, manualUnregisterForSession, updatePoolSettings, createCourtReservation, deleteCourtReservation, swapRegistrationOrder } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function SessionDetailsPage({ params }: { params: any }) {
  const p = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const session = await prisma.session.findUnique({
    where: { id: p.id },
    include: {
      registrations: {
        include: { user: true },
        orderBy: { createdAt: 'asc' } // Tri chronologique par défaut
      },
      pools: {
        include: {
          players: {
            include: { user: true },
            orderBy: { seed: 'asc' }
          },
          matches: true,
          courtReservation: { include: { club: true } }
        },
        orderBy: { level: 'asc' }
      },
      reservations: {
        include: { club: true },
        orderBy: { startTime: 'asc' }
      }
    }
  });

  if (!session) return <div className="text-center p-10 font-bold text-gray-500">Session introuvable</div>;

  const isBoard = ['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role);
  
  const allClubs = isBoard ? await prisma.club.findMany({ orderBy: { name: 'asc' } }) : [];
  const totalPlaces = session.courts * 4;
  const registeredCount = session.registrations.length;
  const placesLeft = Math.max(0, totalPlaces - registeredCount);
  const waitlistCount = Math.max(0, registeredCount - totalPlaces);

  let availableUsers: any[] = [];
  if (isBoard) {
    const registeredIds = session.registrations.map((r: any) => r.userId);
    const usersList = await prisma.user.findMany({
      where: { id: { notIn: registeredIds } }
    });
    availableUsers = usersList.sort((a, b) => 
      (a.nickname || a.name).toLowerCase().localeCompare((b.nickname || b.name).toLowerCase())
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div>
          <Link href="/" className="text-blue-500 font-bold hover:underline mb-2 inline-block">← Retour à l'accueil</Link>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <span className="text-4xl">📅</span> Détails Session
          </h1>
          <p className="text-gray-500 mt-2 font-medium capitalize">
            {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center text-center">
           <span className="text-sm font-bold text-blue-600 mb-1">Terrains Ouverts</span>
           <span className="text-3xl font-black text-blue-900">{session.courts}</span>
        </div>
        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex flex-col items-center text-center">
           <span className="text-sm font-bold text-green-600 mb-1">Places Totales</span>
           <span className="text-3xl font-black text-green-900">{totalPlaces}</span>
        </div>
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex flex-col items-center text-center">
           <span className="text-sm font-bold text-orange-600 mb-1">Inscrits</span>
           <span className="text-3xl font-black text-orange-900">{registeredCount}</span>
        </div>
        {totalPlaces > 0 && (
          <div className={`${placesLeft > 0 ? 'bg-cyan-50 border-cyan-100 text-cyan-900' : 'bg-red-50 border-red-100 text-red-900'} p-4 rounded-2xl border flex flex-col items-center text-center`}>
             <span className={`text-sm font-bold mb-1 ${placesLeft > 0 ? 'text-cyan-600' : 'text-red-600'}`}>
                {placesLeft > 0 ? 'Places Dispos' : 'Remplaçants'}
             </span>
             <span className="text-3xl font-black">{placesLeft > 0 ? placesLeft : waitlistCount}</span>
          </div>
        )}
      </div>

      {session.status === 'POULES_EN_ATTENTE' && (
        <div className="mt-8 bg-red-50 border-2 border-red-500 rounded-3xl p-8 text-center text-red-700 shadow-sm relative overflow-hidden">
           <div className="text-4xl mb-4 animate-bounce">🚨</div>
           <h2 className="text-2xl font-black mb-2">NOUVELLES POULES EN ATTENTE</h2>
           <p className="font-bold mb-1">Un ou plusieurs joueurs se sont désinscrits à la dernière minute.</p>
           <p className="text-red-600">Les anciennes poules sont obsolètes. Elles seront recalculées par l'équipe d'organisation au plus vite.</p>
        </div>
      )}

      {(session.status === 'POULES_GENEREES' || session.status === 'TERMINEE') && session.pools && session.pools.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-black text-blue-900 flex items-center gap-3 mb-6">
            <span className="text-3xl">🎾</span> Composition des Poules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {session.pools.map((pool: any) => {
              const allMatchesFinished = pool.matches && pool.matches.length === 3 && pool.matches.every((m: any) => m.team1Games !== null && m.team2Games !== null);
              return (
              <div key={pool.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                 <div className="bg-blue-900 px-5 py-3 flex flex-wrap justify-between items-center text-white gap-2">
                   <div className="flex items-center gap-3">
                     <h3 className="font-bold text-lg">Poule #{pool.level}</h3>
                     {!isBoard && (
                        pool.courtReservation ? (
                          <span className="text-sm font-medium bg-blue-800 px-3 py-1 rounded-full border border-blue-700 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5h16M4 19h16M4 5v14M20 5v14M12 5v14M4 12h16"></path></svg>
                            {pool.courtReservation.club.name} Terrain {pool.courtReservation.name}
                          </span>
                        ) : (
                          <span className="text-sm font-medium bg-blue-800 px-3 py-1 rounded-full border border-blue-700 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5h16M4 19h16M4 5v14M20 5v14M12 5v14M4 12h16"></path></svg>
                            Terrain {pool.courtNumber}
                          </span>
                        )
                     )}
                   </div>
                   {isBoard ? (
                     <form action={updatePoolSettings.bind(null, pool.id, session.id)} className="flex items-center gap-2 bg-blue-800/50 p-1.5 rounded-xl flex-wrap">
                       <div className="flex items-center gap-1 pl-2">
                         <select key={pool.courtReservationId || 'none'} name="reservationId" defaultValue={pool.courtReservationId || ""} className="bg-white text-gray-900 rounded px-2 py-1 text-xs font-bold w-64 border-0 focus:ring-2 focus:ring-orange-500 truncate">
                           <option value="">A définir...</option>
                           {session.reservations && session.reservations.map((res: any) => (
                             <option key={res.id} value={res.id}>{res.club.name} Terrain {res.name} ({res.startTime})</option>
                           ))}
                         </select>
                       </div>
                       <SubmitButton pendingText="..." className="bg-orange-500 hover:bg-orange-400 text-white px-2 py-1 rounded-lg text-xs font-bold ml-1">OK</SubmitButton>
                     </form>
                   ) : (
                     <span className="text-sm font-bold text-orange-300">
                       {pool.courtReservation ? `🕒 ${pool.courtReservation.startTime}` : '🕒 Horaire à définir'}
                     </span>
                   )}
                </div>
                <div className="p-4 flex flex-col gap-3">
                   {pool.players.map((pt: any) => (
                      <div key={pt.userId} className={`flex items-center gap-3 p-2 rounded-xl border ${pt.userId === user.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
                         <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                           {pt.seed}
                         </div>
                         <div className="flex-1 flex items-baseline gap-2">
                           <span className="font-bold text-gray-800 text-base">{pt.user.nickname || pt.user.name}</span>
                           {pt.user.nickname && <span className="text-xs font-medium text-gray-500">{pt.user.name}</span>}
                         </div>
                         <div className="text-xs font-bold text-blue-500 bg-blue-100 px-2 py-1 rounded-lg">
                           {(pt.user.averagePoints || 0).toFixed(2)} pts
                         </div>
                      </div>
                   ))}
                   {allMatchesFinished ? (
                     <a href={`/session/${session.id}/results`} className="mt-2 flex items-center justify-center gap-2 text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 py-2.5 rounded-xl transition-colors border border-green-200">
                       ✅ Voir les résultats définitifs 👉
                     </a>
                   ) : (
                     <a href={`/pool/${pool.id}`} className="mt-2 text-center text-sm font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 py-2.5 rounded-xl transition-colors border border-orange-100">
                       Voir la poule et les matchs 👉
                     </a>
                   )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {isBoard && (
        <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 mt-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 text-8xl">👑</div>
           <h3 className="font-bold text-orange-800 mb-3 relative z-10">Gestion des inscriptions</h3>
           <form action={manualRegisterForSession.bind(null, session.id)} className="flex items-end gap-3 relative z-10 w-full md:w-2/3">
             <div className="flex gap-3">
               <select name="userId" required className="flex-1 p-2.5 rounded-xl border border-orange-200 text-sm focus:outline-none">
                 <option value="">-- Sélectionner un joueur --</option>
                 {availableUsers.map((u: any) => (
                   <option key={u.id} value={u.id}>
                     {u.nickname ? `${u.nickname} (${u.name})` : u.name}
                   </option>
                 ))}
               </select>
               <SubmitButton pendingText="Inscription..." className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-colors whitespace-nowrap">
                 Inscrire
               </SubmitButton>
             </div>
             <div className="flex items-center gap-2 bg-orange-100 p-2 rounded-xl border border-orange-200 mt-2">
               <input type="checkbox" id="boardInjury" name="isReturningFromInjury" value="true" className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer" />
               <label htmlFor="boardInjury" className="text-orange-900 text-sm font-bold cursor-pointer">Appliquer "Retour de blessure" (descend d'une poule)</label>
             </div>
           </form>
        </div>
      )}


      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mt-6">
         <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
           <h2 className="font-bold text-gray-800 text-lg flex items-center justify-between">
             <span>Liste des Inscrits ({registeredCount})</span>
           </h2>
           <p className="text-xs text-gray-500 mt-1">L'ordre prioritaire sera appliqué lors de la fermeture des inscriptions par le Board</p>
         </div>
         <div className="divide-y divide-gray-100">
           {session.registrations.map((reg: any, idx: number) => (
             <div key={reg.id} className={`flex items-center gap-4 p-4 ${reg.userId === user.id ? 'bg-orange-50/30' : ''}`}>
                <div className="flex-shrink-0 w-8 text-center font-black text-gray-400">
                  {idx + 1}
                </div>
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-bold">
                  {(reg.user.nickname || reg.user.name).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-lg">{reg.user.nickname || reg.user.name}</span>
                    {reg.user.nickname && <span className="text-sm font-medium text-gray-500">{reg.user.name}</span>}
                    {reg.userId === user.id && <span className="text-[10px] uppercase font-bold bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">Vous</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex gap-2 items-center">
                    <span>Inscrit le {new Date(reg.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}</span>
                    {reg.isReturningFromInjury && <span className="text-orange-600 font-bold flex items-center bg-orange-50 px-1 py-0.5 rounded">🩺 Blessure</span>}
                  </div>
                </div>
                {isBoard && session.status !== 'TERMINEE' && (
                  <div className="flex items-center gap-2">
                    {idx > 0 && (
                      <form action={swapRegistrationOrder.bind(null, session.id)}>
                        <input type="hidden" name="userId" value={reg.userId} />
                        <input type="hidden" name="direction" value="up" />
                        <SubmitButton pendingText="⏳" className="text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white p-2 text-sm rounded-lg transition-colors flex items-center justify-center shadow-sm" title="Monter ce joueur">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"></path></svg>
                        </SubmitButton>
                      </form>
                    )}
                    {idx < session.registrations.length - 1 && (
                      <form action={swapRegistrationOrder.bind(null, session.id)}>
                        <input type="hidden" name="userId" value={reg.userId} />
                        <input type="hidden" name="direction" value="down" />
                        <SubmitButton pendingText="⏳" className="text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-600 hover:text-white p-2 text-sm rounded-lg transition-colors flex items-center justify-center shadow-sm" title="Descendre ce joueur">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                        </SubmitButton>
                      </form>
                    )}
                    <form action={manualUnregisterForSession.bind(null, session.id)}>
                      <input type="hidden" name="userId" value={reg.userId} />
                      <SubmitButton pendingText="⏳" className="text-red-500 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white p-2 ml-2 text-sm rounded-lg transition-colors flex items-center justify-center shadow-sm" title="Désinscrire ce joueur">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </SubmitButton>
                    </form>
                  </div>
                )}
             </div>
           ))}
           
           {registeredCount === 0 && (
             <div className="p-8 text-center text-gray-500 font-medium">
               Aucun inscrit pour le moment.
             </div>
           )}
         </div>
      </div>

      {isBoard && (
        <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 mt-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 text-8xl">🏟️</div>
           <h3 className="font-bold text-indigo-800 mb-3 relative z-10">Gestion des Terrains (Réservations)</h3>
           
           {/* Liste des réservations actuelles */}
           {session.reservations && session.reservations.length > 0 && (
             <div className="mb-4 relative z-10 flex flex-col gap-2">
               {session.reservations.map((res: any) => (
                 <div key={res.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                   <div className="flex flex-col">
                     <span className="font-bold text-indigo-900">{res.club.name} - {res.name}</span>
                     <span className="text-xs text-gray-500">{res.club.city} | Heure: <strong className="text-indigo-600">{res.startTime}</strong></span>
                   </div>
                   <form action={deleteCourtReservation.bind(null, session.id)}>
                     <input type="hidden" name="reservationId" value={res.id} />
                     <SubmitButton pendingText="..." className="text-red-500 hover:text-white font-bold bg-red-50 hover:bg-red-500 p-2 rounded-lg transition-colors shadow-sm">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                     </SubmitButton>
                   </form>
                 </div>
               ))}
             </div>
           )}

           {/* Formulaire d'ajout */}
           <form action={createCourtReservation.bind(null, session.id)} className="flex flex-col md:flex-row items-end gap-3 relative z-10 w-full">
             <div className="flex-[1.5] w-full flex flex-col gap-1">
               <label className="text-xs font-bold text-indigo-600 uppercase">Club</label>
               <select name="clubId" required className="w-full p-2.5 rounded-xl border border-indigo-200 text-sm focus:outline-none focus:border-indigo-500 bg-white">
                 <option value="">-- Sélectionner un lieu --</option>
                 {allClubs.map((c: any) => (
                   <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                 ))}
               </select>
             </div>
             <div className="flex-1 w-full flex flex-col gap-1">
               <label className="text-xs font-bold text-indigo-600 uppercase">Piste</label>
               <input type="text" name="name" required placeholder="Ex: T1, Piste Centrale" className="w-full p-2.5 rounded-xl border border-indigo-200 text-sm focus:outline-none focus:border-indigo-500 bg-white" />
             </div>
             <div className="w-full md:w-28 flex flex-col gap-1">
               <label className="text-xs font-bold text-indigo-600 uppercase">Heure</label>
               <input type="time" name="startTime" required className="w-full p-2.5 rounded-xl border border-indigo-200 text-sm font-bold focus:outline-none focus:border-indigo-500 bg-white" />
             </div>
             <SubmitButton pendingText="..." className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-sm transition-colors mt-2 md:mt-0 w-full md:w-auto">
               Ajouter
             </SubmitButton>
           </form>
        </div>
      )}
    </div>
  )
}
