'use client';

import { useTransition } from 'react';
import { unregisterFromSession } from '@/app/actions';

type Props = {
  sessionId: string;
  sessionDate: string;
  userName: string;
  className?: string;
  children: React.ReactNode;
};

export default function UnregisterButtonWithWhatsApp({ sessionId, sessionDate, userName, className, children }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleUnregister = () => {
    if (confirm("Êtes-vous sûr de vouloir vous désinscrire ? Un message WhatsApp sera préparé pour informer le club.")) {
      // 1. Prepare Whatsapp
      const text = encodeURIComponent(`${userName} se désinscrit de la session du ${sessionDate}`);
      
      // 2. Open WhatsApp immediately to avoid popup blockers
      window.open(`https://wa.me/?text=${text}`, '_blank');
      
      // 3. Trigger server unregistration
      startTransition(async () => {
        await unregisterFromSession(sessionId);
      });
    }
  };

  return (
    <button onClick={handleUnregister} disabled={isPending} className={className}>
      {isPending ? "⏳..." : children}
    </button>
  );
}
