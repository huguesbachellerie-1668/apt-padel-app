'use server'

import prisma from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"
import bcrypt from 'bcryptjs'

export async function changePassword(formData: FormData) {
  const currentUser = await getSessionUser();
  if (!currentUser) throw new Error("Non autorisé");

  const newPassword = formData.get('newPassword') as string;
  const targetUserId = formData.get('userId') as string;

  if (currentUser.id !== targetUserId) throw new Error("Action interdite");
  if (!newPassword || newPassword.length < 6) throw new Error("Mot de passe trop court");

  const hashed = await bcrypt.hash(newPassword, 10);
  
  await prisma.user.update({
    where: { id: currentUser.id },
    data: { password: hashed }
  });
}
