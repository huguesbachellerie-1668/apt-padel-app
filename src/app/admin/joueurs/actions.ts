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
  const emailInput = formData.get('email') as string;
  const phone = formData.get('phone') as string;

  if (role === 'PRESIDENT' && sessionUser.role !== 'PRESIDENT') {
    role = 'JOUEUR'; 
  }

  const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
  const email = emailInput || `${cleanName}.${Math.floor(Math.random() * 1000)}@apt.fr`;
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
      phone,
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
  const hist2324Str = formData.get('hist2324') as string;
  const hist2425Str = formData.get('hist2425') as string;
  const yellowCards = parseInt(formData.get('yellowCards') as string) || 0;
  const redCards = parseInt(formData.get('redCards') as string) || 0;
  const emailInput = formData.get('email') as string;
  const phoneInput = formData.get('phone') as string;

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
    yellowCards,
    redCards,
    role: role || targetUser.role
  };
  
  if (emailInput) updateData.email = emailInput;
  if (phoneInput !== null) updateData.phone = phoneInput;

  const currentHistoricalStats = typeof (targetUser as any).historicalStats === 'object' && (targetUser as any).historicalStats !== null ? (targetUser as any).historicalStats : {};
  let newHistoricalStats: any = { ...currentHistoricalStats };
  if (hist2324Str && hist2324Str.trim() !== '') newHistoricalStats['2023-2024'] = parseFloat(hist2324Str.trim());
  if (hist2425Str && hist2425Str.trim() !== '') newHistoricalStats['2024-2025'] = parseFloat(hist2425Str.trim());
  if (Object.keys(newHistoricalStats).length > 0) {
      updateData.historicalStats = newHistoricalStats;
  }

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
