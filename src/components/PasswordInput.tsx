'use client'

import { useState } from 'react';

export default function PasswordInput() {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="relative">
      <input
        type={showPwd ? "text" : "password"}
        id="password"
        name="password"
        placeholder="••••••••"
        className="w-full pr-12 border border-gray-300 rounded-xl shadow-sm focus:border-orange-500 focus:ring-orange-500 p-3 bg-gray-50 text-gray-900 font-medium"
        required
      />
      <button 
        type="button" 
        onClick={() => setShowPwd(!showPwd)} 
        className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-orange-500 focus:outline-none text-xl" 
        title={showPwd ? "Cacher" : "Afficher"}
      >
        {showPwd ? '🙈' : '👁️'}
      </button>
    </div>
  );
}
