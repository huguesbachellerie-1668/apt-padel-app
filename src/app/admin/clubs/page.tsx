import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminClubList from "./AdminClubList";
import SubmitButton from "@/components/SubmitButton";
import { createClub } from "./actions";

export default async function AdminClubsPage() {
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') redirect("/");

  const clubs = await prisma.club.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-2 mb-6">
        <a href="/admin" className="text-blue-500 font-bold hover:underline inline-block">← Retour à l'administration</a>
        <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3 mt-4">
          <span className="text-4xl">🏟️</span> Gestion des Clubs ({clubs.length})
        </h1>
        <p className="text-gray-500 font-medium font-sm mt-1">Gérez le dictionnaire des lieux de réservation récurrents.</p>
      </div>

      {/* CREATE FORM */}
      <div className="bg-gradient-to-br from-indigo-50 to-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-indigo-200">
        <h2 className="text-xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
          <span>➕</span> Ajouter un nouveau club
        </h2>
        
        <form action={createClub} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full flex flex-col gap-2">
            <label className="text-sm font-bold text-indigo-900">Nom du Club</label>
            <input type="text" name="name" required placeholder="Ex: BIG PADEL" className="w-full text-lg font-black text-gray-800 placeholder:font-normal p-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
          </div>
          <div className="flex-1 w-full flex flex-col gap-2">
            <label className="text-sm font-bold text-indigo-900">Ville (Code Postal)</label>
            <input type="text" name="city" required placeholder="Ex: Mérignac (33700)" className="w-full p-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
          </div>
          <div className="flex-[1.5] w-full flex flex-col gap-2">
            <label className="text-sm font-bold text-indigo-900">Adresse complète</label>
            <input type="text" name="address" required placeholder="Ex: Décathlon Village, 5 Rue Hipparque" className="w-full p-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
          </div>
          
          <SubmitButton pendingText="Ajout..." className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all h-[52px] w-full md:w-auto">
            Ajouter
          </SubmitButton>
        </form>
      </div>

      {/* LIST OF CLUBS */}
      <AdminClubList clubs={clubs} />

    </div>
  );
}
