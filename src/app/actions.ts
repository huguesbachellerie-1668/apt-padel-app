'use server'

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function registerForSession(sessionId: string, formData?: FormData) {
  const user = await getSessionUser();
  if (!user) return;

  const isReturningFromInjury = formData?.get('isReturningFromInjury') === 'true';

  await prisma.registration.upsert({
    where: { userId_sessionId: { userId: user.id, sessionId } },
    update: { isReturningFromInjury },
    create: {
      userId: user.id,
      sessionId,
      status: 'INSCRIT',
      isReturningFromInjury
    }
  });

  await prisma.activityLog.create({
    data: {
      sessionId,
      message: `${user.nickname || user.name.split(' ')[0]} - Inscription${isReturningFromInjury ? ' (Retour blessure)' : ''}`
    }
  });

  revalidatePath('/');
}

export async function unregisterFromSession(sessionId: string) {
  const user = await getSessionUser();
  if (!user) return;

  const session = await prisma.session.findUnique({ where: { id: sessionId } });

  if (session?.status === 'POULES_GENEREES') {
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'POULES_EN_ATTENTE' }
    });
  }

  await prisma.registration.deleteMany({
    where: { userId: user.id, sessionId }
  });
  
  await prisma.activityLog.create({
    data: {
      sessionId,
      message: `${user.nickname || user.name.split(' ')[0]} - Désinscription`
    }
  });

  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath(`/session/${sessionId}`);
}
