"use client";

import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, TooltipProps } from 'recharts';

interface ChartDataPoint {
  name: string;
  rank: number;
}

interface PlayerRankChartProps {
  data: ChartDataPoint[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const rankValue = payload[0].value;
    return (
      <div className="bg-white p-4 border border-slate-200 shadow-md rounded-xl">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        <p className="text-club-green font-black text-lg">
          {rankValue}{rankValue === 1 ? 'er' : 'ème'} <span className="text-sm text-slate-500 font-medium">au classement</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function PlayerRankChart({ data }: PlayerRankChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // Calculate min and max for the Y axis
  const ranks = data.map(d => d.rank);
  const minRank = Math.min(...ranks);
  const maxRank = Math.max(...ranks);
  
  // Add some padding to the domain
  // We want the highest rank (e.g. 1) at the top, so we will use "reversed" on the YAxis.
  const yDomain = [
    Math.max(1, minRank - 2), 
    maxRank + 2
  ];

  return (
    <div className="card-club p-6 rounded-3xl w-full">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="text-2xl">🏅</span> Évolution du classement
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 15,
              right: 10,
              left: -20,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorRank" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#166534" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#166534" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              reversed={true} // Inversé : 1 en haut !
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="stepAfter" 
              dataKey="rank" 
              stroke="#166534" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorRank)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#166534' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
