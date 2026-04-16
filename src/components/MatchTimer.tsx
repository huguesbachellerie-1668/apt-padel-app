'use client';

import { useState, useEffect, useRef } from 'react';

export default function MatchTimer({ initialMinutes }: { initialMinutes: number }) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [endTime, setEndTime] = useState<number | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        if (!wakeLockRef.current) {
           wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      }
    } catch (err) {
      console.error("Wake Lock request failed", err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      try {
         wakeLockRef.current.release().then(() => {
            wakeLockRef.current = null;
         });
      } catch (err) {
         console.error("Wake Lock release failed", err);
      }
    }
  };

  const initAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (e) {
      console.error("Audio Web API init failed", e);
    }
  };

  const playBeep = () => {
    try {
      const audioCtx = audioCtxRef.current;
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // Alarm tone
      oscillator.type = 'square';
      
      // 5 repeated loud beeps
      for (let i = 0; i < 5; i++) {
         const t = audioCtx.currentTime + i * 0.6;
         oscillator.frequency.setValueAtTime(880, t); 
         oscillator.frequency.setValueAtTime(1318.51, t + 0.2); 
         
         gainNode.gain.setValueAtTime(1, t);
         gainNode.gain.setValueAtTime(1, t + 0.4);
         gainNode.gain.linearRampToValueAtTime(0.001, t + 0.5);
      }
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 3);
    } catch(e) {
      console.error("Audio Web API play failed", e);
    }
  };

  useEffect(() => {
    // Re-request wake lock if tab becomes visible again while running
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning]);

  useEffect(() => {
    if (isRunning && endTime) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          setIsRunning(false);
          setEndTime(null);
          releaseWakeLock();
          playBeep();
        }
      }, 500); // 500ms allows snappy enough updates
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, endTime]);

  const toggleStartPause = () => {
    initAudio(); // Unlock audio on user interaction!
    
    if (isRunning) {
      setIsRunning(false);
      setEndTime(null);
      releaseWakeLock();
    } else {
      setIsRunning(true);
      setEndTime(Date.now() + timeLeft * 1000);
      requestWakeLock();
    }
  };

  const stopTimer = () => {
    setIsRunning(false);
    setEndTime(null);
    setTimeLeft(initialMinutes * 60);
    releaseWakeLock();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900 border-4 border-gray-800 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative group mb-8 shadow-xl">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMiIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col text-center sm:text-left">
        <h3 className="text-gray-400 font-bold tracking-widest uppercase text-xs mb-1 flex justify-center sm:justify-start items-center gap-2">
          <span>⏱️</span> Chronomètre 
          <button onClick={() => { initAudio(); setTimeout(playBeep, 100); }} className="ml-2 text-xs bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded text-gray-300" title="Tester le volume">🔔 Test Bip</button>
        </h3>
        <div className={`font-black tracking-tighter transition-colors ${timeLeft === 0 ? 'text-red-500 animate-pulse text-7xl' : 'text-white text-6xl'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
        {!isRunning ? (
          <button onClick={toggleStartPause} className="flex-1 bg-green-500 hover:bg-green-400 text-white font-black px-6 py-4 rounded-xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95">
            ▶️ Lancer
          </button>
        ) : (
          <button onClick={toggleStartPause} className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-black px-6 py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95">
            ⏸️ Pause
          </button>
        )}
        <button onClick={stopTimer} className="bg-red-600 hover:bg-red-500 text-white font-black px-6 py-4 rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95">
          ⏹️ Stop
        </button>
      </div>
    </div>
  );
}
