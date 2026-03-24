import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import DirectoryList from "./DirectoryList";
import { updateContactInfo } from "./actions";

export default async function DirectoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const players = await prisma.user.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <span className="text-4xl">👥</span> Annuaire APT ({players.length} membres)
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Coordonnées de tous les joueurs du club</p>
        </div>
      </div>

      <DirectoryList players={players} user={user} />
    </div>
  );
}
