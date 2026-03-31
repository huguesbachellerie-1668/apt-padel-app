'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createClub(formData: FormData) {
  const name = formData.get('name') as string;
  const city = formData.get('city') as string;
  const address = formData.get('address') as string;

  if (!name) return;

  await prisma.club.create({
    data: {
      name,
      city,
      address
    }
  });

  revalidatePath('/admin/clubs');
}

export async function updateClub(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const city = formData.get('city') as string;
  const address = formData.get('address') as string;

  if (!id || !name) return;

  await prisma.club.update({
    where: { id },
    data: { name, city, address }
  });

  revalidatePath('/admin/clubs');
}

export async function deleteClub(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  // Verify if it is used in existing reservations
  const count = await prisma.courtReservation.count({
    where: { clubId: id }
  });

  if (count > 0) {
    throw new Error('Impossible de supprimer ce club car il est lié à des réservations existantes.');
  }

  await prisma.club.delete({
    where: { id }
  });

  revalidatePath('/admin/clubs');
}
