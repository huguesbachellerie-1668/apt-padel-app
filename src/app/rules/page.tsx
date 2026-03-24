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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-black text-blue-900 flex items-center gap-3">
            <span className="text-4xl">📜</span> Règlement APT
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Les règles officielles de l'Atlantic Padel Team</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border border-blue-100 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center">
         <div className="text-center md:text-left">
            <h2 className="font-black text-blue-900 text-lg mb-1">Le Club</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Créé le : <strong>1er septembre 2018</strong><br />
              Membres actuels : <strong>{totalPlayers} joueurs</strong>
            </p>
         </div>
         <div className="flex-1 w-full bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 text-center md:text-left">Le Board Administratif</h3>
            <div className="flex flex-col md:flex-row flex-wrap gap-4 justify-center md:justify-start">
              {boardMembers.map((member: any) => (
                 <div key={member.id} className="flex items-center gap-2 bg-gray-50 pr-3 rounded-full border border-gray-100">
                   <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${member.role === 'PRESIDENT' ? 'bg-orange-500 text-white shadow-sm' : 'bg-blue-100 text-blue-800'}`}>
                     {member.role === 'ORGA' ? 'Vice-Président' : member.role}
                   </span>
                   <span className="font-bold text-gray-800 text-sm whitespace-nowrap">{member.name}</span>
                 </div>
              ))}
            </div>
         </div>
      </div>

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 p-8">
        <div className="prose prose-blue max-w-none text-gray-700">
          <ol className="list-decimal pl-5 space-y-4">
            <li>L'APT (Atlantic Padel Team) est constitué d'1 board et de joueurs qui acceptent le règlement suivant.</li>
            <li>Le board de l'APT est constitué de 3 personnes : 1 président fondateur = Bacho, 1 vice-président qui gère l'organisation = Benoît, 1 trésorier qui gère les réservations et inscriptions = Paco.</li>
            <li>Le but du jeu est de prendre du plaisir à jouer au Padel avec des adversaires de niveaux équivalents.</li>
            <li>Tout geste déplacé, insulte, ou mauvais comportement sera sanctionné d'un <strong className="text-yellow-600">carton jaune</strong>.</li>
            <li>Deux cartons jaunes entraînent un <strong className="text-red-600">carton rouge</strong>, synonyme d'exclusion d'un mois de l'APT.</li>
            <li>Deux cartons rouges entraîneront une exclusion définitive.</li>
            <li>Les cartons jaunes ou rouges sont remis à 0 à la fin de la saison.</li>
            <li>Les matchs se déroulent de Septembre à fin juin de l'année suivante (il peut y avoir quelques jours de dépassement du calendrier après validation du board).</li>
            <li>Les matchs se jouent lors d’une session hebdomadaire maximum. Une session équivaut à une journée de rencontre entre les joueurs inscrits.</li>
            <li>Lors d'une session, un terrain est attribué à 4 joueurs, regroupés dans une poule.</li>
            <li>Les poules sont constituées de 4 joueurs de niveaux de points équivalents. Chaque joueur participe à 3 matchs de 25 minutes, à chaque match, il fait équipe avec un joueur différent de sa poule.</li>
            <li>Une fois les 25 minutes passées, les joueurs finissent le jeu avant de passer au match suivant.</li>
            <li><strong>Point en or :</strong> lorsque les 25 minutes sont écoulées, la regle de l'avantage est supprimée sur le jeu en cours : en cas d'égalité 40A, la 1ere equipe qui gagne le point remporte le jeu.</li>
            <li>Chaque joueur a un nombre de points calculé à la fin de chaque session. Les poules sont établies en fonction des points de chaque joueur.</li>
            <li><strong>Système de points :</strong> une victoire = 30 points, un match nul = 20 points, une défaite = 10 points. À ce total, on rajoute le nombre de jeux marqués par le joueur, puis on fait la moyenne sur les 3 matchs.</li>
            <li>L'équipe qui remporte le 1er set remporte le match. Si le set n’est pas terminé avant la fin des 25 minutes, l'équipe qui a le plus de jeux remporte le match, et en cas d'égalité c'est un match nul.</li>
            <li>En début de saison, les scores de l'année précédente sont conservés pendant 3 sessions pour consolider la moyenne. A la 4eme session du joueur, les scores de l'année précédente sont retirés.</li>
            <li>En fin de saison, apparaîtront dans le classement final uniquement les joueurs qui ont participé à au moins 10 sessions dans la saison.</li>
            <li><strong>Composition des matchs :</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Match 1 : le 1er et le 4eme contre le 2eme et le 3eme.</li>
                <li>Match 2 : le 1er et le 3eme contre le 2eme et le 4eme.</li>
                <li>Match 3 : le 1er et le 2eme contre le 3eme et le 4eme.</li>
              </ul>
            </li>
            <li>S'il y a 5 poules, un joueur ne pourra pas monter ou descendre de plus de 2 poules. S'il y a 6 poules ou plus, pas plus de 3 poules. S'il y a 10 poules ou plus, pas plus de 4 poules.</li>
            <li><strong>Priorités d'inscription :</strong> priorité aux joueurs de la dernière session, puis aux joueurs inscrits à l'APT, puis les nouveaux arrivants 48 heures avant la date (vendredi soir 20h max).</li>
            <li>Suite à un retour de blessure un joueur peut demander à jouer dans la poule inférieure pour la première session de son retour.</li>
            <li>Si un joueur veut s'inscrire à l'avance, il informe le board et entrera dans les inscriptions selon l'ordre etabli.</li>
            <li>En cas d'annulation après vendredi 20h00, il se verra attribuer un carton jaune (sauf s'il trouve un remplaçant).</li>
            <li>Si par manque de joueurs, il faut annuler un terrain, les derniers inscrits seront dé-sélectionnés de la session.</li>
            <li>Si il n'y a pas assez de terrains, un joueur peut se désister et annuler un de ses cartons jaunes déjà reçus.</li>
            <li>Si un joueur a plus d'1/4 d'heure de retard a son match sans raison = carton jaune.</li>
            <li>Si un joueur annule au dernier moment (à 1/4 d'heure du match) = carton jaune + <strong className="text-red-500">3 défaites (=30 points)</strong> comptabilisées.</li>
            <li>Si la balle fait un coin, si elle remonte, elle est bonne. Si elle descend, la balle est faute. Si vraiment litige, à remettre.</li>
            <li>Si blessure d'un joueur pendant son match : le match est considéré comme perdu pour les 2 joueurs de l'équipe du blessé (marque 10 points + les jeux marqués). L'équipe adverse marque 30 points + 6 jeux. Les matchs suivants sont annulés.</li>
            <li>Dans chaque poule, <strong>le joueur le mieux classé</strong> doit transmettre au board les scores des 3 matchs.</li>
            <li>Tous les cas non traités pourront être rajoutés et mis à jour par le Président.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
