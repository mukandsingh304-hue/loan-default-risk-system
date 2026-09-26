import React from 'react';
import { RiskGrade } from '../types/risk';

interface RiskGaugeProps {
  probability: number; // 0 to 1
  score: number; // 300 to 850
  grade: RiskGrade;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ probability, score, grade }) => {
  const percent = Math.min(100, Math.max(0, probability * 100));

  // Determine color theme
  const getGradeTheme = (g: RiskGrade) => {
    switch (g) {
      case 'A':
        return {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          accent: '#10b981',
          label: 'Tier A • Prime Plus',
        };
      case 'B':
        return {
          text: 'text-teal-400',
          bg: 'bg-teal-500/10',
          border: 'border-teal-500/30',
          accent: '#14b8a6',
          label: 'Tier B • Prime',
        };
      case 'C':
        return {
          text: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          accent: '#f59e0b',
          label: 'Tier C • Near-Prime',
        };
      case 'D':
        return {
          text: 'text-orange-400',
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          accent: '#f97316',
          label: 'Tier D • Subprime',
        };
      case 'E':
      default:
        return {
          text: 'text-rose-400',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          accent: '#f43f5e',
          label: 'Tier E • Critical Risk',
        };
    }
  };

  const theme = getGradeTheme(grade);

  // Half-circle arc parameters
  // Angle: -180 deg to 0 deg
  const radius = 80;
  const stroke = 14;
  const circumference = Math.PI * radius; // half circle circumference
  // Clamped progress between 0 and 1
  const normalizedProb = Math.min(1, Math.max(0, percent / 40)); // 40% maps to full meter
  const strokeDashoffset = circumference - normalizedProb * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-56 h-32 flex items-center justify-center">
        <svg className="w-56 h-32 overflow-visible" viewBox="0 0 200 110">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="25%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Background Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {/* Active Colored Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Tick markers */}
          <text x="22" y="112" fill="#64748b" fontSize="9" textAnchor="middle">0%</text>
          <text x="60" y="45" fill="#64748b" fontSize="9" textAnchor="middle">5%</text>
          <text x="100" y="28" fill="#64748b" fontSize="9" textAnchor="middle">15%</text>
          <text x="140" y="45" fill="#64748b" fontSize="9" textAnchor="middle">25%</text>
          <text x="178" y="112" fill="#64748b" fontSize="9" textAnchor="middle">&gt;40%</text>
        </svg>

        {/* Center Readout */}
        <div className="absolute bottom-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
            {percent.toFixed(2)}%
          </span>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Default Probability
          </span>
        </div>
      </div>

      {/* Grade & Score Pill */}
      <div className="mt-3 flex items-center gap-3">
        <div className={`px-3 py-1 rounded-md border text-xs font-bold flex items-center gap-1.5 ${theme.bg} ${theme.border} ${theme.text}`}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.accent }} />
          Grade {grade}
        </div>
        <div className="text-xs font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
          Risk Score: <span className="font-bold text-white">{score}</span> / 850
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-1 font-medium">{theme.label}</p>
    </div>
  );
};
