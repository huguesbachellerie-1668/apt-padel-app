'use server'

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getSessionUser } from "@/lib/auth"

export async function updateContactInfo(formData: FormData) {
  const user = await getSessionUser();
  if (!user) return;

  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone: phone || null,
      email: email || null
    }
  });

  revalidatePath('/directory');
}
