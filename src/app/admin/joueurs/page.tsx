import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createPlayer } from "./actions";
import AdminPlayerList from "./AdminPlayerList";
import BackButton from "@/components/BackButton";
import SubmitButton from "@/components/SubmitButton";

export default async function AdminPlayersPage() {
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') redirect("/");

  const playersQuery = await prisma.user.findMany();
  const players = playersQuery.sort((a, b) => 
    (a.nickname || a.name).toLowerCase().localeCompare((b.nickname || b.name).toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col gap-2 mb-6">
        <BackButton fallback="/admin" />
        <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3 mt-4">
          <span className="text-4xl">👥</span> Gestion des Joueurs ({players.length} membres)
        </h1>
      </div>

      {/* CREATE FORM */}
      <div className="bg-gradient-to-br from-green-50 to-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-green-200">
        <h2 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
          <span>➕</span> Inscrire un nouveau joueur
        </h2>
        <form action={createPlayer} className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-xl shadow-inner border border-green-100">
          <div className="flex-1 min-w-[150px]">
             <label className="text-xs font-bold text-gray-600 block mb-1">Prénom & Nom</label>
             <input name="name" type="text" required className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 font-bold text-gray-800 focus:outline-none" />
          </div>
          <div className="w-32 min-w-[100px]">
             <label className="text-xs font-bold text-gray-600 block mb-1">Surnom</label>
             <input name="nickname" type="text" className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none" />
          </div>
          <div className="flex-1 min-w-[150px]">
             <label className="text-xs font-bold text-gray-600 block mb-1">Email <span className="text-gray-400 font-normal">(Optionnel)</span></label>
             <input name="email" type="email" placeholder="Généré par défaut" className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-sm" />
          </div>
          <div className="w-32 min-w-[120px]">
             <label className="text-xs font-bold text-gray-600 block mb-1">Téléphone</label>
             <input name="phone" type="tel" className="w-full p-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none text-sm" />
          </div>
          <div className="w-28">
             <label className="text-xs font-bold text-gray-600 block mb-1">Rôle</label>
             <select name="role" className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:outline-none bg-white">
                <option value="JOUEUR">Joueur</option>
                <option value="ORGA">Vice-Président</option>
                <option value="TRESORIER">Trésorier</option>
                {user.role === 'PRESIDENT' && <option value="PRESIDENT">Président</option>}
             </select>
          </div>
          <div className="w-24">
             <label className="text-xs font-bold text-gray-600 block mb-1">Points</label>
             <input name="points" type="number" step="0.01" defaultValue="0" className="w-full p-2.5 border-2 border-gray-200 rounded-lg font-black text-center text-orange-600 focus:outline-none" />
          </div>
          <div className="w-20">
             <label className="text-xs font-bold text-gray-600 block mb-1">Sessions</label>
             <input name="sessions" type="number" defaultValue="0" className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-center font-bold focus:outline-none" />
          </div>
          <div className="w-32">
             <label className="text-xs font-bold text-gray-600 block mb-1">Date d'inscription</label>
             <input name="createdAt" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 border-2 border-gray-200 rounded-lg text-sm text-gray-700 bg-white font-bold focus:outline-none" />
          </div>
          <SubmitButton pendingText="Création..." className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md transition-transform hover:scale-105 h-[46px] flex items-center">
            Créer
          </SubmitButton>
        </form>
      </div>

      <AdminPlayerList players={players} user={user} />
    </div>
  );
}
