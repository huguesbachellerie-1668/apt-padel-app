import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function LoginPage({ searchParams }: { searchParams: any }) {
  const sp = await searchParams;
  const error = sp.error;

  async function login(formData: FormData) {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      redirect('/login?error=missing');
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email.toLowerCase() } }
    });

    if (!user || !user.password) {
      redirect('/login?error=invalid');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      redirect('/login?error=invalid');
    }

    const cookieStore = await cookies();
    cookieStore.set('apt_user_id', user.id, { httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/' });
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-xl border-t-8 border-orange-500">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-blue-900 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-inner">
            APT
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-blue-900 mb-2">Atlantic Padel Team</h1>
        <p className="text-center text-gray-500 text-xs mb-8">Connectez-vous pour accéder à votre espace joueur</p>
        
        {error === 'invalid' && (
          <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-xl mb-6 text-center border border-red-200">
            Email ou mot de passe incorrect.
          </div>
        )}
        {error === 'missing' && (
          <div className="bg-orange-50 text-orange-600 text-sm font-bold p-3 rounded-xl mb-6 text-center border border-orange-200">
            Veuillez remplir tous les champs.
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">
              Courriel (Email)
            </label>
            <input
              type="text"
              id="email"
              name="email"
              placeholder="votre.email@apt.fr"
              className="w-full border border-gray-300 rounded-xl shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 bg-gray-50 text-gray-900 font-medium"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
               <label htmlFor="password" className="block text-sm font-bold text-gray-700">
                 Mot de passe
               </label>
               <span className="text-[10px] text-gray-400 italic">Oubli ? Demandez au bureau.</span>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-xl shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 bg-gray-50 text-gray-900 font-medium"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-orange-500 hover:bg-orange-600 transition-all transform hover:scale-[1.02] mt-2 !mt-6"
          >
            Se Connecter 👉
          </button>
        </form>
      </div>
    </div>
  );
}
