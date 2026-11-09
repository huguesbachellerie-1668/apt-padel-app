"use client";

import React, { useState, useMemo } from "react";
import BackButton from "@/components/BackButton";
import MatchTimer from "@/components/MatchTimer";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import WhatsAppShareTextButton from "@/components/WhatsAppShareTextButton";

export interface SimPlayer {
  id: string;
  name: string;
  nickname: string | null;
  stars: number;
  averagePoints: number;
  points: number;
  totalMatches: number;
  tops: number;
  flops: number;
  lastCalculatedLevel: number | null;
  lastPoolLevel: number | null;
  playedLastSession: boolean;
  isExistingMember: boolean;
  ghostAverage: number;
}

export interface SimSession {
  id: string;
  date: string;
  status: string;
  courts: number;
  registrations: {
    userId: string;
    isReturningFromInjury: boolean;
    createdAt: string;
  }[];
  reservations: {
    id: string;
    clubName: string;
    name: string;
    startTime: string;
    defaultPoolLevel: number | null;
  }[];
}

interface RegEntry {
  userId: string;
  isReturningFromInjury: boolean;
  createdAt: string;
  priorityType?: number;
}

interface SimMatch {
  id: string;
  order: number;
  rotation: number;
  courtNumber: number;
  courtLabel: string;
  team1Label: string;
  team2Label: string;
  team1Players: [SimPlayer, SimPlayer];
  team2Players: [SimPlayer, SimPlayer];
}

function shortName(p: SimPlayer) {
  return p.nickname || p.name.split(" ")[0];
}

