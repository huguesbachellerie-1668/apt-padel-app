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

  revalidatePath('/');
}

export async function unregisterFromSession(sessionId: string) {
  const user = await getSessionUser();
  if (!user) return;

  await prisma.registration.deleteMany({
    where: { userId: user.id, sessionId }
  });
  
  revalidatePath('/');
}
