import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import StatsCard from "@/components/dashboard/StatsCard";
import SessionCard from "@/components/dashboard/SessionCard";
import { Moon, AlertTriangle } from 'lucide-react';

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // Fetch independent global data in parallel
  // AND the new rank query using $queryRaw
  const [rankResult, globalSettings, activeSessions] = await Promise.all([
    prisma.$queryRaw<[{ rank: bigint }]>`
      WITH RankedUsers AS (
        SELECT id, RANK() OVER (ORDER BY "averagePoints" DESC) as rank
        FROM "User"
        WHERE "totalMatches" > 0
      )
      SELECT rank FROM RankedUsers WHERE id = ${user.id};
    `,
    prisma.settings.findUnique({ where: { id: 'global' } }),
    prisma.session.findMany({
      where: { status: { in: ['PREVUE', 'INSCRIPTIONS_OUVERTES', 'POULES_GENEREES', 'POULES_EN_ATTENTE'] } },
      orderBy: { date: 'asc' },
      include: {
        pools: {
          include: { matches: true, courtReservation: true }
        }
      }
    })
  ]);

  const rank = rankResult.length > 0 ? rankResult[0].rank.toString() : '-';

  const lockDay = globalSettings?.lockUnregisterDay ?? 5;
  const lockTime = globalSettings?.lockUnregisterTime ?? "20:00";

  // Pre-fetch all user registrations and pool placements for the active sessions in parallel
  const sessionIds = activeSessions.map(s => s.id);
  const [allUserRegistrations, allUserPoolPlayers] = await Promise.all([
    prisma.registration.findMany({
      where: { userId: user.id, sessionId: { in: sessionIds } }
    }),
    prisma.poolPlayer.findMany({
      where: { userId: user.id, pool: { sessionId: { in: sessionIds } } },
      include: { 
        pool: {
          include: { courtReservation: true }
        } 
      }
    })
  ]);

  const sessionsData = activeSessions.map((session) => {
    let hasFinishedPool = false;
    let allPoolsFinished = false;
    if (session.status === 'POULES_GENEREES' && session.pools) {
      const finishedPools = session.pools.filter(p => p.matches.length === 3 && p.matches.every(m => m.team1Games !== null && m.team2Games !== null));
      hasFinishedPool = finishedPools.length > 0;
      allPoolsFinished = session.pools.length > 0 && finishedPools.length === session.pools.length;
    }

    const userRegistration = allUserRegistrations.find(r => r.sessionId === session.id) || null;
    let userPoolPlayer = null;

    if (session.status === 'POULES_GENEREES' || session.status === 'POULES_EN_ATTENTE') {
      if (userRegistration) {
        userPoolPlayer = allUserPoolPlayers.find(p => p.pool.sessionId === session.id) || null;
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
  });

  return (
    <div className="space-y-6">
      <StatsCard user={user} rank={rank} />

      {sessionsData.length > 0 ? (
        <div className="space-y-12 pb-6">
          {sessionsData.map((data, index) => (
            <SessionCard
              key={data.session.id}
              activeSession={data.session}
              index={index}
              user={user}
              hasFinishedPool={data.hasFinishedPool}
              allPoolsFinished={data.allPoolsFinished}
              userRegistration={data.userRegistration}
              userPoolPlayer={data.userPoolPlayer}
              isUnregisterLocked={data.isUnregisterLocked}
            />
          ))}
        </div>
      ) : (
        <section className="bg-white border border-gray-100 p-12 rounded-3xl shadow-sm text-center">
          <div className="mb-4 flex justify-center">
             <Moon size={48} className="text-gray-300" />
          </div>
          <p className="text-gray-500 font-bold text-lg">Aucune session n'est planifiée par le Board pour le moment.</p>
        </section>
      )}
      
      {/* Quick stats / info */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between mt-6">
         <div className="flex bg-orange-50 rounded-full w-12 h-12 items-center justify-center">
            <AlertTriangle size={24} className="text-orange-500" />
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
