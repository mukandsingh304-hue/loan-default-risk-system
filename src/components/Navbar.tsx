import React from 'react';
import {
  ShieldCheck,
  Activity,
  Layers,
  FileText,
  Sliders,
  Calculator,
  Flame,
  CheckCircle,
} from 'lucide-react';

export type NavTab = 'evaluator' | 'portfolio' | 'queue' | 'batch' | 'pricing';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  portfolioCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  portfolioCount,
}) => {
  const tabs = [
    {
      id: 'evaluator' as NavTab,
      label: 'Live Risk Evaluator',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'portfolio' as NavTab,
      label: 'Portfolio & Stress Test',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'queue' as NavTab,
      label: 'Underwriting Queue',
      icon: <FileText className="w-4 h-4" />,
      badge: portfolioCount,
    },
    {
      id: 'batch' as NavTab,
      label: 'Batch Validation',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'pricing' as NavTab,
      label: 'RAROC Pricing & Schedule',
      icon: <Calculator className="w-4 h-4" />,
    },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-slate-900/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  LOAN<span className="text-indigo-400">DEF</span>AULT
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                  RISK SYSTEM v3.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Basel II/III IRB Quantitative Risk &amp; Scoring Engine
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Status Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-slate-400 font-mono">
                Model: <strong className="text-emerald-400">Online</strong>
              </span>
            </div>
          </div>

        </div>

        {/* Mobile Nav */}
        <div className="flex lg:hidden overflow-x-auto py-2.5 gap-2 border-t border-slate-800/60 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
