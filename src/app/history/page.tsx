import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // 1. Fetch completed sessions
  const pastSessions = await prisma.session.findMany({
    where: { status: 'TERMINEE' },
    orderBy: { date: 'desc' },
    include: {
      pools: true,
      registrations: true
    }
  });

  // 2. Compute Global Stats
  const totalSessions = pastSessions.length;
  
  const totalMatches = await prisma.match.count({
    where: { pool: { session: { status: 'TERMINEE' } } }
  });

  const uniquePlayersRaw = await prisma.poolPlayer.findMany({
    where: { pool: { session: { status: 'TERMINEE' } } },
    select: { userId: true },
    distinct: ['userId']
  });
  const totalUniquePlayers = uniquePlayersRaw.length;

  // 3. Top 3 most active players
  const allPoolPlayers = await prisma.poolPlayer.findMany({
    where: { pool: { session: { status: 'TERMINEE' } } },
    include: { user: true }
  });

  const participationCount = new Map<string, { count: number, user: any }>();
  for (const pp of allPoolPlayers) {
    const existing = participationCount.get(pp.userId) || { count: 0, user: pp.user };
    existing.count++;
    participationCount.set(pp.userId, existing);
  }

  const topPlayers = Array.from(participationCount.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <span className="text-4xl">🏛️</span> Statistiques et Historique APT
          </h1>
          <p className="text-gray-500 mt-2 font-medium">L'archive complète du club et de vos records.</p>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-6 rounded-3xl text-white shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-10 text-6xl">📅</div>
          <span className="text-4xl font-black relative z-10">{totalSessions}</span>
          <span className="text-sm text-blue-200 mt-1 font-bold uppercase tracking-wider relative z-10">Sessions</span>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-3xl text-white shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-10 text-6xl">🎾</div>
          <span className="text-4xl font-black relative z-10">{totalMatches}</span>
          <span className="text-sm text-orange-200 mt-1 font-bold uppercase tracking-wider relative z-10">Matchs Joués</span>
        </div>
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-6 rounded-3xl text-white shadow-md flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-10 text-6xl">👥</div>
          <span className="text-4xl font-black relative z-10">{totalUniquePlayers}</span>
          <span className="text-sm text-teal-200 mt-1 font-bold uppercase tracking-wider relative z-10">Membres Actifs</span>
        </div>
        <div className="bg-white border text-gray-800 p-4 rounded-3xl shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
             <span className="text-lg">🔥</span> Assiduité
          </h3>
          <div className="w-full space-y-2">
            {topPlayers.map((tp, idx) => (
              <div key={tp.user.id} className="flex justify-between items-center text-sm font-bold bg-gray-50 px-2 py-1 rounded-lg">
                <span className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 text-gray-700' : 'bg-orange-100 text-orange-700'}`}>
                    {idx + 1}
                  </span>
                  <a href={`/profile/${tp.user.id}`} className="hover:text-blue-600 transition-colors truncate max-w-[80px]" title={tp.user.name}>{tp.user.nickname || tp.user.name.split(' ')[0]}</a>
                </span>
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-xs">{tp.count} sess.</span>
              </div>
            ))}
            {topPlayers.length === 0 && <span className="text-xs text-gray-400">Aucun historique</span>}
          </div>
        </div>
      </div>

      {/* Past Sessions List */}
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3 pt-6 border-t border-gray-100">
        <span className="text-3xl">🗂️</span> Archives des Dimanches
      </h2>

      {pastSessions.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm text-center text-gray-500 font-medium">
          <div className="text-4xl mb-4">🕸️</div>
          Aucune session n'a encore été clôturée !
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pastSessions.map(session => (
            <Link key={session.id} href={`/session/${session.id}/results`} className="block bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all group relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-6xl transform group-hover:scale-110 group-hover:rotate-12">
                 🏆
               </div>
               <div className="font-black text-xl text-blue-900 group-hover:text-blue-700 transition-colors mb-4 pr-10 capitalize">
                 {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
               </div>
               <div className="flex gap-4">
                 <div className="bg-blue-50 px-3 py-2 rounded-xl text-center flex-1 border border-blue-100">
                   <div className="text-xl font-black text-blue-800">{session.pools.length}</div>
                   <div className="text-[10px] uppercase font-bold text-blue-400">Terrains</div>
                 </div>
                 <div className="bg-orange-50 px-3 py-2 rounded-xl text-center flex-1 border border-orange-100">
                   <div className="text-xl font-black text-orange-800">{session.pools.length * 4}</div>
                   <div className="text-[10px] uppercase font-bold text-orange-400">Joueurs</div>
                 </div>
               </div>
               <div className="mt-4 text-center text-sm font-bold text-indigo-600 bg-indigo-50 py-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                 Voir le palmarès complet 👉
               </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
