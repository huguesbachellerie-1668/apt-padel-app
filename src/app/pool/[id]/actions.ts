'use server';

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveScoresAction(formData: FormData) {
  const poolId = formData.get('poolId') as string;
  const sessionId = formData.get('sessionId') as string;

  for (let i = 1; i <= 3; i++) {
    const t1 = formData.get(`m${i}_t1`) as string;
    const t2 = formData.get(`m${i}_t2`) as string;
    const matchId = formData.get(`m${i}_id`) as string;

    if (t1 !== null && t2 !== null && matchId) {
      const games1 = parseInt(t1, 10);
      const games2 = parseInt(t2, 10);
      
      if (isNaN(games1) || isNaN(games2)) continue;

      let winningTeam = 0;
      if (games1 > games2) winningTeam = 1;
      else if (games2 > games1) winningTeam = 2;

      await prisma.match.update({
        where: { id: matchId },
        data: { team1Games: games1, team2Games: games2, winningTeam }
      });
    }
  }

  revalidatePath(`/pool/${poolId}`);
  revalidatePath(`/`);
  
  if (formData.get('redirect') === 'true' && sessionId) {
    revalidatePath(`/session/${sessionId}/results`);
    redirect(`/session/${sessionId}/results`);
  }
}

export async function registerPlayersNextSession(sessionId: string, userIds: string[]) {
  for (const userId of userIds) {
    // Check if already registered
    const existing = await prisma.registration.findFirst({
       where: { sessionId, userId }
    });
    if (!existing) {
       await prisma.registration.create({
          data: { sessionId, userId }
       });
    }
  }
  revalidatePath(`/`);
  revalidatePath(`/admin`);
}
