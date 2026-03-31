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

export async function updatePoolSettings(poolId: string, sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");

  const reservationId = formData.get('reservationId') as string;
  const courtNumberStr = formData.get('courtNumber') as string;
  
  const dataToUpdate: any = {};
  if (reservationId !== undefined) {
    dataToUpdate.courtReservationId = reservationId === "" ? null : reservationId;
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

export async function createCourtReservation(sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");

  const clubId = formData.get('clubId') as string;
  const name = formData.get('name') as string;
  const startTime = formData.get('startTime') as string;

  if (!clubId || !name || !startTime) return;

  await prisma.courtReservation.create({
    data: {
      sessionId,
      clubId,
      name,
      startTime
    }
  });

  revalidatePath(`/session/${sessionId}`);
}

export async function deleteCourtReservation(sessionId: string, formData: FormData) {
  const currUser = await getSessionUser();
  if (!currUser || !['PRESIDENT', 'ORGA', 'TRESORIER'].includes(currUser.role)) throw new Error("Unauthorized");
  
  const reservationId = formData.get('reservationId') as string;
  if (!reservationId) return;

  // Unlink from pool if any
  await prisma.pool.updateMany({
    where: { courtReservationId: reservationId },
    data: { courtReservationId: null }
  });

  await prisma.courtReservation.delete({
    where: { id: reservationId }
  });

  revalidatePath(`/session/${sessionId}`);
}
