'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/auth"

export async function manualRegisterForSession(sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");

  const userId = formData.get('userId') as string;
  if (!userId) return;

  const isReturningFromInjury = formData.get('isReturningFromInjury') === 'true';

  await prisma.registration.upsert({
    where: { userId_sessionId: { userId, sessionId } },
    update: { isReturningFromInjury },
    create: {
      sessionId,
      userId,
      status: 'INSCRIT',
      isReturningFromInjury
    }
  });

  revalidatePath(`/session/${sessionId}`);
  revalidatePath(`/`);
  revalidatePath('/admin');
}

export async function manualUnregisterForSession(sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");

  const userId = formData.get('userId') as string;
  if (!userId) return;

  await prisma.registration.delete({
    where: { userId_sessionId: { userId, sessionId } }
  });

  revalidatePath(`/session/${sessionId}`);
  revalidatePath(`/`);
  revalidatePath('/admin');
}

export async function updatePoolTime(poolId: string, sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");

  const startTime = formData.get('startTime') as string;
  await prisma.pool.update({
    where: { id: poolId },
    data: { startTime }
  });

  revalidatePath(`/session/${sessionId}`);
  revalidatePath(`/pool/${poolId}`);
  revalidatePath(`/`);
}
