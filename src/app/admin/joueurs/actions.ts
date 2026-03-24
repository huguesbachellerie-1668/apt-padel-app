'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/auth"

import bcrypt from 'bcryptjs';

export async function createPlayer(formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === 'JOUEUR') throw new Error('Unauthorized');

  const name = formData.get('name') as string;
  const nickname = formData.get('nickname') as string;
  const points = parseFloat(formData.get('points') as string) || 0;
  const sessions = parseInt(formData.get('sessions') as string) || 0;
  let role = formData.get('role') as string || 'JOUEUR';
  const totalMatches = sessions * 3;
  const averagePoints = sessions > 0 ? (points / sessions) : 0;
  const createdAtStr = formData.get('createdAt') as string;

  if (role === 'PRESIDENT' && sessionUser.role !== 'PRESIDENT') {
    role = 'JOUEUR'; 
  }

  const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
  const email = `${cleanName}.${Math.floor(Math.random() * 1000)}@apt.fr`;
  const defaultPasswordHash = await bcrypt.hash('Apt2026!', 10);

  await prisma.user.create({
    data: {
      name,
      nickname,
      points,
      totalMatches,
      averagePoints,
      role,
      email,
      password: defaultPasswordHash,
      createdAt: createdAtStr ? new Date(createdAtStr) : new Date()
    }
  });

  revalidatePath('/admin/joueurs');
  revalidatePath('/directory');
  revalidatePath('/ranking');
}

export async function resetPasswordToDefault(userId: string) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === 'JOUEUR') throw new Error('Unauthorized');

  const defaultPasswordHash = await bcrypt.hash('Apt2026!', 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: defaultPasswordHash }
  });
  
  revalidatePath('/admin/joueurs');
}

export async function updatePlayer(formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role === 'JOUEUR') throw new Error('Unauthorized');

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const nickname = formData.get('nickname') as string;
  const points = parseFloat(formData.get('points') as string) || 0;
  const sessions = parseInt(formData.get('sessions') as string) || 0;
  let role = formData.get('role') as string;
  const totalMatches = sessions * 3;
  const averagePoints = sessions > 0 ? (points / sessions) : 0;
  const createdAtStr = formData.get('createdAt') as string;

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) throw new Error('User not found');

  if (targetUser.role === 'PRESIDENT' && sessionUser.role !== 'PRESIDENT') {
     return; // Non-presidents can't edit presidents at all
  }

  if (role === 'PRESIDENT' && sessionUser.role !== 'PRESIDENT') {
      role = targetUser.role; // Reset to what it was
  }

  const updateData: any = {
    name,
    nickname,
    points,
    totalMatches,
    averagePoints,
    role: role || targetUser.role
  };

  if (createdAtStr) {
     updateData.createdAt = new Date(createdAtStr);
  }

  await prisma.user.update({
    where: { id },
    data: updateData
  });

  revalidatePath('/admin/joueurs');
  revalidatePath('/directory');
  revalidatePath('/ranking');
}
