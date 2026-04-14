'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/auth"
import bcrypt from 'bcryptjs'

export async function updateMyProfile(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  const nickname = formData.get('nickname') as string;
  const emailInput = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  if (!name || name.trim() === '') {
    return { error: "Le nom est obligatoire." };
  }

  // Check if email is being changed and if it's already taken by someone else
  if (emailInput && emailInput !== user.email) {
    const existing = await prisma.user.findFirst({
        where: { email: emailInput }
    });
    if (existing) {
        return { error: "Cet email est déjà utilisé par un autre joueur." };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      nickname,
      email: emailInput || user.email,
      phone
    }
  });

  revalidatePath('/');
  return { success: true };
}

export async function updateMyPassword(formData: FormData) {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!currentPassword || !newPassword) {
      return { error: "Veuillez remplir tous les champs." };
  }

  // Fetch current hashed password from DB
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !dbUser.password) {
      return { error: "Utilisateur invalide." };
  }

  const isValid = await bcrypt.compare(currentPassword, dbUser.password);
  if (!isValid) {
      return { error: "L'ancien mot de passe est incorrect." };
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash }
  });

  return { success: true, message: "Mot de passe mis à jour avec succès !" };
}
