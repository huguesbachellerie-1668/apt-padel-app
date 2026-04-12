import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createNews, toggleNews, deleteNews, createSponsor, toggleSponsor, deleteSponsor, createGoodie, toggleGoodie, deleteGoodie } from "./actions";
import SubmitButton from "@/components/SubmitButton";

export default async function CommunicationAdmin() {
  const user = await getSessionUser();
  if (!user || user.role === 'JOUEUR') redirect("/");

  const news = await prisma.news.findMany({ orderBy: { date: 'desc' } });
  const sponsors = await prisma.sponsor.findMany({ orderBy: { name: 'asc' } });
  const goodies = await prisma.goodie.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10 mt-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <a href="/admin" className="text-blue-500 hover:text-blue-700 font-bold text-sm mb-2 inline-block">← Retour Accueil Board</a>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-2"><span className="text-4xl">📢</span> Communication & Club</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* SECTION NEWS */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">📰 Gestion des News</h2>
          <form action={createNews} className="bg-blue-50 p-4 md:p-5 rounded-2xl mb-6 flex flex-col gap-3 border border-blue-100">
            <input type="text" name="title" placeholder="Titre de la news (ex: Inscription Tournoi)" required className="p-3 rounded-xl border border-gray-300 w-full font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <textarea name="content" placeholder="Texte de votre annonce..." required className="p-3 rounded-xl border border-gray-300 w-full h-28 resize-y focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <SubmitButton pendingText="Publication..." className="bg-blue-600 text-white font-bold py-3 mt-1 rounded-xl shadow-sm hover:bg-blue-700 hover:-translate-y-0.5 transition-transform border-b-4 border-blue-800 active:border-b-0 active:mt-[5px]">Publier la News</SubmitButton>
          </form>

          <div className="space-y-4">
             {news.map((item: any) => (
                <div key={item.id} className={`p-5 rounded-2xl border transition-colors ${item.isActive ? 'border-blue-300 bg-white shadow-sm' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                   <div className="flex justify-between items-start mb-3">
                     <div>
                       <h3 className="font-bold text-gray-900">{item.title}</h3>
                       <span className="text-[10px] uppercase font-bold text-gray-400">{new Date(item.date).toLocaleDateString('fr-FR')}</span>
                     </div>
                     <div className="flex items-center gap-2 ml-2">
                       <form action={toggleNews}>
                         <input type="hidden" name="id" value={item.id} />
                         <input type="hidden" name="isActive" value={item.isActive.toString()} />
                         <button type="submit" className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${item.isActive ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}>
                           {item.isActive ? 'Masquer' : 'Afficher'}
                         </button>
                       </form>
                       <form action={deleteNews}>
                         <input type="hidden" name="id" value={item.id} />
                         <button type="submit" className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100" title="Supprimer">🗑️</button>
                       </form>
                     </div>
                   </div>
                   <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.content}</p>
                </div>
             ))}
             {news.length === 0 && <p className="text-sm text-gray-400 italic text-center p-4">La liste des actualités est vide.</p>}
          </div>
        </div>

        <div className="space-y-8">
          {/* SECTION SPONSORS */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🤝 Partenaires & Sponsors</h2>
            <form action={createSponsor} className="bg-orange-50 p-4 md:p-5 rounded-2xl mb-6 flex flex-col gap-3 border border-orange-100">
              <input type="text" name="name" placeholder="Nom du Sponsor" required className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500" />
              <input type="url" name="website" placeholder="Site web (https://... - optionnel)" className="p-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500" />
              <input type="text" name="logoUrl" placeholder="Chemin du logo (ex: /nike.png) ou url d'image." className="p-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500" />
              <SubmitButton pendingText="Ajout..." className="bg-orange-500 text-white font-bold py-3 mt-1 rounded-xl shadow-sm hover:bg-orange-600 hover:-translate-y-0.5 transition-transform border-b-4 border-orange-700 active:border-b-0 active:mt-[5px]">Ajouter le Partenaire</SubmitButton>
            </form>
            
            <div className="space-y-3">
               {sponsors.map((sp: any) => (
                  <div key={sp.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-colors ${sp.isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                     <div>
                       <span className={`font-bold block ${!sp.isActive && 'line-through text-gray-400'}`}>{sp.name}</span>
                       {sp.website && <a href={sp.website} target="_blank" className="text-xs text-blue-500 hover:underline">Visiter le site</a>}
                     </div>
                     <div className="flex gap-2">
                       <form action={toggleSponsor}>
                         <input type="hidden" name="id" value={sp.id} />
                         <input type="hidden" name="isActive" value={sp.isActive.toString()} />
                         <button type="submit" className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-xs font-bold" title="Afficher/Masquer">👀</button>
                       </form>
                       <form action={deleteSponsor}>
                         <input type="hidden" name="id" value={sp.id} />
                         <button type="submit" className="text-red-500 bg-red-50 hover:bg-red-100 p-2 rounded-lg" title="Supprimer">🗑️</button>
                       </form>
                     </div>
                  </div>
               ))}
               {sponsors.length === 0 && <p className="text-sm text-gray-400 italic text-center p-4">Aucun partenaire enregistré.</p>}
            </div>
          </div>

          {/* SECTION GOODIES */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">👕 Boutique (Goodies)</h2>
            <form action={createGoodie} className="bg-green-50 p-4 md:p-5 rounded-2xl mb-6 flex flex-col gap-3 border border-green-100">
              <input type="text" name="name" placeholder="Nom du Goodie (ex: T-Shirt APT)" required className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500" />
              <div className="flex gap-3">
                 <input type="number" step="0.5" name="price" placeholder="Prix (€)" required className="p-3 rounded-xl border border-gray-300 w-1/3 focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500" />
                 <input type="text" name="description" placeholder="Description courte" className="p-3 rounded-xl border border-gray-300 w-2/3 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500" />
              </div>
              <input type="text" name="imageUrl" placeholder="Chemin de l'image (ex: /tshirt.png) ou url web" className="p-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-500" />
              <SubmitButton pendingText="Ajout..." className="bg-green-600 text-white font-bold py-3 mt-1 rounded-xl shadow-sm hover:bg-green-700 hover:-translate-y-0.5 transition-transform border-b-4 border-green-800 active:border-b-0 active:mt-[5px]">Mettre en Vitrine</SubmitButton>
            </form>
            
            <div className="space-y-3">
               {goodies.map((gd: any) => (
                  <div key={gd.id} className={`flex justify-between items-center p-4 rounded-2xl border transition-colors ${gd.isActive ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                     <div>
                       <span className={`font-bold ${!gd.isActive && 'line-through text-gray-400'}`}>{gd.name}</span>
                       <span className={`ml-2 font-black px-2 py-0.5 rounded text-xs ${gd.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{gd.price}€</span>
                       {gd.description && <p className="text-xs text-gray-500 mt-1">{gd.description}</p>}
                     </div>
                     <div className="flex gap-2">
                       <form action={toggleGoodie}>
                         <input type="hidden" name="id" value={gd.id} />
                         <input type="hidden" name="isActive" value={gd.isActive.toString()} />
                         <button type="submit" className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-xs font-bold" title="Afficher/Masquer">👀</button>
                       </form>
                       <form action={deleteGoodie}>
                         <input type="hidden" name="id" value={gd.id} />
                         <button type="submit" className="text-red-500 bg-red-50 hover:bg-red-100 p-2 rounded-lg" title="Supprimer">🗑️</button>
                       </form>
                     </div>
                  </div>
               ))}
               {goodies.length === 0 && <p className="text-sm text-gray-400 italic text-center p-4">La liste des goodies est vide.</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
