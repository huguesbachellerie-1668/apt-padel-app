'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/auth"

export async function createNews(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') throw new Error("Unauthorized");
  await prisma.news.create({
    data: {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    }
  });
  revalidatePath('/admin/communication');
  revalidatePath('/rules');
}

export async function toggleNews(formData: FormData) {
  const id = formData.get('id') as string;
  const isActive = formData.get('isActive') === 'true';
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') throw new Error("Unauthorized");
  await prisma.news.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath('/admin/communication');
  revalidatePath('/rules');
}

export async function deleteNews(formData: FormData) {
  const id = formData.get('id') as string;
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') throw new Error("Unauthorized");
  await prisma.news.delete({ where: { id } });
  revalidatePath('/admin/communication');
  revalidatePath('/rules');
}

export async function createSponsor(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') throw new Error("Unauthorized");
  await prisma.sponsor.create({
    data: {
      name: formData.get('name') as string,
      website: formData.get('website') as string,
      logoUrl: formData.get('logoUrl') as string,
    }
  });
  revalidatePath('/admin/communication');
  revalidatePath('/rules');
}

export async function toggleSponsor(formData: FormData) {
  const id = formData.get('id') as string;
  const isActive = formData.get('isActive') === 'true';
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') throw new Error("Unauthorized");
  await prisma.sponsor.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath('/admin/communication');
  revalidatePath('/rules');
}

export async function deleteSponsor(formData: FormData) {
  const id = formData.get('id') as string;
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') throw new Error("Unauthorized");
  await prisma.sponsor.delete({ where: { id } });
  revalidatePath('/admin/communication');
  revalidatePath('/rules');
}

export async function createGoodie(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') throw new Error("Unauthorized");
  await prisma.goodie.create({
    data: {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string) || 0,
      imageUrl: formData.get('imageUrl') as string,
    }
  });
  revalidatePath('/admin/communication');
  revalidatePath('/rules');
}

export async function toggleGoodie(formData: FormData) {
  const id = formData.get('id') as string;
  const isActive = formData.get('isActive') === 'true';
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') throw new Error("Unauthorized");
  await prisma.goodie.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath('/admin/communication');
  revalidatePath('/rules');
}

export async function deleteGoodie(formData: FormData) {
  const id = formData.get('id') as string;
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') throw new Error("Unauthorized");
  await prisma.goodie.delete({ where: { id } });
  revalidatePath('/admin/communication');
  revalidatePath('/rules');
}
