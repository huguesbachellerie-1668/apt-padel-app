import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import Link from 'next/link';
import { cookies } from 'next/headers';
import SubmitButton from '@/components/SubmitButton';

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
  const user = await getSessionUser();

  async function logout() {
    'use server';
    const cookieStore = await cookies();
    cookieStore.delete('apt_user_id');
  }

  return (
    <html lang="fr">
      <body suppressHydrationWarning className={`${inter.className} bg-gray-50 text-gray-900 min-h-screen pb-20`}>
        {user && (
          <header className="bg-blue-900 text-white shadow-md rounded-b-3xl">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold shadow-sm overflow-hidden p-1">
                    {/* Placeholder for the logo. The user must put their logo.png in the public folder */}
                    <img src="/logo.png" alt="APT Logo" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-black tracking-widest text-lg uppercase hidden sm:block">ATLANTIC PADEL TEAM</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-blue-200 hidden sm:block">
                    Connecté : <strong className="text-white">{user.nickname || user.name.split(' ')[0]}</strong>
                  </span>
                  <form action={logout}>
                    <SubmitButton pendingText="Déconnexion..." className="text-xs bg-blue-800 hover:bg-orange-500 text-white px-3 py-1.5 rounded-full transition-colors font-medium">
                      Déconnexion
                    </SubmitButton>
                  </form>
                </div>
              </div>
            </div>
            {/* Nav */}
            <nav className="flex flex-wrap justify-around items-center max-w-3xl mx-auto py-3 px-2 text-sm font-medium gap-y-2">
              <Link href="/" className="px-3 py-2 hover:bg-white/10 rounded-full transition-colors flex flex-col items-center gap-1">
                <span>🏠</span><span className="text-xs">Accueil</span>
              </Link>
              <Link href="/ranking" className="px-3 py-2 hover:bg-white/10 rounded-full transition-colors flex flex-col items-center gap-1">
                <span>🏆</span><span className="text-xs">Classement</span>
              </Link>
              <Link href="/history" className="px-3 py-2 hover:bg-white/10 rounded-full transition-colors flex flex-col items-center gap-1">
                <span>📅</span><span className="text-xs">Historique</span>
              </Link>
              <Link href="/directory" className="px-3 py-2 hover:bg-white/10 rounded-full transition-colors flex flex-col items-center gap-1">
                <span>👥</span><span className="text-xs">Annuaire</span>
              </Link>
              <Link href="/rules" className="px-3 py-2 hover:bg-white/10 rounded-full transition-colors flex flex-col items-center gap-1">
                <span>📜</span><span className="text-xs">Règlement</span>
              </Link>
              {['PRESIDENT', 'ORGA', 'TRESORIER'].includes(user.role) && (
                <Link href="/admin" className="px-3 py-2 hover:bg-white/10 rounded-full transition-colors flex flex-col items-center gap-1 text-orange-300">
                  <span>⚙️</span><span className="text-xs">Admin</span>
                </Link>
              )}
            </nav>
          </header>
        )}
        
        <main className="max-w-5xl mx-auto mt-6 px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
