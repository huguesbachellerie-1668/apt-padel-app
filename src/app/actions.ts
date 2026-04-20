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
  if (!session) return;

  if (!['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role)) {
    const globalSettings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const lockDay = globalSettings?.lockUnregisterDay ?? 5;
    const lockTime = globalSettings?.lockUnregisterTime ?? "20:00";

    const sessionDate = new Date(session.date);
    const lockdownDate = new Date(sessionDate);
    lockdownDate.setHours(0, 0, 0, 0);
    const daysToSubtract = (lockdownDate.getDay() - lockDay + 7) % 7;
    lockdownDate.setDate(lockdownDate.getDate() - daysToSubtract);
    const [hours, minutes] = lockTime.split(':').map(Number);
    lockdownDate.setHours(hours, minutes, 0, 0);

    const now = new Date();
    if (now > lockdownDate) {
      throw new Error("Désinscription verrouillée. Veuillez contacter les administrateurs.");
    }
  }

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
