import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function getSessionUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('apt_user_id')?.value;

  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId }
  });
}
