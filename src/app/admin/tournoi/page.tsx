import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import TournamentSimulator, { SimPlayer, SimSession } from "./TournamentSimulator";

export default async function AdminTournoiPage() {
  const user = await getSessionUser();
  if (!user || user.role === "JOUEUR") redirect("/");

  const [allUsers, lastSession, pastPoolPlayers, activeSeason] = await Promise.all([
    prisma.user.findMany({
      orderBy: { averagePoints: "desc" }
    }),
    prisma.session.findFirst({
      where: { status: "TERMINEE" },
      orderBy: { date: "desc" },
      include: { pools: { include: { players: true } } }
    }),
    prisma.poolPlayer.findMany({
      where: { pool: { session: { status: "TERMINEE" } } },
      include: { pool: { include: { session: true } } },
      orderBy: { pool: { session: { date: "desc" } } }
    }),
    prisma.season.findFirst({ where: { isActive: true } })
  ]);

  const upcomingSessionsRaw = activeSeason
    ? await prisma.session.findMany({
        where: { seasonId: activeSeason.id },
        orderBy: { date: "desc" },
        take: 8,
        include: {
          registrations: { orderBy: { createdAt: "asc" } },
          reservations: { include: { club: true }, orderBy: { id: "asc" } }
        }
      })
    : [];

  const lastSessionUserIds = new Set<string>();
  if (lastSession) {
    lastSession.pools.forEach(p =>
      p.players.forEach(pp => lastSessionUserIds.add(pp.userId))
    );
  }

  const userLastPoolMap = new Map<string, number>();
  for (const pp of pastPoolPlayers) {
    if (!userLastPoolMap.has(pp.userId)) {
      userLastPoolMap.set(pp.userId, pp.pool.level);
    }
  }

  const players: SimPlayer[] = allUsers.map(u => {
    const hist = u.historicalStats
      ? typeof u.historicalStats === "object"
        ? (u.historicalStats as Record<string, unknown>)
        : JSON.parse(u.historicalStats as string)
      : {};

    let ghostAverage = 0;
    const final2526 = hist["Saison 2025-2026_Final"] as { averagePoints?: number } | undefined;
    if (final2526 && final2526.averagePoints) {
      ghostAverage = Number(final2526.averagePoints) || 0;
    } else if (hist["Saison 2025-2026"]) {
      ghostAverage = Number(hist["Saison 2025-2026"]) || 0;
    }

    const isExistingMember =
      (u.totalMatches && u.totalMatches > 0) || Object.keys(hist).length > 0;

    return {
      id: u.id,
      name: u.name,
      nickname: u.nickname || null,
      stars: u.stars || 0,
      averagePoints: u.averagePoints || 0,
      points: u.points || 0,
      totalMatches: u.totalMatches || 0,
      tops: u.tops || 0,
      flops: u.flops || 0,
      lastCalculatedLevel: u.lastCalculatedLevel ?? null,
      lastPoolLevel: userLastPoolMap.get(u.id) ?? null,
      playedLastSession: lastSessionUserIds.has(u.id),
      isExistingMember: Boolean(isExistingMember),
      ghostAverage
    };
  });

  const sessions: SimSession[] = upcomingSessionsRaw.map(s => ({
    id: s.id,
    date: s.date.toISOString(),
    status: s.status,
    courts: s.courts > 0 ? s.courts : 6,
    registrations: s.registrations.map(r => ({
      userId: r.userId,
      isReturningFromInjury: r.isReturningFromInjury,
      createdAt: r.createdAt.toISOString()
    })),
    reservations: s.reservations.map(res => ({
      id: res.id,
      clubName: res.club.name,
      name: res.name,
      startTime: res.startTime,
      defaultPoolLevel: res.defaultPoolLevel
    }))
  }));

  return <TournamentSimulator players={players} sessions={sessions} currentUserId={user.id} />;
}
