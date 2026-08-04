'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
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

export async function updatePoolSettings(poolId: string, sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");

  const reservationId = formData.get('reservationId') as string;
  const courtNumberStr = formData.get('courtNumber') as string;
  
  const dataToUpdate: Prisma.PoolUpdateInput = {};
  if (reservationId !== undefined) {
    if (reservationId === "") {
      dataToUpdate.courtReservation = { disconnect: true };
    } else {
      dataToUpdate.courtReservation = { connect: { id: reservationId } };
    }
    
    // BUG FIX: Prevent @unique constraint violation if this reservation is already assigned to another pool.
    if (reservationId !== "") {
      await prisma.pool.updateMany({
        where: { courtReservationId: reservationId },
        data: { courtReservationId: null } as any
      });
    }
  }
  if (courtNumberStr) {
    const courtNumber = parseInt(courtNumberStr, 10);
    if (!isNaN(courtNumber)) {
      dataToUpdate.courtNumber = courtNumber;
    }
  }

  if (Object.keys(dataToUpdate).length > 0) {
    await prisma.pool.update({
      where: { id: poolId },
      data: dataToUpdate
    });
  }

  revalidatePath(`/session/${sessionId}`);
  revalidatePath(`/pool/${poolId}`);
  revalidatePath(`/`);
}


export async function swapRegistrationOrder(sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");

  const userId = formData.get('userId') as string;
  const direction = formData.get('direction') as string; // 'up' or 'down'
  
  if (!userId || !direction) return;

  const registrations = await prisma.registration.findMany({
    where: { sessionId },
    include: { user: true },
    orderBy: { createdAt: 'asc' }
  });

  const lastSession = await prisma.session.findFirst({
    where: { status: 'TERMINEE' },
    orderBy: { date: 'desc' },
    include: { pools: { include: { players: true } } }
  });
  const lastSessionUserIds = new Set<string>();
  if (lastSession) {
    lastSession.pools.forEach(p => p.players.forEach(pp => lastSessionUserIds.add(pp.userId)));
  }

  type RegistrationWithPriority = typeof registrations[0] & { priorityType?: number };
  const regs = registrations as RegistrationWithPriority[];

  regs.forEach(reg => {
     if (lastSessionUserIds.has(reg.userId)) {
         reg.priorityType = 1;
     } else if (reg.user.totalMatches && reg.user.totalMatches > 0) {
         reg.priorityType = 2;
     } else {
         reg.priorityType = 3;
     }
  });

  regs.sort((a, b) => {
      if (a.priorityType !== b.priorityType) return (a.priorityType || 3) - (b.priorityType || 3);
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });


  const currentIndex = regs.findIndex(r => r.userId === userId);
  if (currentIndex === -1) return;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  
  if (targetIndex >= 0 && targetIndex < regs.length) {
    const currentReg = regs[currentIndex];
    const targetReg = regs[targetIndex];

    let newCurrentCreatedAt = new Date(targetReg.createdAt.getTime());
    const newTargetCreatedAt = new Date(currentReg.createdAt.getTime());

    // Anti-collision au cas où les dates seraient identiques à la milliseconde près
    if (newCurrentCreatedAt.getTime() === newTargetCreatedAt.getTime()) {
       if (direction === 'up') newCurrentCreatedAt = new Date(newCurrentCreatedAt.getTime() - 1000);
       else newCurrentCreatedAt = new Date(newCurrentCreatedAt.getTime() + 1000);
    }

    await prisma.$transaction([
      prisma.registration.update({
        where: { id: currentReg.id },
        data: { createdAt: newCurrentCreatedAt }
      }),
      prisma.registration.update({
        where: { id: targetReg.id },
        data: { createdAt: newTargetCreatedAt }
      })
    ]);
  }

  revalidatePath(`/session/${sessionId}`);
}
