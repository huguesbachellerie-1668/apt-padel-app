'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface NavButtonProps {
  href: string;
  icon: ReactNode;
  label: string;
  className?: string;
  isMobile?: boolean;
  hasNotification?: boolean;
}

export default function NavButton({ href, icon, label, className = '', isMobile = false, hasNotification = false }: NavButtonProps) {
  const [isPendingPath, setIsPendingPath] = useState<string | null>(null);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsPendingPath(null);
  }

  const isPending = isPendingPath !== null && isPendingPath !== pathname;
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  const handleClick = () => {
    if (pathname !== href) {
      setIsPendingPath(href);
    }
  };

  if (isMobile) {
    const mobileClasses = [
      'flex flex-col items-center justify-center w-full h-full gap-1 relative transition-colors',
      isActive ? 'text-club-green' : 'text-slate-400 hover:text-slate-600',
      isPending ? 'opacity-50 cursor-wait scale-95' : 'active:scale-90',
      className
    ].filter(Boolean).join(' ');

    return (
      <Link 
        href={href} 
        onClick={handleClick} 
        className={mobileClasses}
      >
        {isPending ? (
          <Loader2 className="animate-spin text-club-green" size={24} />
        ) : (
          <div className="relative">
             {icon}
             {hasNotification && (
               <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
               </span>
             )}
          </div>
        )}
        <span className="text-[10px] font-semibold">{label}</span>
      </Link>
    );
  }

  const desktopClasses = [
    'px-4 py-2 rounded-full transition-all flex items-center gap-2 relative',
    isActive ? 'bg-club-green-light/50 text-club-green border border-club-green-light shadow-sm font-bold' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-transparent',
    isPending ? 'opacity-50 cursor-wait bg-slate-100 scale-95' : 'active:scale-95',
    className
  ].filter(Boolean).join(' ');

  // Desktop version
  return (
    <Link 
      href={href} 
      onClick={handleClick} 
      className={desktopClasses}
    >
      {isPending ? (
        <Loader2 className="animate-spin text-club-green" size={18} />
      ) : (
        <div className="relative flex items-center justify-center">
           {icon}
           {hasNotification && (
             <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
             </span>
           )}
        </div>
      )}
      <span className="text-sm">{label}</span>
    </Link>
  );
}
