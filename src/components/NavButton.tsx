'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, ReactNode } from 'react';

interface NavButtonProps {
  href: string;
  icon: ReactNode;
  label: string;
  className?: string;
  onClick?: () => void;
}

export default function NavButton({ href, icon, label, className = '' }: NavButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const pathname = usePathname();

  // Reset loading state when navigation completes
  useEffect(() => {
    setIsPending(false);
  }, [pathname]);

  const handleClick = (e: React.MouseEvent) => {
    // If it's the exact same page, don't show loading
    if (pathname !== href) {
      setIsPending(true);
    }
  };

  return (
    <Link 
      href={href} 
      onClick={handleClick} 
      className={`px-3 py-2 hover:bg-white/10 rounded-full transition-colors flex flex-col items-center gap-1 ${isPending ? 'opacity-50 cursor-wait bg-white/10 scale-95' : ''} ${className}`}
    >
      {isPending ? (
        <span className="flex items-center justify-center h-5 w-5">
            <svg className="animate-spin h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </span>
      ) : (
        <span className="flex items-center justify-center h-5 w-5 text-[18px]">{icon}</span>
      )}
      <span className="text-xs">{label}</span>
    </Link>
  );
}
