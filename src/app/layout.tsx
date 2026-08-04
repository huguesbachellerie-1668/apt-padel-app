import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import Link from 'next/link';
import { cookies } from 'next/headers';
import prisma from "@/lib/prisma";
import SubmitButton from '@/components/SubmitButton';
import NavButton from '@/components/NavButton';
import NextTopLoader from 'nextjs-toploader';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import { Home, Trophy, CalendarDays, Users, ScrollText, Settings } from 'lucide-react';
import Image from 'next/image';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Atlantic Padel Team",
  description: "Application de gestion Padel pour l'APT",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, sponsors, latestNews] = await Promise.all([
    getSessionUser(),
    prisma.sponsor.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.news.findFirst({ where: { isActive: true }, orderBy: { date: 'desc' }, select: { date: true } })
  ]);
  
  // Check for unread news
  let hasUnreadNews = false;
  if (user && latestNews) {
    if (!user.lastNewsSeenAt || new Date(user.lastNewsSeenAt) < new Date(latestNews.date)) {
      hasUnreadNews = true;
    }
  }

  async function logout() {
    'use server';
    const cookieStore = await cookies();
    cookieStore.delete('apt_user_id');
  }

  return (
    <html lang="fr">
      <body suppressHydrationWarning className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen pb-20`}>
        <NextTopLoader color="#ea580c" showSpinner={false} height={4} />
        {user && (
          <header className="bg-blue-900 text-white shadow-md rounded-b-3xl">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold shadow-sm overflow-hidden p-1 relative">
                    {/* Placeholder for the logo. The user must put their logo.png in the public folder */}
                    <Image src="/logo.png" alt="APT Logo" fill sizes="48px" className="object-contain p-1" priority />
                  </div>
                  <span className="font-black tracking-widest text-lg uppercase hidden sm:block">ATLANTIC PADEL TEAM</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-blue-200 flex items-center gap-1">
                    <span className="hidden sm:inline">Connecté :</span>
                    <strong className="text-white max-w-[100px] sm:max-w-none truncate flex items-center gap-1" title={user.nickname || user.name.split(' ')[0]}>
                      {(user.stars || 0) > 0 && <span className="text-yellow-400">{'⭐'.repeat(user.stars)}</span>}
                      {user.nickname || user.name.split(' ')[0]}
                    </strong>
                    <ProfileSettingsModal user={user} />
                  </span>
                  <form action={logout}>
                    <SubmitButton pendingText="Déconnexion..." className="text-xs bg-blue-800 hover:bg-orange-500 text-white px-3 py-1.5 rounded-full transition-colors font-medium">
                      Déconnexion
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </div>
            {/* Nav Desktop */}
            <nav className="hidden sm:flex justify-around items-center max-w-3xl mx-auto py-3 px-2 text-sm font-medium gap-y-2">
              <NavButton href="/" icon={<Home size={20} />} label="Accueil" />
              <NavButton href="/ranking" icon={<Trophy size={20} />} label="Classement" />
              <NavButton href="/history" icon={<CalendarDays size={20} />} label="Historique" />
              <NavButton href="/directory" icon={<Users size={20} />} label="Annuaire" />
              <NavButton href="/rules" icon={<ScrollText size={20} />} label="APT" hasNotification={hasUnreadNews} />
              {['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role) && (
                <NavButton href="/admin" icon={<Settings size={20} />} label="Admin" className="text-orange-300" />
              )}
            </nav>
          </header>
        )}
        
        {/* Nav Mobile Bottom Bar */}
        {user && (
          <nav className="sm:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50 flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)] text-gray-500">
            <NavButton href="/" icon={<Home size={24} />} label="Accueil" isMobile={true} />
            <NavButton href="/ranking" icon={<Trophy size={24} />} label="Classement" isMobile={true} />
            <NavButton href="/history" icon={<CalendarDays size={24} />} label="Historique" isMobile={true} />
            <NavButton href="/directory" icon={<Users size={24} />} label="Annuaire" isMobile={true} />
            <NavButton href="/rules" icon={<ScrollText size={24} />} label="APT" hasNotification={hasUnreadNews} isMobile={true} />
            {['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role) && (
              <NavButton href="/admin" icon={<Settings size={24} />} label="Admin" isMobile={true} className="text-orange-500" />
            )}
          </nav>
        )}
        
        <main className="max-w-5xl mx-auto mt-6 px-4">
          {children}

          {/* Footer Sponsors */}
          {user && sponsors.length > 0 && (
             <footer className="mt-16 pt-4 pb-8">
               <div className="flex items-center gap-4 mb-6">
                 <div className="flex-1 h-px bg-gray-200"></div>
                 <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Nos Fiers Partenaires</h2>
                 <div className="flex-1 h-px bg-gray-200"></div>
               </div>
               
               <div className="flex flex-wrap justify-center gap-8">
                 {sponsors.map(sp => (
                    <div key={sp.id} className="flex flex-col justify-center items-center hover:scale-105 transition-transform opacity-80 hover:opacity-100">
                       {sp.logoUrl ? (
                         <div className="relative h-8 w-32 mb-1">
                           <Image src={sp.logoUrl} alt={sp.name} fill sizes="128px" className="object-contain" />
                         </div>
                       ) : (
                         <span className="text-2xl mb-1 opacity-50">🤝</span>
                       )}
                       {sp.website ? (
                         <a href={sp.website} target="_blank" className="font-bold text-gray-500 hover:text-blue-600 text-[10px] uppercase">{sp.name}</a>
                       ) : (
                         <span className="font-bold text-gray-400 text-[10px] uppercase">{sp.name}</span>
                       )}
                    </div>
                 ))}
               </div>
             </footer>
          )}
        </main>
      </body>
    </html>
  );
}
