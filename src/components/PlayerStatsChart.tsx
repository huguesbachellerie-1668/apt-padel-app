"use client";

import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, TooltipProps } from 'recharts';

interface ChartDataPoint {
  name: string;
  average: number;
}

interface PlayerStatsChartProps {
  data: ChartDataPoint[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-blue-100 shadow-lg rounded-xl">
        <p className="font-bold text-gray-800 mb-1">{label}</p>
        <p className="text-blue-600 font-black text-lg">
          {payload[0].value.toFixed(2)} <span className="text-sm text-gray-500 font-medium">pts</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function PlayerStatsChart({ data }: PlayerStatsChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  // Calculate min and max for the Y axis to make the chart look more dynamic
  const averages = data.map(d => d.average);
  const minAvg = Math.min(...averages);
  const maxAvg = Math.max(...averages);
  
  // Add some padding to the domain to better see variations
  const yDomain = [
    Math.max(0, Math.floor(minAvg - 1)), 
    Math.ceil(maxAvg + 1)
  ];

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm w-full">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <span className="text-2xl">📈</span> Évolution de la moyenne
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: -20,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              domain={yDomain}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="average" 
              stroke="#2563eb" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorAverage)" 
              activeDot={{ r: 6, strokeWidth: 0, fill: '#1d4ed8' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