export default function TournamentSimulator({
  players,
  sessions,
  currentUserId
}: {
  players: SimPlayer[];
  sessions: SimSession[];
  currentUserId: string;
}) {
  const initialSession = sessions.find(s => s.registrations.length >= 8) || sessions[0];

  // Navigation between the 3 classic screens:
  // 'session' = Détails Session (/session/[id])
  // 'pool'    = Feuille de Poule/Binôme & Matchs (/pool/[id])
  // 'results' = Résultats de la Session (/session/[id]/results)
  const [activeView, setActiveView] = useState<"session" | "pool" | "results">("session");
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);

  const [courtsCount, setCourtsCount] = useState<number>(() =>
    initialSession && initialSession.courts >= 2 ? Math.min(10, initialSession.courts) : 6
  );

  const [registrations, setRegistrations] = useState<RegEntry[]>(() => {
    if (initialSession && initialSession.registrations.length >= 8) {
      return initialSession.registrations.map(r => ({
        userId: r.userId,
        isReturningFromInjury: r.isReturningFromInjury,
        createdAt: r.createdAt
      }));
    }
    const activePlayers = players.filter(p => p.totalMatches > 0 || p.averagePoints > 0).slice(0, 24);
    const baseTime = Date.now() - 3600 * 1000 * 24;
    return activePlayers.map((p, idx) => ({
      userId: p.id,
      isReturningFromInjury: false,
      createdAt: new Date(baseTime + idx * 60000).toISOString()
    }));
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSession?.id || "");
  const [poolReservations, setPoolReservations] = useState<Record<number, string>>({});
  const [scores, setScores] = useState<Record<string, { t1: string; t2: string }>>({});
  const [newRegUserId, setNewRegUserId] = useState<string>("");
  const [newRegInjury, setNewRegInjury] = useState<boolean>(false);

  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const currentSessionObj = sessions.find(s => s.id === selectedSessionId) || initialSession;

  function handleLoadSession(sessionId: string) {
    setSelectedSessionId(sessionId);
    const s = sessions.find(x => x.id === sessionId);
    if (!s) return;
    setCourtsCount(Math.min(10, Math.max(2, s.courts || 6)));
    setRegistrations(
      s.registrations.map(r => ({
        userId: r.userId,
        isReturningFromInjury: r.isReturningFromInjury,
        createdAt: r.createdAt
      }))
    );
    setScores({});
    setActiveView("session");
  }

  function handleQuickFill(count: number, courts: number) {
    setCourtsCount(courts);
    const pool = players.filter(p => p.totalMatches > 0 || p.averagePoints > 0);
    const chosen = (pool.length >= count ? pool : players).slice(0, count);
    const baseTime = Date.now() - 3600 * 1000 * 24;
    setRegistrations(
      chosen.map((p, idx) => ({
        userId: p.id,
        isReturningFromInjury: false,
        createdAt: new Date(baseTime + idx * 60000).toISOString()
      }))
    );
    setScores({});
    setActiveView("session");
  }

  function handleManualRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!newRegUserId) return;
    if (registrations.some(r => r.userId === newRegUserId)) return;
    setRegistrations(prev => [
      ...prev,
      {
        userId: newRegUserId,
        isReturningFromInjury: newRegInjury,
        createdAt: new Date().toISOString()
      }
    ]);
    setNewRegUserId("");
    setNewRegInjury(false);
  }

  function handleUnregister(userId: string) {
    setRegistrations(prev => prev.filter(r => r.userId !== userId));
  }

  function handleSwapOrder(idx: number, direction: "up" | "down", sortedList: RegEntry[]) {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedList.length) return;
    const uA = sortedList[idx].userId;
    const uB = sortedList[targetIdx].userId;
    setRegistrations(prev => {
      const next = prev.map(r => ({ ...r }));
      const rA = next.find(r => r.userId === uA);
      const rB = next.find(r => r.userId === uB);
      if (rA && rB) {
        const tmp = rA.createdAt;
        rA.createdAt = rB.createdAt;
        rB.createdAt = tmp;
      }
      return next;
    });
  }

  // --- Exact APT Priority & Pool Generation + Tournament 2-by-2 Pairing ---
  const tournamentData = useMemo(() => {
    const regsWithPriority: RegEntry[] = registrations.map(reg => {
      const p = playerMap.get(reg.userId);
      let priorityType = 3;
      if (p?.playedLastSession) priorityType = 1;
      else if (p?.isExistingMember) priorityType = 2;
      return { ...reg, priorityType };
    });

    regsWithPriority.sort((a, b) => {
      if (a.priorityType !== b.priorityType) return (a.priorityType || 3) - (b.priorityType || 3);
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const totalPossiblePools = Math.floor(regsWithPriority.length / 4);
    const actualPoolsCount = Math.min(totalPossiblePools, courtsCount, 10);
    const maxPlayers = actualPoolsCount * 4;

    const selectedRegs = regsWithPriority.slice(0, maxPlayers);
    const unselectedRegs = regsWithPriority.slice(maxPlayers);

    const N = maxPlayers;
    const userToReg = new Map(selectedRegs.map(r => [r.userId, r]));

    const electedUsers = selectedRegs
      .map(r => playerMap.get(r.userId)!)
      .filter(Boolean)
      .sort((a, b) => b.averagePoints - a.averagePoints);

    const naturalLevelMap = new Map<string, number>();
    const naturalPoolMap = new Map<string, number>();
    electedUsers.forEach((u, i) => {
      naturalLevelMap.set(u.id, Math.ceil(((i + 1) * 10) / Math.max(1, N)));
      naturalPoolMap.set(u.id, Math.floor(i / 4) + 1);
    });

    const finalUsers = [...electedUsers];

    // Initial Injury Shift
    for (const u of [...finalUsers]) {
      const reg = userToReg.get(u.id);
      if (reg && reg.isReturningFromInjury) {
        const idx = finalUsers.findIndex(fu => fu.id === u.id);
        const target = Math.min(finalUsers.length - 1, idx + 4);
        const [rem] = finalUsers.splice(idx, 1);
        finalUsers.splice(target, 0, rem);
      }
    }

    // Pool Plafond & Glissement
    if (actualPoolsCount > 0 && actualPoolsCount < 8) {
      let hasMoved = true;
      let iterations = 0;
      const MAX_ITERATIONS = 100;
      const injuryOffset = Math.ceil(10 / actualPoolsCount);

      while (hasMoved && iterations < MAX_ITERATIONS) {
        hasMoved = false;
        iterations++;

        for (let i = 0; i < N; i++) {
          const u = finalUsers[i];
          const theoreticalLevel = Math.ceil(((i + 1) * 10) / N);
          const dbLevel = u.lastCalculatedLevel;

          if (dbLevel !== null && dbLevel !== undefined && dbLevel !== 0) {
            const isInj = userToReg.get(u.id)?.isReturningFromInjury;
            const injOff = isInj ? injuryOffset : 0;
            const baseMin = Math.max(1, dbLevel - 3);
            let minLevelAllowed = baseMin + injOff;
            if (isInj) {
              const natLvl = naturalLevelMap.get(u.id) || 1;
              minLevelAllowed = Math.max(minLevelAllowed, natLvl + injOff);
            }
            const maxLevelAllowed = Math.min(10, dbLevel + 3) + injOff;

            if (theoreticalLevel < minLevelAllowed) {
              let target = -1;
              for (let j = i + 1; j < N; j++) {
                const uJ = finalUsers[j];
                const dbLvlJ = uJ.lastCalculatedLevel;
                const isInjJ = userToReg.get(uJ.id)?.isReturningFromInjury;
                const injOffJ = isInjJ ? injuryOffset : 0;
                const baseMinJ =
                  dbLvlJ !== null && dbLvlJ !== undefined && dbLvlJ !== 0
                    ? Math.max(1, dbLvlJ - 3)
                    : 1;
                let minJ = baseMinJ + injOffJ;
                if (isInjJ) {
                  const natLvlJ = naturalLevelMap.get(uJ.id) || 1;
                  minJ = Math.max(minJ, natLvlJ + injOffJ);
                }
                const maxJ =
                  dbLvlJ !== null && dbLvlJ !== undefined && dbLvlJ !== 0
                    ? Math.min(10, dbLvlJ + 3) + injOffJ
                    : 10;
                const newLevelForJ = Math.ceil(((i + 1) * 10) / N);
                if (minJ <= newLevelForJ && maxJ >= newLevelForJ) {
                  target = j;
                  break;
                }
              }
              if (target !== -1) {
                const [shiftedUser] = finalUsers.splice(target, 1);
                finalUsers.splice(i, 0, shiftedUser);
                hasMoved = true;
                break;
              }
            } else if (theoreticalLevel > maxLevelAllowed) {
              let target = -1;
              for (let j = i - 1; j >= 0; j--) {
                const uJ = finalUsers[j];
                const dbLvlJ = uJ.lastCalculatedLevel;
                const isInjJ = userToReg.get(uJ.id)?.isReturningFromInjury;
                const injOffJ = isInjJ ? injuryOffset : 0;
                const baseMinJ =
                  dbLvlJ !== null && dbLvlJ !== undefined && dbLvlJ !== 0
                    ? Math.max(1, dbLvlJ - 3)
                    : 1;
                let minJ = baseMinJ + injOffJ;
                if (isInjJ) {
                  const natLvlJ = naturalLevelMap.get(uJ.id) || 1;
                  minJ = Math.max(minJ, natLvlJ + injOffJ);
                }
                const maxJ =
                  dbLvlJ !== null && dbLvlJ !== undefined && dbLvlJ !== 0
                    ? Math.min(10, dbLvlJ + 3) + injOffJ
                    : 10;
                const newLevelForJ = Math.ceil(((i + 1) * 10) / N);
                if (minJ <= newLevelForJ && maxJ >= newLevelForJ) {
                  target = j;
                  break;
                }
              }
              if (target !== -1) {
                const [shiftedUser] = finalUsers.splice(target, 1);
                finalUsers.splice(i, 0, shiftedUser);
                hasMoved = true;
                break;
              }
            }
          }
        }
      }
    } else if (actualPoolsCount >= 8) {
      let hasMoved = true;
      let iterations = 0;
      const MAX_ITERATIONS = 100;

      while (hasMoved && iterations < MAX_ITERATIONS) {
        hasMoved = false;
        iterations++;

        for (let i = 0; i < N; i++) {
          const u = finalUsers[i];
          const currentPool = Math.floor(i / 4) + 1;
          const lastPool = u.lastPoolLevel ?? undefined;

          if (lastPool !== undefined) {
            const isInj = userToReg.get(u.id)?.isReturningFromInjury;
            const injOff = isInj ? 1 : 0;
            const baseMin = Math.max(1, lastPool - 3);
            let minPoolAllowed = baseMin + injOff;
            if (isInj) {
              const natPool = naturalPoolMap.get(u.id) || 1;
              minPoolAllowed = Math.max(minPoolAllowed, natPool + injOff);
            }
            const maxPoolAllowed = Math.min(actualPoolsCount, lastPool + 3) + injOff;

            if (currentPool < minPoolAllowed) {
              let target = -1;
              for (let j = i + 1; j < N; j++) {
                const uJ = finalUsers[j];
                const lpJ = uJ.lastPoolLevel ?? undefined;
                const isInjJ = userToReg.get(uJ.id)?.isReturningFromInjury;
                const injOffJ = isInjJ ? 1 : 0;
                const baseMinJ = lpJ !== undefined ? Math.max(1, lpJ - 3) : 1;
                let minJ = baseMinJ + injOffJ;
                if (isInjJ) {
                  const natPoolJ = naturalPoolMap.get(uJ.id) || 1;
                  minJ = Math.max(minJ, natPoolJ + injOffJ);
                }
                const maxJ =
                  lpJ !== undefined ? Math.min(actualPoolsCount, lpJ + 3) + injOffJ : actualPoolsCount;
                const newPoolForJ = Math.floor(i / 4) + 1;
                if (minJ <= newPoolForJ && maxJ >= newPoolForJ) {
                  target = j;
                  break;
                }
              }
              if (target !== -1) {
                const [shiftedUser] = finalUsers.splice(target, 1);
                finalUsers.splice(i, 0, shiftedUser);
                hasMoved = true;
                i--;
              }
            } else if (currentPool > maxPoolAllowed) {
              let target = -1;
              for (let j = i - 1; j >= 0; j--) {
                const uJ = finalUsers[j];
                const lpJ = uJ.lastPoolLevel ?? undefined;
                const isInjJ = userToReg.get(uJ.id)?.isReturningFromInjury;
                const injOffJ = isInjJ ? 1 : 0;
                const baseMinJ = lpJ !== undefined ? Math.max(1, lpJ - 3) : 1;
                let minJ = baseMinJ + injOffJ;
                if (isInjJ) {
                  const natPoolJ = naturalPoolMap.get(uJ.id) || 1;
                  minJ = Math.max(minJ, natPoolJ + injOffJ);
                }
                const maxJ =
                  lpJ !== undefined ? Math.min(actualPoolsCount, lpJ + 3) + injOffJ : actualPoolsCount;
                const newPoolForJ = Math.floor(i / 4) + 1;
                if (minJ <= newPoolForJ && maxJ >= newPoolForJ) {
                  target = j;
                  break;
                }
              }
              if (target !== -1) {
                const [shiftedUser] = finalUsers.splice(target, 1);
                finalUsers.splice(i, 0, shiftedUser);
                hasMoved = true;
                break;
              }
            }
          }
        }
      }
    }

    const pools: { level: number; players: SimPlayer[] }[] = [];
    for (let level = 1; level <= actualPoolsCount; level++) {
      const poolUsers = finalUsers.slice((level - 1) * 4, level * 4);
      poolUsers.sort((a, b) => b.averagePoints - a.averagePoints);
      pools.push({ level, players: poolUsers });
    }

    // Build Tournament Groups (Binômes of 2 pools, plus optional orphan pool if odd)
    const groups: {
      groupIndex: number;
      isOrphan: boolean;
      title: string;
      courtNumbers: number[];
      pools: { level: number; players: SimPlayer[] }[];
      teams: { number: number; label: string; p1: SimPlayer; p2: SimPlayer }[];
      matches: SimMatch[];
    }[] = [];

    const allMatches: SimMatch[] = [];
    const pairsCount = Math.floor(pools.length / 2);

    for (let k = 0; k < pairsCount; k++) {
      const poolA = pools[k * 2];
      const poolB = pools[k * 2 + 1];
      const cA = poolA.level;
      const cB = poolB.level;

      const t1 = {
        number: 1,
        label: `Équipe 1 (#1 P${cA} + #4 P${cB})`,
        p1: poolA.players[0],
        p2: poolB.players[3]
      };
      const t2 = {
        number: 2,
        label: `Équipe 2 (#2 P${cA} + #3 P${cB})`,
        p1: poolA.players[1],
        p2: poolB.players[2]
      };
      const t3 = {
        number: 3,
        label: `Équipe 3 (#3 P${cA} + #2 P${cB})`,
        p1: poolA.players[2],
        p2: poolB.players[1]
      };
      const t4 = {
        number: 4,
        label: `Équipe 4 (#4 P${cA} + #1 P${cB})`,
        p1: poolA.players[3],
        p2: poolB.players[0]
      };

      const matches: SimMatch[] = [
        {
          id: `g${k}-m1`,
          order: 1,
          rotation: 1,
          courtNumber: cA,
          courtLabel: `Terrain ${cA}`,
          team1Label: "Équipe 1",
          team2Label: "Équipe 2",
          team1Players: [t1.p1, t1.p2],
          team2Players: [t2.p1, t2.p2]
        },
        {
          id: `g${k}-m2`,
          order: 2,
          rotation: 1,
          courtNumber: cB,
          courtLabel: `Terrain ${cB}`,
          team1Label: "Équipe 3",
          team2Label: "Équipe 4",
          team1Players: [t3.p1, t3.p2],
          team2Players: [t4.p1, t4.p2]
        },
        {
          id: `g${k}-m3`,
          order: 3,
          rotation: 2,
          courtNumber: cA,
          courtLabel: `Terrain ${cA}`,
          team1Label: "Équipe 1",
          team2Label: "Équipe 3",
          team1Players: [t1.p1, t1.p2],
          team2Players: [t3.p1, t3.p2]
        },
        {
          id: `g${k}-m4`,
          order: 4,
          rotation: 2,
          courtNumber: cB,
          courtLabel: `Terrain ${cB}`,
          team1Label: "Équipe 2",
          team2Label: "Équipe 4",
          team1Players: [t2.p1, t2.p2],
          team2Players: [t4.p1, t4.p2]
        },
        {
          id: `g${k}-m5`,
          order: 5,
          rotation: 3,
          courtNumber: cA,
          courtLabel: `Terrain ${cA}`,
          team1Label: "Équipe 1",
          team2Label: "Équipe 4",
          team1Players: [t1.p1, t1.p2],
          team2Players: [t4.p1, t4.p2]
        },
        {
          id: `g${k}-m6`,
          order: 6,
          rotation: 3,
          courtNumber: cB,
          courtLabel: `Terrain ${cB}`,
          team1Label: "Équipe 2",
          team2Label: "Équipe 3",
          team1Players: [t2.p1, t2.p2],
          team2Players: [t3.p1, t3.p2]
        }
      ];

      groups.push({
        groupIndex: k,
        isOrphan: false,
        title: `Poules #${cA} & #${cB}`,
        courtNumbers: [cA, cB],
        pools: [poolA, poolB],
        teams: [t1, t2, t3, t4],
        matches
      });
      allMatches.push(...matches);
    }

    if (pools.length % 2 === 1) {
      const lastPool = pools[pools.length - 1];
      const pU = lastPool.players;
      const cNum = lastPool.level;
      const orphanMatches: SimMatch[] = [
        {
          id: `orphan-m1`,
          order: 1,
          rotation: 1,
          courtNumber: cNum,
          courtLabel: `Terrain ${cNum}`,
          team1Label: "Seed 1 & 4",
          team2Label: "Seed 2 & 3",
          team1Players: [pU[0], pU[3]],
          team2Players: [pU[1], pU[2]]
        },
        {
          id: `orphan-m2`,
          order: 2,
          rotation: 2,
          courtNumber: cNum,
          courtLabel: `Terrain ${cNum}`,
          team1Label: "Seed 1 & 3",
          team2Label: "Seed 2 & 4",
          team1Players: [pU[0], pU[2]],
          team2Players: [pU[1], pU[3]]
        },
        {
          id: `orphan-m3`,
          order: 3,
          rotation: 3,
          courtNumber: cNum,
          courtLabel: `Terrain ${cNum}`,
          team1Label: "Seed 1 & 2",
          team2Label: "Seed 3 & 4",
          team1Players: [pU[0], pU[1]],
          team2Players: [pU[2], pU[3]]
        }
      ];

      groups.push({
        groupIndex: pairsCount,
        isOrphan: true,
        title: `Poule #${cNum}`,
        courtNumbers: [cNum],
        pools: [lastPool],
        teams: [],
        matches: orphanMatches
      });
      allMatches.push(...orphanMatches);
    }

    // Map each player to their fixed partner
    const partnerMap = new Map<string, { partner: SimPlayer; teamNumber: number }>();
    for (const g of groups) {
      for (const t of g.teams) {
        partnerMap.set(t.p1.id, { partner: t.p2, teamNumber: t.number });
        partnerMap.set(t.p2.id, { partner: t.p1, teamNumber: t.number });
      }
    }

    return {
      regsWithPriority,
      unselectedRegs,
      actualPoolsCount,
      pools,
      groups,
      allMatches,
      partnerMap
    };
  }, [registrations, courtsCount, playerMap]);

  function handleRandomScores() {
    const sample: [number, number][] = [
      [6, 3],
      [6, 4],
      [5, 5],
      [4, 6],
      [2, 6],
      [6, 2],
      [5, 4],
      [4, 4],
      [3, 6]
    ];
    const next: Record<string, { t1: string; t2: string }> = {};
    tournamentData.allMatches.forEach((m, idx) => {
      const pick = sample[(idx * 7 + m.courtNumber * 3) % sample.length];
      next[m.id] = { t1: String(pick[0]), t2: String(pick[1]) };
    });
    setScores(next);
  }

  const totalPlaces = courtsCount * 4;
  const registeredCount = tournamentData.regsWithPriority.length;
  const placesLeft = Math.max(0, totalPlaces - registeredCount);
  const waitlistCount = Math.max(0, registeredCount - totalPlaces);

  const availableUsers = useMemo(() => {
    const regIds = new Set(registrations.map(r => r.userId));
    return players
      .filter(p => !regIds.has(p.id))
      .sort((a, b) =>
        (a.nickname || a.name).toLowerCase().localeCompare((b.nickname || b.name).toLowerCase())
      );
  }, [players, registrations]);

  const poulesCount = Math.floor(registeredCount / 4);
  const remplaCount = registeredCount % 4;
  const sessionDateObj = currentSessionObj ? new Date(currentSessionObj.date) : new Date();

  let listText = `🏆 Tournoi du ${sessionDateObj.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long"
  })}\n\n`;
  listText += `👥 ${registeredCount} inscrit(s)\n`;
  listText += `▶️ ${poulesCount} poule(s) + ${remplaCount} remplaçant(s)\n\n`;
  tournamentData.regsWithPriority.forEach((reg, idx) => {
    const p = playerMap.get(reg.userId);
    if (p) listText += `${idx + 1} - ${p.nickname || p.name}\n`;
  });

  // ============================================================================
  // VUE 2 : FEUILLE DE BINÔME / POULE & MATCHS (Identique à /pool/[id] en BLEU)
  // ============================================================================
  if (activeView === "pool") {
    const group =
      tournamentData.groups[selectedGroupIndex] || tournamentData.groups[0];

    if (!group) {
      setActiveView("session");
      return null;
    }

    const allGroupMatchesFinished = group.matches.every(m => {
      const sc = scores[m.id];
      return sc && sc.t1 !== "" && sc.t2 !== "";
    });

    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-10">
        <div className="flex flex-wrap justify-between items-end mb-6 gap-4">
          <div>
            <button
              type="button"
              onClick={() => setActiveView("session")}
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-800 mb-3 transition-colors"
            >
              ← Retour aux détails de la session
            </button>
            <h1 className="text-3xl font-black text-blue-800 flex flex-wrap items-center gap-3">
              <span>🎾 {group.title}</span>
              <span className="text-xl bg-blue-50 text-blue-800 px-4 py-1.5 rounded-xl shadow-sm border border-blue-200 flex items-center gap-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M4 5h16M4 19h16M4 5v14M20 5v14M12 5v14M4 12h16"
                  ></path>
                </svg>
                {group.courtNumbers.length === 2
                  ? `Terrains ${group.courtNumbers[0]} & ${group.courtNumbers[1]}`
                  : `Terrain ${group.courtNumbers[0]}`}
              </span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium flex items-center gap-3">
              <span>
                Session Tournoi du {sessionDateObj.toLocaleDateString("fr-FR")}
              </span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold border border-blue-200 shadow-sm">
                🏆 Paires fixes (3 matchs de 25 min)
              </span>
            </p>
          </div>
        </div>

        {/* Cartes des Poules & Équipes Fixes du Binôme */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {group.pools.map(pool => (
            <div
              key={pool.level}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6"
            >
              <h2 className="text-xl font-bold text-blue-800 mb-4">
                👥 Joueurs — Poule #{pool.level}
              </h2>
              <ul className="space-y-3">
                {pool.players.map((p, idx) => {
                  const pInfo = tournamentData.partnerMap.get(p.id);
                  return (
                    <li
                      key={p.id}
                      className="flex justify-between items-center font-medium bg-gray-50 p-3 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-blue-800 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <span
                            className={
                              p.id === currentUserId
                                ? "text-orange-600 font-black"
                                : "text-gray-800 font-bold"
                            }
                          >
                            {shortName(p)} {p.id === currentUserId && "(Vous)"}
                          </span>
                          {pInfo && (
                            <span className="ml-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              Éq.{pInfo.teamNumber} avec {shortName(pInfo.partner)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-blue-600 text-sm font-bold bg-slate-100 px-2 py-1 rounded">
                        {p.averagePoints.toFixed(2).replace(".", ",")} pts
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Récapitulatif des 4 Équipes fixes */}
        {!group.isOrphan && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-blue-900 mb-3">
              🤝 Les 4 Équipes fixes du binôme ({group.title})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {group.teams.map(t => (
                <div
                  key={t.number}
                  className="bg-white p-3 rounded-2xl border border-blue-100 shadow-2xs"
                >
                  <div className="text-xs font-black text-blue-800 mb-1">
                    Équipe {t.number}
                  </div>
                  <div className="font-black text-gray-900 text-sm">
                    {shortName(t.p1)} & {shortName(t.p2)}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    #1 P{group.pools[0].level} croisé P{group.pools[1].level}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chronomètre officiel */}
        <MatchTimer initialMinutes={25} />

        {/* Feuille de Matchs (exactement le style de PoolScoreForm.tsx en tons bleus) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              ⚔️ Matchs (25 minutes ou 1 set)
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRandomScores}
                className="text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3 py-2 rounded-xl transition-colors"
              >
                🎲 Remplir scores test
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {group.matches.map(m => {
              const sc = scores[m.id] || { t1: "", t2: "" };
              const isDone = sc.t1 !== "" && sc.t2 !== "";
              return (
                <div
                  key={m.id}
                  className="border-2 border-gray-100 rounded-2xl overflow-hidden hover:border-blue-200 transition-colors"
                >
                  <div className="bg-gradient-to-r from-blue-800 to-indigo-900 px-5 py-3 font-bold text-white flex justify-between items-center">
                    <span>
                      Rotation {m.rotation} (25 min) — 🏟️ {m.courtLabel} ({m.team1Label} vs{" "}
                      {m.team2Label})
                    </span>
                    {isDone ? (
                      <span className="text-orange-300 text-sm">Terminé</span>
                    ) : (
                      <span className="text-blue-200 text-sm">En attente</span>
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row p-6 gap-6 items-center justify-between bg-white">
                    <div className="flex-1 text-center md:text-right">
                      <div className="font-black text-xl text-blue-900 bg-blue-50 px-4 py-2 rounded-xl inline-block border border-blue-200 shadow-sm">
                        {shortName(m.team1Players[0])}{" "}
                        <span className="text-gray-400">&</span>{" "}
                        {shortName(m.team1Players[1])}
                      </div>
                      <div className="text-xs font-bold text-blue-600 mt-1">
                        {m.team1Label}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="Jeux"
                        value={sc.t1}
                        onChange={e =>
                          setScores(prev => ({
                            ...prev,
                            [m.id]: { ...sc, t1: e.target.value }
                          }))
                        }
                        className="w-20 h-14 border-2 border-blue-300 rounded-xl text-center font-black text-2xl text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 bg-white"
                      />
                      <span className="font-black text-gray-400 text-2xl">-</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="Jeux"
                        value={sc.t2}
                        onChange={e =>
                          setScores(prev => ({
                            ...prev,
                            [m.id]: { ...sc, t2: e.target.value }
                          }))
                        }
                        className="w-20 h-14 border-2 border-indigo-300 rounded-xl text-center font-black text-2xl text-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 bg-white"
                      />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="font-black text-xl text-indigo-900 bg-indigo-50 px-4 py-2 rounded-xl inline-block border border-indigo-200 shadow-sm">
                        {shortName(m.team2Players[0])}{" "}
                        <span className="text-gray-400">&</span>{" "}
                        {shortName(m.team2Players[1])}
                      </div>
                      <div className="text-xs font-bold text-indigo-600 mt-1">
                        {m.team2Label}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="text-center pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setActiveView("session")}
                className="bg-blue-700 hover:bg-blue-800 text-white font-black py-4 px-8 rounded-2xl shadow-lg transition-transform transform hover:scale-[1.02] text-base w-full sm:w-auto"
              >
                💾 Enregistrer les scores provisoires
              </button>
              {allGroupMatchesFinished && (
                <button
                  type="button"
                  onClick={() => setActiveView("results")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-8 rounded-2xl shadow-lg transition-transform transform hover:scale-[1.02] text-base w-full sm:w-auto"
                >
                  ✅ Voir les résultats définitifs 👉
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VUE 3 : RÉSULTATS DE LA SESSION (/session/[id]/results en BLEU)
  // ============================================================================
  if (activeView === "results") {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
          <div>
            <button
              type="button"
              onClick={() => setActiveView("session")}
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-800 mb-3 transition-colors"
            >
              ← Retour aux détails de la session
            </button>
            <h1 className="text-3xl font-black text-blue-800 flex items-center gap-3">
              <span className="text-4xl">🏆</span> Résultats de la Session (Tournoi)
            </h1>
            <p className="text-gray-500 mt-2 font-medium capitalize">
              {sessionDateObj.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRandomScores}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-sm text-xs"
            >
              🎲 Générer d&apos;autres scores test
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {tournamentData.groups.map(group => {
            // Compute standings for all players in this group (8 players in a pair of pools, or 4 in orphan)
            const groupPlayers = group.pools.flatMap(p =>
              p.players.map((pl, idx) => ({ player: pl, poolLevel: p.level, seed: idx + 1 }))
            );

            const standings = groupPlayers.map(pt => {
              let sessionPoints = 0;
              let wins = 0;
              let draws = 0;
              let losses = 0;
              let gamesWon = 0;

              for (const match of group.matches) {
                const isTeam1 =
                  match.team1Players[0].id === pt.player.id ||
                  match.team1Players[1].id === pt.player.id;
                const isTeam2 =
                  match.team2Players[0].id === pt.player.id ||
                  match.team2Players[1].id === pt.player.id;
                if (!isTeam1 && !isTeam2) continue;

                const sc = scores[match.id];
                if (!sc || sc.t1 === "" || sc.t2 === "") continue;
                const g1 = parseInt(sc.t1, 10);
                const g2 = parseInt(sc.t2, 10);
                if (isNaN(g1) || isNaN(g2)) continue;

                const myGames = isTeam1 ? g1 : g2;
                const theirGames = isTeam1 ? g2 : g1;

                sessionPoints += myGames;
                gamesWon += myGames;

                if (myGames > theirGames) {
                  sessionPoints += 30;
                  wins++;
                } else if (myGames === theirGames) {
                  sessionPoints += 20;
                  draws++;
                } else {
                  sessionPoints += 10;
                  losses++;
                }
              }

              return {
                player: pt.player,
                poolLevel: pt.poolLevel,
                wins,
                draws,
                losses,
                gamesWon,
                sessionPoints
              };
            });

            standings.sort((a, b) => b.sessionPoints - a.sessionPoints);

            const topPlayer = standings.find(
              s => s.wins === 3 || (s.wins === 2 && s.draws === 1)
            );
            const flopPlayer = [...standings].reverse().find(s => s.losses === 3);

            return (
              <div
                key={group.groupIndex}
                id={`capture-results-group-${group.groupIndex}`}
                className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-8"
              >
                <div className="bg-blue-950 px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-white">
                  <div className="flex items-center gap-4">
                    <h2 className="font-black text-xl">{group.title}</h2>
                    <span className="bg-blue-800 px-4 py-1 rounded-full text-sm font-bold border border-blue-700 flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M4 5h16M4 19h16M4 5v14M20 5v14M12 5v14M4 12h16"
                        ></path>
                      </svg>
                      {group.courtNumbers.length === 2
                        ? `Terrains ${group.courtNumbers[0]} & ${group.courtNumbers[1]}`
                        : `Terrain ${group.courtNumbers[0]}`}
                    </span>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Standings Table */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      📊 Classement du binôme
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs rounded-lg">
                          <tr>
                            <th className="px-4 py-3 rounded-l-xl">Joueur</th>
                            <th className="px-3 py-3 text-center">V</th>
                            <th className="px-3 py-3 text-center">N</th>
                            <th className="px-3 py-3 text-center">D</th>
                            <th className="px-3 py-3 text-center">Jeux</th>
                            <th className="px-3 py-3 text-center">Points</th>
                            <th className="px-4 py-3 text-right rounded-r-xl">Moy.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {standings.map((s, idx) => (
                            <tr
                              key={s.player.id}
                              className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors"
                            >
                              <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                    idx === 0
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="flex items-center gap-1">
                                  {(s.player.stars || 0) > 0 && (
                                    <span className="text-yellow-400">
                                      {"⭐".repeat(s.player.stars)}
                                    </span>
                                  )}
                                  {shortName(s.player)}
                                  <span className="text-[10px] text-gray-400 font-normal">
                                    (P{s.poolLevel})
                                  </span>
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-green-600">
                                {s.wins}
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-yellow-600">
                                {s.draws}
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-red-500">
                                {s.losses}
                              </td>
                              <td className="px-3 py-3 text-center text-gray-500 font-medium">
                                {s.gamesWon}
                              </td>
                              <td className="px-3 py-3 text-center font-bold text-slate-800">
                                +{s.sessionPoints}
                              </td>
                              <td className="px-4 py-3 text-right font-black text-blue-800 bg-blue-50/30 rounded-r-xl">
                                {(s.sessionPoints / 3).toFixed(2).replace(".", ",")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Matches List */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      ⚔️ Scores finaux
                    </h3>
                    <div className="space-y-3">
                      {group.matches.map(m => {
                        const sc = scores[m.id] || { t1: "0", t2: "0" };
                        const g1 = parseInt(sc.t1, 10) || 0;
                        const g2 = parseInt(sc.t2, 10) || 0;
                        return (
                          <div
                            key={m.id}
                            className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between text-sm"
                          >
                            <div className="flex-1 text-right font-medium text-gray-700">
                              <span className="text-[10px] text-blue-600 font-bold block">
                                Rot.{m.rotation} • {m.courtLabel}
                              </span>
                              {shortName(m.team1Players[0])} / {shortName(m.team1Players[1])}
                            </div>
                            <div className="px-4 font-black flex items-center gap-2 shrink-0">
                              <span
                                className={
                                  g1 > g2
                                    ? "text-green-500"
                                    : g1 < g2
                                    ? "text-red-500"
                                    : "text-orange-500"
                                }
                              >
                                {g1}
                              </span>
                              <span className="text-gray-300">-</span>
                              <span
                                className={
                                  g2 > g1
                                    ? "text-green-500"
                                    : g2 < g1
                                    ? "text-red-500"
                                    : "text-orange-500"
                                }
                              >
                                {g2}
                              </span>
                            </div>
                            <div className="flex-1 text-left font-medium text-gray-700">
                              <span className="text-[10px] text-indigo-600 font-bold block">
                                {m.team1Label} vs {m.team2Label}
                              </span>
                              {shortName(m.team2Players[0])} / {shortName(m.team2Players[1])}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Top / Flop */}
                {(topPlayer || flopPlayer) && (
                  <div className="bg-blue-50/50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    {topPlayer ? (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-blue-100 flex-1">
                        <span className="text-3xl">🏆</span>
                        <div>
                          <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">
                            TOP
                          </span>
                          <br />
                          <span className="font-black text-gray-800 text-lg">
                            {shortName(topPlayer.player)}
                          </span>
                          <span className="text-green-600 font-bold ml-2">
                            (Moy:{" "}
                            {(topPlayer.sessionPoints / 3).toFixed(2).replace(".", ",")})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1"></div>
                    )}

                    {flopPlayer ? (
                      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-blue-100 flex-1 justify-end text-right">
                        <div>
                          <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">
                            FLOP
                          </span>
                          <br />
                          <span className="font-black text-gray-800 text-lg">
                            {shortName(flopPlayer.player)}
                          </span>
                          <span className="text-red-500 font-bold ml-2">
                            (Moy:{" "}
                            {(flopPlayer.sessionPoints / 3).toFixed(2).replace(".", ",")})
                          </span>
                        </div>
                        <span className="text-3xl">💩</span>
                      </div>
                    ) : (
                      <div className="flex-1"></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // VUE 1 : DÉTAILS SESSION TOURNOI (Identique à /session/[id] en tons BLEUS)
  // ============================================================================
  let whatsappPoolsText = `🏆 *Les Poules & Équipes du Tournoi sont prêtes !*\n`;
  for (const g of tournamentData.groups) {
    if (!g.isOrphan) {
      whatsappPoolsText += `\n🔹 *${g.title} (Terrains ${g.courtNumbers[0]} & ${g.courtNumbers[1]})* :\n`;
      for (const t of g.teams) {
        whatsappPoolsText += `  • Éq.${t.number} : ${shortName(t.p1)} & ${shortName(t.p2)}\n`;
      }
    } else {
      whatsappPoolsText += `\n🔹 *${g.title} (Terrain ${g.courtNumbers[0]})* :\n`;
      whatsappPoolsText += `  • ${g.pools[0].players.map(p => shortName(p)).join(", ")}\n`;
    }
  }
  if (tournamentData.unselectedRegs.length > 0) {
    whatsappPoolsText +=
      "\n❌ Ne peuvent pas jouer cette session : " +
      tournamentData.unselectedRegs
        .map(r => {
          const p = playerMap.get(r.userId);
          return p ? p.nickname || p.name : "";
        })
        .filter(Boolean)
        .join(", ");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* En-tête identique à Détails Session (en bleu) */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div>
          <BackButton fallback="/admin" />
          <h1 className="text-3xl font-black text-blue-800 flex items-center gap-3">
            <span className="text-4xl">🏆</span> Détails Session — Mode Tournoi
          </h1>
          <p className="text-gray-500 mt-2 font-medium capitalize">
            {sessionDateObj.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric"
            })}
          </p>
        </div>

        {/* Barre d'outils de simulation rapide (discrète pour l'admin) */}
        <div className="flex flex-wrap items-center gap-2 bg-blue-50 border border-blue-200 p-2.5 rounded-2xl">
          <select
            value={selectedSessionId}
            onChange={e => handleLoadSession(e.target.value)}
            className="p-1.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-blue-900 focus:outline-none"
            title="Charger une session"
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                Session du {new Date(s.date).toLocaleDateString("fr-FR")} ({s.registrations.length}{" "}
                inscrits)
              </option>
            ))}
          </select>
          <select
            value={courtsCount}
            onChange={e => setCourtsCount(parseInt(e.target.value, 10))}
            className="p-1.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-blue-900 focus:outline-none"
            title="Nombre de terrains"
          >
            {[2, 4, 6, 8, 10, 3, 5, 7, 9].map(n => (
              <option key={n} value={n}>
                {n} terrains ({n * 4} pl.)
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleQuickFill(courtsCount * 4 + 2, courtsCount)}
            className="bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs px-2.5 py-1.5 rounded-xl transition-colors"
            title="Simuler une liste complète d'inscrits"
          >
            ⚡ Simuler inscrits
          </button>
          <button
            type="button"
            onClick={() => {
              handleRandomScores();
              setActiveView("results");
            }}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl transition-colors"
          >
            🎲 Tester Résultats
          </button>
        </div>
      </div>

      {/* Les 4 compteurs identiques à Détails Session */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 flex flex-col items-center text-center">
          <span className="text-sm font-bold text-blue-800 mb-1">Terrains Ouverts</span>
          <span className="text-3xl font-black text-blue-900">{courtsCount}</span>
        </div>
        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center text-center">
          <span className="text-sm font-bold text-indigo-600 mb-1">Places Totales</span>
          <span className="text-3xl font-black text-indigo-900">{totalPlaces}</span>
        </div>
        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex flex-col items-center text-center">
          <span className="text-sm font-bold text-orange-600 mb-1">Inscrits</span>
          <span className="text-3xl font-black text-orange-900">{registeredCount}</span>
        </div>
        {totalPlaces > 0 && (
          <div
            className={`${
              placesLeft > 0
                ? "bg-cyan-50 border-cyan-100 text-cyan-900"
                : "bg-red-50 border-red-100 text-red-900"
            } p-4 rounded-2xl border flex flex-col items-center text-center`}
          >
            <span
              className={`text-sm font-bold mb-1 ${
                placesLeft > 0 ? "text-cyan-600" : "text-red-600"
              }`}
            >
              {placesLeft > 0 ? "Places Dispos" : "Remplaçants"}
            </span>
            <span className="text-3xl font-black">
              {placesLeft > 0 ? placesLeft : waitlistCount}
            </span>
          </div>
        )}
      </div>

      {/* Section Composition des Poules (exactement la même grille 2 colonnes que Détails Session, en tons bleus) */}
      {tournamentData.pools.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-black text-blue-800 flex items-center gap-3">
              <span className="text-3xl">🎾</span> Composition des Poules (Tournoi 2 par 2)
            </h2>
            <div data-html2canvas-ignore>
              <WhatsAppShareButton
                elementIds={tournamentData.pools.map(p => `capture-pool-sim-${p.level}`)}
                text={whatsappPoolsText}
                fileName="poules-tournoi.png"
              />
            </div>
          </div>

          {tournamentData.unselectedRegs.length > 0 && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 text-orange-800 shadow-sm">
              <div className="text-2xl">ℹ️</div>
              <div>
                <p className="font-bold text-sm">
                  Ne peuvent pas jouer cette session (sur liste d&apos;attente) :
                </p>
                <p className="text-sm mt-1 font-medium">
                  {tournamentData.unselectedRegs
                    .map(r => {
                      const p = playerMap.get(r.userId);
                      return p ? p.nickname || p.name : "";
                    })
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Les Poules affichées 2 par 2 côte à côte exactement comme sur la page Détails Session */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournamentData.pools.map(pool => {
              const groupIdx = Math.floor((pool.level - 1) / 2);
              const group = tournamentData.groups[groupIdx];
              const allMatchesFinished =
                group &&
                group.matches.every(m => {
                  const sc = scores[m.id];
                  return sc && sc.t1 !== "" && sc.t2 !== "";
                });

              const selectedResId = poolReservations[pool.level] || "";
              const reservationsList = currentSessionObj?.reservations || [];

              return (
                <div
                  key={pool.level}
                  id={`capture-pool-sim-${pool.level}`}
                  className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden"
                >
                  {/* En-tête BLEU (au lieu de vert) */}
                  <div className="bg-blue-800 px-5 py-3 flex flex-wrap justify-between items-center text-white gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg">Poule #{pool.level}</h3>
                      <span className="text-xs font-bold bg-blue-950/70 text-blue-200 px-2.5 py-1 rounded-full border border-blue-700">
                        {group?.isOrphan
                          ? "Classique"
                          : `Binôme ${groupIdx + 1} (Poules ${group.courtNumbers[0]} & ${group.courtNumbers[1]})`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-blue-900/60 p-1.5 rounded-xl">
                      <select
                        value={selectedResId}
                        onChange={e =>
                          setPoolReservations(prev => ({
                            ...prev,
                            [pool.level]: e.target.value
                          }))
                        }
                        className="p-1.5 rounded-lg border border-blue-700 text-xs font-bold text-white bg-blue-950 focus:outline-none max-w-[170px]"
                      >
                        <option value="">-- Terrain {pool.level} --</option>
                        {reservationsList.map(res => (
                          <option key={res.id} value={res.id}>
                            {res.clubName} Terrain {res.name} ({res.startTime})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Liste des 4 joueurs de la poule (même style exact que Détails Session) */}
                  <div className="p-4 flex flex-col gap-3">
                    {pool.players.map((pt, idx) => {
                      const seed = idx + 1;
                      const partnerInfo = tournamentData.partnerMap.get(pt.id);
                      return (
                        <div
                          key={pt.id}
                          className={`flex items-center gap-3 p-2 rounded-xl border ${
                            pt.id === currentUserId
                              ? "border-orange-400 bg-orange-50"
                              : "border-gray-100 bg-gray-50"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                            {seed}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-bold text-gray-800 text-base flex items-center gap-1">
                                {(pt.stars || 0) > 0 && (
                                  <span className="text-yellow-400">
                                    {"⭐".repeat(pt.stars)}
                                  </span>
                                )}
                                {pt.nickname || pt.name}
                              </span>
                              {pt.nickname && (
                                <span className="text-xs font-medium text-gray-500">
                                  {pt.name}
                                </span>
                              )}
                            </div>
                            {partnerInfo && (
                              <div className="text-[11px] font-bold text-blue-700 mt-0.5">
                                🤝 Équipe {partnerInfo.teamNumber} avec{" "}
                                {shortName(partnerInfo.partner)}
                              </div>
                            )}
                          </div>
                          <div className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg shrink-0">
                            {(pt.averagePoints || 0).toFixed(2).replace(".", ",")} pts
                          </div>
                        </div>
                      );
                    })}

                    {allMatchesFinished ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveView("results")}
                          className="flex items-center justify-center gap-2 text-sm font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 py-2.5 rounded-xl transition-colors border border-blue-200"
                        >
                          ✅ Voir les résultats définitifs 👉
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroupIndex(groupIdx);
                            setActiveView("pool");
                          }}
                          className="text-center text-xs font-bold text-blue-600 hover:text-blue-800 bg-white py-1.5 rounded-xl transition-colors border border-blue-100 shadow-sm"
                        >
                          ✏️ Modifier les scores
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGroupIndex(groupIdx);
                          setActiveView("pool");
                        }}
                        className="mt-2 text-center text-sm font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-2.5 rounded-xl transition-colors border border-blue-200"
                      >
                        Voir la poule et les matchs 👉
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bloc Gestion des inscriptions (identique à Détails Session, en tons bleus) */}
      <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 mt-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 text-8xl">👑</div>
        <h3 className="font-bold text-blue-900 mb-3 relative z-10">
          Gestion des inscriptions
        </h3>
        <form
          onSubmit={handleManualRegister}
          className="flex flex-col gap-2 relative z-10 w-full md:w-2/3"
        >
          <div className="flex items-center gap-2 bg-blue-100 p-2 rounded-xl border border-blue-200 w-fit">
            <input
              type="checkbox"
              id="simBoardInjury"
              checked={newRegInjury}
              onChange={e => setNewRegInjury(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor="simBoardInjury"
              className="text-blue-900 text-sm font-bold cursor-pointer"
            >
              Retour blessure
            </label>
          </div>
          <div className="flex gap-3 w-full">
            <select
              value={newRegUserId}
              onChange={e => setNewRegUserId(e.target.value)}
              required
              className="flex-1 p-2.5 rounded-xl border border-blue-200 bg-white text-sm focus:outline-none"
            >
              <option value="">-- Sélectionner un joueur --</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nickname ? `${u.nickname} (${u.name})` : u.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Inscrire
            </button>
          </div>
        </form>
      </div>

      {/* Bloc Liste des Inscrits (identique à Détails Session) */}
      <div
        id="capture-players-list"
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mt-6"
      >
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-800 text-lg flex items-center justify-between">
              <span>Liste des Inscrits ({registeredCount})</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              L&apos;ordre prioritaire sera appliqué lors de la fermeture des inscriptions par le Board
            </p>
          </div>
          <div data-html2canvas-ignore>
            <WhatsAppShareTextButton
              textToShare={listText}
              label="Partager sur le Groupe APT"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {tournamentData.regsWithPriority.map((reg, idx) => {
            const p = playerMap.get(reg.userId);
            if (!p) return null;
            const isCurrentUser = reg.userId === currentUserId;
            let priorityStyles = "";
            let priorityBadge = null;

            if (reg.priorityType === 1) {
              priorityStyles = isCurrentUser
                ? "bg-orange-50/50 border-l-4 border-green-500"
                : "bg-green-50/40 border-l-4 border-green-500";
              priorityBadge = (
                <span className="text-[10px] uppercase font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-md border border-green-200">
                  Session Précédente
                </span>
              );
            } else if (reg.priorityType === 2) {
              priorityStyles = isCurrentUser
                ? "bg-orange-50/50 border-l-4 border-blue-500"
                : "bg-slate-50/40 border-l-4 border-blue-500";
              priorityBadge = (
                <span className="text-[10px] uppercase font-bold bg-slate-100 text-blue-800 px-2 py-0.5 rounded-md border border-slate-200">
                  Inscrit
                </span>
              );
            } else {
              priorityStyles = isCurrentUser
                ? "bg-orange-50/50 border-l-4 border-purple-500"
                : "bg-purple-50/40 border-l-4 border-purple-500";
              priorityBadge = (
                <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md border border-purple-200">
                  Nouveau
                </span>
              );
            }

            return (
              <div
                key={reg.userId}
                className={`flex items-center gap-4 p-4 ${priorityStyles}`}
              >
                <div className="flex-shrink-0 w-8 text-center font-black text-gray-400">
                  {idx + 1}
                </div>
                <div className="flex-shrink-0 w-10 h-10 bg-white text-blue-800 rounded-full flex items-center justify-center font-bold shadow-sm border border-gray-100">
                  {(p.nickname || p.name).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                    <span className="text-lg flex items-center gap-1">
                      {(p.stars || 0) > 0 && (
                        <span className="text-yellow-400">
                          {"⭐".repeat(p.stars)}
                        </span>
                      )}
                      {p.nickname || p.name}
                    </span>
                    {p.nickname && (
                      <span className="text-sm font-medium text-gray-500">
                        {p.name}
                      </span>
                    )}
                    {priorityBadge}
                    {isCurrentUser && (
                      <span className="text-[10px] uppercase font-bold bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">
                        Vous
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex gap-2 items-center flex-wrap">
                    <span>
                      Inscrit le{" "}
                      {new Date(reg.createdAt)
                        .toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Europe/Paris"
                        })
                        .replace(":", "h")}
                    </span>
                    {reg.isReturningFromInjury && (
                      <span className="text-orange-600 font-bold flex items-center bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                        🩺 Blessure
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {idx > 0 &&
                    tournamentData.regsWithPriority[idx - 1].priorityType ===
                      reg.priorityType && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSwapOrder(idx, "up", tournamentData.regsWithPriority)
                        }
                        className="text-blue-800 bg-slate-50 border border-slate-200 hover:bg-blue-800 hover:text-white p-2 text-sm rounded-lg transition-colors flex items-center justify-center shadow-sm"
                        title="Monter ce joueur"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M5 15l7-7 7 7"
                          ></path>
                        </svg>
                      </button>
                    )}
                  {idx < tournamentData.regsWithPriority.length - 1 &&
                    tournamentData.regsWithPriority[idx + 1].priorityType ===
                      reg.priorityType && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSwapOrder(idx, "down", tournamentData.regsWithPriority)
                        }
                        className="text-blue-800 bg-slate-50 border border-slate-200 hover:bg-blue-800 hover:text-white p-2 text-sm rounded-lg transition-colors flex items-center justify-center shadow-sm"
                        title="Descendre ce joueur"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M19 9l-7 7-7-7"
                          ></path>
                        </svg>
                      </button>
                    )}
                  <button
                    type="button"
                    onClick={() => handleUnregister(reg.userId)}
                    className="text-red-500 bg-red-50 border border-red-200 hover:bg-red-600 hover:text-white p-2 ml-2 text-sm rounded-lg transition-colors flex items-center justify-center shadow-sm"
                    title="Désinscrire ce joueur"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {registeredCount === 0 && (
            <div className="p-8 text-center text-gray-500 font-medium">
              Aucun inscrit pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
