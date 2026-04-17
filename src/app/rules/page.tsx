import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function RulesPage() {
  const user = await getSessionUser();

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastNewsSeenAt: new Date() }
    });
  }

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
            <span className="text-4xl">👋</span> Vie de l'APT & Règlement
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
            <h2 className="font-black text-blue-900 text-lg mb-1">L'APT</h2>
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
                     <div className="flex justify-between items-start mb-5">
                       <div className="w-14 h-14 bg-green-50 border-4 border-green-100 text-green-700 rounded-full flex items-center justify-center font-black text-lg shrink-0">
                         {gd.price}€
                       </div>
                       {gd.imageUrl && (
                         <img src={gd.imageUrl} alt={gd.name} className="h-20 w-20 object-contain drop-shadow-sm ml-4" />
                       )}
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
              <li>L’APT (Atlantic Padel Team) est constitué d’1 board et de joueurs qui acceptent le règlement suivant.</li>
              <li>Le board de l’APT est constitué de 3 personnes : 1 président fondateur = Bacho, 1 vice-président qui gère l’organisation de l’APT = Benoît, 1 trésorier qui gère les réservations et inscriptions aux sessions = Paco.</li>
              <li>Le but du jeu est de prendre du plaisir à jouer au Padel avec des adversaires de niveaux équivalent.</li>
              <li><strong className="text-yellow-600">Cartons jaunes :</strong> Tout gestes déplacés, insultes, mauvais comportement sera sanctionné d’un carton jaune.</li>
              <li>Deux cartons jaunes entraîne un <strong className="text-red-600">carton rouge</strong>, synonyme d’exclusion d’un mois de l’APT.</li>
              <li>Deux cartons rouges entraînera une exclusion définitive</li>
              <li>Les cartons jaunes ou rouges sont remis à 0 a la fin de la saison</li>
              <li>Les matchs se déroulent de Septembre à fin juin de l’année suivante (il peut y avoir quelques jours de dépassement du calendrier après validation du board).</li>
              <li>Les matchs se jouent lors d’une session hebdomadaire maximum. Une session équivaut à une journée de rencontre entre les joueurs inscrits.</li>
              <li>Lors d’une session, un terrain est attribué à 4 joueurs, regroupés dans une poule.</li>
              <li>Les poules sont constituées de 4 joueurs de niveaux de points équivalents. Lors de la session, chaque joueur participe à 3 matchs de 25 minutes, à chaque match, il fait équipe avec un joueur différent de sa poule.</li>
              <li>Une fois les 25 minutes passées, les joueurs finissent le jeu avant de passer au match suivant. S’il reste moins d’1 minute de jeu, les joueurs ont libre appréciation de jouer ou pas le dernier jeu.</li>
              <li><strong>Point en or :</strong> lorsque les 25 minutes sont écoulées, la regle de l’avantage est supprimée sur le jeu en cours : en cas d’égalité 40A, la 1ere equipe qui gagne le point remporte le jeu.</li>
              <li>Chaque joueur a un nombre de points calculé à la fin de chaque session. Les poules sont établies en fonction des points de chaque joueur.</li>
              <li>Le système de points est défini comme suit : une victoire = <strong>30 points</strong>, un match nul = <strong>20 points</strong>, une défaite = <strong>10 points</strong>. À ce total, on rajoute le nombre de jeux marqués par le joueur au cours de ses matchs.</li>
              <li>L’équipe qui remporte le 1er set remporte le match, quelque soient les résultats suivants. Si le set n’est pas terminé avant la fin des 25 minutes, l’équipe qui a le plus de jeux remporte le match, et en cas d’égalité c’est un match nul.</li>
              <li>En début de saison, les scores de l'année précédente sont conservés pendant 3 sessions pour consolider la moyenne des points de chaque joueur. A la 4eme session du joueur, les scores de l’année précédente sont retirés de la moyenne de points du joueur pour ne conserver que les sessions de la saison en cours.</li>
              <li>En fin de saison, apparaîtront dans le classement final uniquement les joueurs qui ont participé à au moins 10 sessions dans la saison.</li>
              <li>Lors de chaque session, les équipes sont constituées ainsi : le 1er et le 4eme de la poule contre le 2eme et le 3eme. Deuxième match le 1er et le 3eme de la poule contre le 2eme et le 4eme. Dernier match : le 1er et le 2eme contre le 3eme et le 4eme. A l’issue de ce troisième match, on compte les points.</li>
              <li><strong>Plafonnement des variations :</strong> La montée ou descente d'un joueur d'une session à l'autre est plafonnée à 3 poules (à la hausse ou à la baisse) selon le niveau calculé lors de sa dernière participation.</li>
              <li>Lors des inscriptions à la prochaine session, priorité est donnée aux joueurs qui viennent d’effectuer la dernière session, puis aux joueurs inscrits à l’APT, puis inscriptions des nouveaux arrivants 48 heures avant la date de la session (vendredi soir 20h max quand la session est le dimanche soir). Exception pour la 1ère session de la saison, l’ordre de priorité est déterminé par le nombre de présence des joueurs aux sessions de l’année précédente.</li>
              <li>Suite à un retour de blessure un joueur peut demander à jouer dans la poule inférieure pour la première session de son retour,</li>
              <li>Si un joueur veut s’inscrire à l’avance, il informe le board (sur l’appli ou le whatsapp) et entrera dans les inscriptions selon l’ordre etabli au paragraphe précédent.</li>
              <li>En cas d’annulation d’un joueur après vendredi 20h00, quelque soit la raison, il se verra attribuer un carton jaune sauf si il trouve un remplaçant.</li>
              <li>Si par manque de joueurs, il faut annuler un terrain, les derniers inscrits seront dé-sélectionnés de la session.</li>
              <li>Si il n’y a pas assez de terrains par rapport au nombre de joueurs inscrits, un joueur peut se désister et annuler un de ses cartons jaunes déjà reçus.</li>
              <li>Si un joueur a plus d’1/4 d’heure de retard a son match (sans raison valable) = carton jaune.</li>
              <li>Si un joueur annule au dernier moment (à 1/4 d’heure du début de son match) =&gt; carton jaune + 3 défaites (=30 points) comptabilisés pour le classement APT.</li>
              <li>Si la balle fait un coin, si elle remonte, elle est bonne. Si elle descend, la balle est faute. Si vraiment litige, à remettre.</li>
              <li>Si blessure d’un joueur pendant son match : le match est considéré comme perdu pour les 2 joueurs de l’équipe du blessé. Elle marque 10 points + les jeux marqués, et l’équipe adverse marque 30 points + 6 jeux. Les matchs suivants sont annulés et la moyenne de points est ajustée en conséquence.</li>
              <li>Dans chaque poule, le joueur le mieux classé doit transmettre au board les scores des 3 matchs, et est garant des résultats.</li>
              <li>Tous les cas non traités ou points de règlements manquants pourront être rajoutés et mis à jour par le Président avec ou sans concertation.</li>
              <li>L’application web de l’APT est : <a href="https://apt-padel-app.vercel.app" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">https://apt-padel-app.vercel.app</a></li>
              <li>Le Mot de passe par défaut de l’application : <strong>Apt2026!</strong></li>
              <li>En cas d’oubli de votre mdp, contactez le bureau pour réinitialiser le mdp.</li>
              <li>Une bière est offerte à chaque joueur APT par session, par le club Big Padel, lorsque l'on réserve plus de 4 terrains. Si un joueur ne prends pas sa bière, il doit la donner à Bacho, Benoit ou Paco. Sinon carton jaune 😉</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
