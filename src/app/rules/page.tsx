import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function RulesPage() {
  const user = await getSessionUser();

  const totalPlayers = await prisma.user.count();
  const rawBoardMembers = await prisma.user.findMany({
    where: { role: { in: ['PRESIDENT', 'ORGA', 'TRESORIER'] } }
  });

  const roleOrder: Record<string, number> = { 'PRESIDENT': 1, 'ORGA': 2, 'TRESORIER': 3 };
  const boardMembers = rawBoardMembers.sort((a: any, b: any) => roleOrder[a.role] - roleOrder[b.role]);

  const news = await prisma.news.findMany({ where: { isActive: true }, orderBy: { date: 'desc' } });
  const sponsors = await prisma.sponsor.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  const goodies = await prisma.goodie.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <span className="text-4xl">👋</span> Vie du Club & Règlement
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Toutes les informations, actus et règles de l'Atlantic Padel Team</p>
        </div>
      </div>

      {news.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-blue-900 px-2 flex items-center gap-2">📢 Annonces de la direction</h2>
          <div className="grid grid-cols-1 gap-5">
             {news.map((item: any) => (
                <div key={item.id} className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 md:p-8 rounded-3xl shadow-md border-l-8 border-orange-500 relative overflow-hidden">
                   <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                   <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                     <h3 className="text-2xl font-black">{item.title}</h3>
                     <span className="text-xs bg-white/20 px-3 py-1.5 rounded-xl font-bold uppercase backdrop-blur-sm self-start md:self-auto">{new Date(item.date).toLocaleDateString('fr-FR')}</span>
                   </div>
                   <p className="text-blue-50 leading-relaxed whitespace-pre-wrap relative z-10 text-md">{item.content}</p>
                </div>
             ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-6 md:p-8 border border-blue-100 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center">
         <div className="text-center md:text-left min-w-[150px]">
            <h2 className="font-black text-blue-900 text-lg mb-1">Le Club</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Créé le : <strong>1er Sept. 2018</strong><br />
              Communauté : <strong>{totalPlayers} joueurs</strong>
            </p>
         </div>
         <div className="flex-1 w-full bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 text-center md:text-left">Le Board Administratif</h3>
            <div className="flex flex-col md:flex-row flex-wrap gap-4 justify-center md:justify-start">
              {boardMembers.map((member: any) => (
                 <div key={member.id} className="flex items-center gap-2 bg-gray-50 pr-4 rounded-full border border-gray-100">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${member.role === 'PRESIDENT' ? 'bg-orange-500 text-white shadow-sm' : 'bg-blue-100 text-blue-800'}`}>
                     {member.role === 'ORGA' ? 'Vice-Président' : member.role}
                   </span>
                   <span className="font-bold text-gray-800 text-sm whitespace-nowrap">{member.name}</span>
                 </div>
              ))}
            </div>
         </div>
      </div>

      {goodies.length > 0 && (
         <div className="space-y-4 pt-4">
           <h2 className="text-xl font-black text-blue-900 px-2 flex items-center gap-2">👕 La Boutique APT</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
             {goodies.map((gd: any) => (
                <div key={gd.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                   <div>
                     <div className="w-14 h-14 bg-green-50 border-4 border-green-100 text-green-700 rounded-full flex items-center justify-center font-black text-lg mb-5">
                       {gd.price}€
                     </div>
                     <h3 className="font-black text-gray-900 text-lg leading-tight mb-2">{gd.name}</h3>
                     {gd.description && <p className="text-sm text-gray-500">{gd.description}</p>}
                   </div>
                   <div className="mt-6 pt-5 border-t border-gray-50">
                     <p className="text-[11px] font-bold text-center text-orange-500 uppercase">Pour commander : Voir avec le Board</p>
                   </div>
                </div>
             ))}
           </div>
         </div>
      )}

      {/* Règlement Section */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-black text-blue-900 px-2 flex items-center gap-2">📜 Règlement Officiel</h2>
        <div className="bg-white shadow-sm rounded-3xl overflow-hidden border border-gray-100 p-6 md:p-8">
          <div className="prose prose-blue max-w-none text-gray-700 text-sm md:text-base">
            <ol className="list-decimal pl-5 space-y-4 marker:font-bold marker:text-blue-500">
              <li>L'APT (Atlantic Padel Team) est constitué d'un board et de joueurs qui acceptent le présent règlement.</li>
              <li>Le board de l'APT est constitué de 3 personnes : 1 président fondateur (Bacho), 1 vice-président à l'organisation (Benoît), et 1 trésorier aux réservations (Paco).</li>
              <li>Le but premier du club est de prendre du plaisir à jouer au Padel avec des adversaires de niveaux équivalents.</li>
              <li><strong className="text-yellow-600">Cartons jaunes :</strong> Tout geste déplacé, insulte, retard ou mauvais comportement sera sanctionné d'un carton jaune. Si annulation après le vendredi 20h = Carton jaune. Si retard +15min sans raison = Carton jaune. Annulation dernière minute = Carton jaune + 3 défaites pénales (30 points comptabilisés).</li>
              <li><strong className="text-red-600">Cartons rouges :</strong> Deux cartons jaunes entraînent un carton rouge, synonyme d'exclusion d'un mois de l'APT. Deux cartons rouges entraînent une exclusion définitive du club. (Remise à zéro en fin de saison). En cas de manque de place sur une session, un volontaire peut se désister et annuler un de ses cartons jaunes reçus.</li>
              <li>La saison s'étend de Septembre à fin Juin (avec flexibilité accordée par le board). Lors de la session hebdomadaire, 4 joueurs de force équivalente sont assignés par terrain.</li>
              <li>Format de jeu : 3 matchs de 25 minutes contre chaque binôme possible de la poule. Dès 25 min écoulées, suppression de l'avantage : <strong>Point en Or</strong> décisif (No-Ad). L'équipe en tête à la fin du chrono remporte le match.</li>
              <li>Une victoire rapporte <strong>30 points</strong>, un nul <strong>20 points</strong>, une défaite <strong>10 points</strong>. Le nombre de jeux marqués est ajouté au score, puis divisé par 3 pour obtenir la moyenne de points de la session.</li>
              <li>Calcul de la Moyenne Historique : En début de saison, les résultats de la saison passée comptent jusqu'à la 4ème nouvelle session jouée. Pour le classement de fin d'année, participation minimum de 10 sessions requise.</li>
              <li>Si 5 poules disponibles, la montée/descente Max d'un joueur est limitée à 2 poules d'écart. Si &gt;6 poules, 3 poules max. Si &gt;10 poules, 4 poules max.</li>
              <li><strong>Sélection :</strong> La priorité d'inscription se fait d'abord sur la continuité (présence dimanche dernier), puis pour les habitués, puis pour les petits nouveaux.</li>
              <li>Un joueur déclarant un retour de blessure est exceptionnellement rétrogradé d'une poule de facilité pour sa reprise.</li>
              <li>Arbitrage : Balle remontante sur le coin = Bonne. Balle descendante = Faute (litige = on remet). Si blessure en cours de jeu = Abandon (10 pts + jeux) et victoire (30 pts + 6 jeux) pour l'adversaire.</li>
              <li>Résultats : Le meilleur au classement de sa poule est responsable de la transmission ou de la saisie des scores.</li>
              <li>Tout cas non traité dans ces lignes pourra être jugé et mis à jour souverainement par le Président.</li>
            </ol>
          </div>
        </div>
      </div>

      {sponsors.length > 0 && (
         <div className="space-y-5 pt-8 mb-6">
           <div className="flex items-center gap-4">
             <div className="flex-1 h-px bg-gray-200"></div>
             <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Nos Fiers Partenaires</h2>
             <div className="flex-1 h-px bg-gray-200"></div>
           </div>
           
           <div className="flex flex-wrap justify-center gap-4">
             {sponsors.map((sp: any) => (
                <div key={sp.id} className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center hover:scale-105 transition-transform">
                   {sp.logoUrl ? (
                     <img src={sp.logoUrl} alt={sp.name} className="h-10 w-auto object-contain drop-shadow-sm mb-2" />
                   ) : (
                     <span className="text-2xl mb-1 mt-1">🤝</span>
                   )}
                   {sp.website ? (
                     <a href={sp.website} target="_blank" className="font-bold text-gray-800 hover:text-blue-600 text-sm">{sp.name}</a>
                   ) : (
                     <span className="font-bold text-gray-800 text-sm">{sp.name}</span>
                   )}
                </div>
             ))}
           </div>
         </div>
      )}
    </div>
  );
}
