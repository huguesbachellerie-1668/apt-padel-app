'use client';

import { useState, useEffect } from 'react';
import SubmitButton from './SubmitButton';

type Reservation = {
  id: string;
  name: string;
  startTime: string;
  club: {
    name: string;
  };
};

type Props = {
  currentReservationId: string | null;
  reservations: Reservation[];
};

export default function PoolCourtSelect({ currentReservationId, reservations }: Props) {
  const [selectedId, setSelectedId] = useState(currentReservationId || "");

  // Update local state if the server state changes (e.g., after a successful form submission)
  useEffect(() => {
    setSelectedId(currentReservationId || "");
  }, [currentReservationId]);

  const isDirty = selectedId !== (currentReservationId || "");
  const isNotSet = selectedId === "";

  let btnColor = "bg-green-500 hover:bg-green-400"; // Validated (light green)
  let btnText = "OK";

  if (isNotSet) {
    btnColor = "bg-red-500 hover:bg-red-600 px-3"; // Red for "A définir..."
    btnText = "?";
  } else if (isDirty) {
    btnColor = "bg-orange-500 hover:bg-orange-400"; // Orange for unvalidated change
    btnText = "OK ?";
  }

  return (
    <>
      <div className="flex items-center gap-1 pl-2">
        <select 
          name="reservationId" 
          value={selectedId} 
          onChange={(e) => setSelectedId(e.target.value)}
          className="bg-white text-gray-900 rounded px-2 py-1 text-xs font-bold w-64 border-0 focus:ring-2 focus:ring-orange-500 truncate"
        >
          <option value="">A définir...</option>
          {reservations && reservations.map(res => (
            <option key={res.id} value={res.id}>{res.club.name} Terrain {res.name} ({res.startTime})</option>
          ))}
        </select>
      </div>
      <SubmitButton 
        pendingText="..." 
        className={`${btnColor} text-white py-1 rounded-lg text-xs font-bold ml-1 transition-colors ${!isNotSet ? 'px-2' : ''}`}
      >
        {btnText}
      </SubmitButton>
    </>
  );
}
