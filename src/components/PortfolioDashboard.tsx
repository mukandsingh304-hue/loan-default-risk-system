import React, { useState } from 'react';
import { ApplicantProfile, RiskGrade } from '../types/risk';
import { assessLoanDefaultRisk, formatCurrency, formatPercent, DEFAULT_LGD } from '../utils/riskEngine';
import {
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  PieChart,
  BarChart3,
  Layers,
  Activity,
  Sliders,
  Sparkles,
  ArrowUpRight,
  Flame,
} from 'lucide-react';

interface PortfolioDashboardProps {
  portfolio: ApplicantProfile[];
  onSelectApplicant: (applicant: ApplicantProfile) => void;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  portfolio,
  onSelectApplicant,
}) => {
  // Stress Test State
  const [unemploymentShock, setUnemploymentShock] = useState(0); // in % (0 - 8%)
  const [rateHikeBps, setRateHikeBps] = useState(0); // in bps (0 - 500)
  const [gdpContraction, setGdpContraction] = useState(0); // in % (0 - 6%)

  // Compute individual assessments for all loans
  const assessedPortfolio = portfolio.map((app) => ({
    applicant: app,
    result: assessLoanDefaultRisk(app),
  }));

  // Aggregate Base Metrics
  const totalVolume = portfolio.reduce((acc, app) => acc + (app.loanAmount || 0), 0);
  const totalLoanCount = portfolio.length;

  // Weighted average base PD
  const totalWeightedPdDollars = assessedPortfolio.reduce(
    (acc, item) => acc + item.result.defaultProbability * item.applicant.loanAmount,
    0
  );
  const baseAvgPd = totalVolume > 0 ? totalWeightedPdDollars / totalVolume : 0;

  // Expected Dollar Loss = sum(loanAmount * PD * LGD)
  const baseExpectedLoss = assessedPortfolio.reduce(
    (acc, item) => acc + item.result.expectedLoss,
    0
  );
  const baseLossRate = totalVolume > 0 ? baseExpectedLoss / totalVolume : 0;

  // Non-Performing Loans (Grade D & E, or status declined/in_review)
  const nplVolume = assessedPortfolio
    .filter((item) => item.result.riskGrade === 'D' || item.result.riskGrade === 'E')
    .reduce((acc, item) => acc + item.applicant.loanAmount, 0);
  const nplRatio = totalVolume > 0 ? nplVolume / totalVolume : 0;

  // Basel III Minimum Capital Requirement (8% base + risk-weighted adjustment)
  const regulatoryCapitalReserve = totalVolume * (0.08 + baseAvgPd * 0.75);

  // Grade Distribution
  const grades: RiskGrade[] = ['A', 'B', 'C', 'D', 'E'];
  const gradeStats: Record<RiskGrade, { count: number; volume: number; avgPd: number }> = {
    A: { count: 0, volume: 0, avgPd: 0 },
    B: { count: 0, volume: 0, avgPd: 0 },
    C: { count: 0, volume: 0, avgPd: 0 },
    D: { count: 0, volume: 0, avgPd: 0 },
    E: { count: 0, volume: 0, avgPd: 0 },
  };

  assessedPortfolio.forEach((item) => {
    const g = item.result.riskGrade;
    gradeStats[g].count += 1;
    gradeStats[g].volume += item.applicant.loanAmount;
    gradeStats[g].avgPd += item.result.defaultProbability;
  });

  grades.forEach((g) => {
    if (gradeStats[g].count > 0) {
      gradeStats[g].avgPd = gradeStats[g].avgPd / gradeStats[g].count;
    }
  });

  // Purpose Distribution
  const purposeMap = new Map<string, { count: number; volume: number; totalPd: number }>();
  assessedPortfolio.forEach((item) => {
    const p = item.applicant.loanPurpose.replace('_', ' ');
    const existing = purposeMap.get(p) || { count: 0, volume: 0, totalPd: 0 };
    purposeMap.set(p, {
      count: existing.count + 1,
      volume: existing.volume + item.applicant.loanAmount,
      totalPd: existing.totalPd + item.result.defaultProbability,
    });
  });

  // Macro Stress Testing Calculation
  // Sensitivity multipliers:
  // Each +1% unemployment adds ~ 0.85% absolute PD
  // Each +100 bps rate hike adds ~ 0.45% absolute PD
  // Each +1% GDP contraction adds ~ 0.65% absolute PD
  const macroPdMultiplier =
    1 + (unemploymentShock * 0.16) + ((rateHikeBps / 100) * 0.08) + (gdpContraction * 0.12);
  const stressedAvgPd = Math.min(0.65, baseAvgPd * macroPdMultiplier);
  const stressedExpectedLoss = Math.round(totalVolume * stressedAvgPd * DEFAULT_LGD);
  const incrementalLoss = Math.max(0, stressedExpectedLoss - baseExpectedLoss);
  const stressedCapitalRequirement = totalVolume * (0.08 + stressedAvgPd * 0.85);
  const capitalDeficit = Math.max(0, stressedCapitalRequirement - regulatoryCapitalReserve);

  const applyScenarioPreset = (preset: 'mild' | 'moderate' | 'severe' | 'clear') => {
    switch (preset) {
      case 'mild':
        setUnemploymentShock(1.5);
        setRateHikeBps(75);
        setGdpContraction(0.5);
        break;
      case 'moderate':
        setUnemploymentShock(3.5);
        setRateHikeBps(200);
        setGdpContraction(2.2);
        break;
      case 'severe':
        setUnemploymentShock(6.5);
        setRateHikeBps(400);
        setGdpContraction(4.8);
        break;
      case 'clear':
      default:
        setUnemploymentShock(0);
        setRateHikeBps(0);
        setGdpContraction(0);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Portfolio Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Total Portfolio Volume</span>
          <div>
            <span className="text-xl font-bold font-mono text-white block">
              {formatCurrency(totalVolume)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {totalLoanCount} Active Facilities
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Weighted Average PD</span>
          <div>
            <span className={`text-xl font-bold font-mono block ${
              baseAvgPd < 0.05 ? 'text-emerald-400' : baseAvgPd < 0.12 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {formatPercent(baseAvgPd, 2)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Basel II IRB Calibrated
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Expected Total Loss (EL)</span>
          <div>
            <span className="text-xl font-bold font-mono text-rose-400 block">
              {formatCurrency(baseExpectedLoss)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {formatPercent(baseLossRate, 2)} of capital
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">NPL Ratio (Tier D/E)</span>
          <div>
            <span className={`text-xl font-bold font-mono block ${
              nplRatio > 0.20 ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {formatPercent(nplRatio, 1)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {formatCurrency(nplVolume)} at high risk
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Basel III Capital Reserve</span>
          <div>
            <span className="text-xl font-bold font-mono text-indigo-400 block">
              {formatCurrency(regulatoryCapitalReserve)}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Required liquidity cushion
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-medium text-slate-400">Portfolio Health Grade</span>
          <div>
            <span className="text-xl font-bold font-mono text-teal-400 block">
              {baseAvgPd < 0.04 ? 'AAA' : baseAvgPd < 0.08 ? 'AA-' : baseAvgPd < 0.15 ? 'BBB+' : 'B-'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Prime / Near-Prime Blend
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Macroeconomic Stress-Testing Engine */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>CCAR / Dodd-Frank Macro Stress-Testing Simulator</span>
                {(unemploymentShock > 0 || rateHikeBps > 0 || gdpContraction > 0) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse font-bold">
                    Stress Scenario Active
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Simulate portfolio loss resilience under adverse macroeconomic shocks
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden md:inline">Presets:</span>
            <button
              onClick={() => applyScenarioPreset('clear')}
              className="text-xs px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            >
              Baseline
            </button>
            <button
              onClick={() => applyScenarioPreset('mild')}
              className="text-xs px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-yellow-300 transition-colors"
            >
              Soft Landing
            </button>
            <button
              onClick={() => applyScenarioPreset('moderate')}
              className="text-xs px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 transition-colors"
            >
              Stagflation
            </button>
            <button
              onClick={() => applyScenarioPreset('severe')}
              className="text-xs px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800 text-rose-300 font-medium transition-colors"
            >
              Severe Recession
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="text-slate-300">Unemployment Spike</span>
              <span className="font-mono font-bold text-rose-400">+{unemploymentShock.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="0.5"
              value={unemploymentShock}
              onChange={(e) => setUnemploymentShock(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>0% (Status Quo)</span>
              <span>+4.0%</span>
              <span>+8.0% (Crisis)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="text-slate-300">Fed Funds Rate Hike</span>
              <span className="font-mono font-bold text-amber-400">+{rateHikeBps} bps</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="25"
              value={rateHikeBps}
              onChange={(e) => setRateHikeBps(Number(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>+0 bps</span>
              <span>+250 bps</span>
              <span>+500 bps (Severe)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="text-slate-300">GDP Contraction / Decline</span>
              <span className="font-mono font-bold text-indigo-400">-{gdpContraction.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              step="0.2"
              value={gdpContraction}
              onChange={(e) => setGdpContraction(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>0.0%</span>
              <span>-3.0%</span>
              <span>-6.0% (Depression)</span>
            </div>
          </div>
        </div>

        {/* Stress Results Banner */}
        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] text-slate-400 block">Stressed Portfolio PD</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-mono font-bold text-rose-400">
                {formatPercent(stressedAvgPd, 2)}
              </span>
              <span className="text-[10px] font-mono text-rose-300/80">
                (Baseline: {formatPercent(baseAvgPd, 2)})
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block">Projected Stressed Loss</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-mono font-bold text-rose-400">
                {formatCurrency(stressedExpectedLoss)}
              </span>
              <span className="text-[10px] font-mono text-rose-300/80">
                (+{formatCurrency(incrementalLoss)})
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block">Capital Buffer Adequacy</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-lg font-mono font-bold ${
                  capitalDeficit > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {capitalDeficit > 0 ? `Deficit: -${formatCurrency(capitalDeficit)}` : 'Sufficient Reserves'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block">Recommendation</span>
            <p className="text-xs text-slate-300 mt-1">
              {capitalDeficit > 0
                ? 'Tighten Tier C/D approval thresholds; reduce subprime exposure.'
                : 'Capital reserves satisfy minimum stress-test requirements.'}
            </p>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics: Grade Distribution & Purpose Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Grade Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Risk Grade Distribution (Basel Ratings)
            </h4>
            <span className="text-xs text-slate-400">Total: {totalLoanCount} loans</span>
          </div>

          <div className="space-y-3">
            {grades.map((g) => {
              const stat = gradeStats[g];
              const pctOfVol = totalVolume > 0 ? (stat.volume / totalVolume) * 100 : 0;
              const gradeColors: Record<RiskGrade, { bar: string; text: string }> = {
                A: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
                B: { bar: 'bg-teal-500', text: 'text-teal-400' },
                C: { bar: 'bg-amber-500', text: 'text-amber-400' },
                D: { bar: 'bg-orange-500', text: 'text-orange-400' },
                E: { bar: 'bg-rose-500', text: 'text-rose-400' },
              };
              const color = gradeColors[g];

              return (
                <div key={g} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 ${color.text}`}>
                        Grade {g}
                      </span>
                      <span className="text-slate-300 font-medium">
                        {stat.count} Loan{stat.count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-slate-400">
                        {formatCurrency(stat.volume)} ({pctOfVol.toFixed(1)}%)
                      </span>
                      <span className={`font-bold ${color.text}`}>
                        Avg PD: {formatPercent(stat.avgPd, 1)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800/60 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
                      style={{ width: `${Math.max(2, pctOfVol)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Loan Purpose Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-teal-400" />
              Exposure &amp; Default Risk by Loan Purpose
            </h4>
            <span className="text-xs text-slate-400">{purposeMap.size} Categories</span>
          </div>

          <div className="space-y-2.5">
            {Array.from(purposeMap.entries()).map(([purposeName, data]) => {
              const avgPd = data.count > 0 ? data.totalPd / data.count : 0;
              const pctOfVol = totalVolume > 0 ? (data.volume / totalVolume) * 100 : 0;

              return (
                <div
                  key={purposeName}
                  className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-200 capitalize block">
                      {purposeName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {data.count} facility • {formatCurrency(data.volume)} ({pctOfVol.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono font-bold block ${
                        avgPd < 0.05
                          ? 'text-emerald-400'
                          : avgPd < 0.12
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(avgPd, 1)} PD
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Exp. Loss: {formatCurrency(data.volume * avgPd * DEFAULT_LGD)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Credit Score vs DTI Risk Matrix (2D Heatmap Grid) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            2D Credit Risk Matrix (FICO Score Bands vs DTI Ratios)
          </h4>
          <p className="text-xs text-slate-400">
            Institutional portfolio concentration across credit quality and leverage zones
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-2.5 font-semibold">FICO \ DTI</th>
                <th className="p-2.5 font-semibold text-center">&lt; 20% DTI (Very Low)</th>
                <th className="p-2.5 font-semibold text-center">20% - 35% DTI (Moderate)</th>
                <th className="p-2.5 font-semibold text-center">36% - 43% DTI (Elevated)</th>
                <th className="p-2.5 font-semibold text-center">&gt; 43% DTI (Critical)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="p-2.5 font-bold text-slate-300">740+ (Prime+)</td>
                <td className="p-2.5 text-center bg-emerald-950/30 text-emerald-300 font-semibold rounded">
                  0.8% - 1.5% PD<br /><span className="text-[10px] text-slate-400 font-normal">Super Prime</span>
                </td>
                <td className="p-2.5 text-center bg-emerald-950/20 text-emerald-400">
                  1.6% - 2.8% PD<br /><span className="text-[10px] text-slate-400 font-normal">High Quality</span>
                </td>
                <td className="p-2.5 text-center bg-teal-950/20 text-teal-300">
                  3.2% - 4.8% PD<br /><span className="text-[10px] text-slate-400 font-normal">Acceptable</span>
                </td>
                <td className="p-2.5 text-center bg-amber-950/30 text-amber-300">
                  5.5% - 8.2% PD<br /><span className="text-[10px] text-slate-400 font-normal">Stretched</span>
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-slate-300">670 - 739 (Prime)</td>
                <td className="p-2.5 text-center bg-emerald-950/20 text-emerald-400">
                  2.2% - 3.5% PD<br /><span className="text-[10px] text-slate-400 font-normal">Sound</span>
                </td>
                <td className="p-2.5 text-center bg-teal-950/20 text-teal-400">
                  3.8% - 5.9% PD<br /><span className="text-[10px] text-slate-400 font-normal">Core Tier B</span>
                </td>
                <td className="p-2.5 text-center bg-amber-950/30 text-amber-300">
                  6.5% - 9.8% PD<br /><span className="text-[10px] text-slate-400 font-normal">Monitoring</span>
                </td>
                <td className="p-2.5 text-center bg-orange-950/30 text-orange-300">
                  10.5% - 15.0% PD<br /><span className="text-[10px] text-slate-400 font-normal">High Leverage</span>
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-slate-300">580 - 669 (Near-Prime)</td>
                <td className="p-2.5 text-center bg-amber-950/20 text-amber-400">
                  5.5% - 8.0% PD<br /><span className="text-[10px] text-slate-400 font-normal">Conditional</span>
                </td>
                <td className="p-2.5 text-center bg-amber-950/40 text-amber-300">
                  8.5% - 13.5% PD<br /><span className="text-[10px] text-slate-400 font-normal">Near-Prime Tier C</span>
                </td>
                <td className="p-2.5 text-center bg-orange-950/40 text-orange-400">
                  14.0% - 21.0% PD<br /><span className="text-[10px] text-slate-400 font-normal">Subprime</span>
                </td>
                <td className="p-2.5 text-center bg-rose-950/50 text-rose-300 font-bold">
                  22.0% - 32.0% PD<br /><span className="text-[10px] text-slate-400 font-normal">Severe Exposure</span>
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-bold text-slate-300">&lt; 580 (Subprime)</td>
                <td className="p-2.5 text-center bg-orange-950/30 text-orange-300">
                  12.0% - 18.0% PD<br /><span className="text-[10px] text-slate-400 font-normal">Subprime</span>
                </td>
                <td className="p-2.5 text-center bg-rose-950/40 text-rose-300">
                  19.0% - 28.0% PD<br /><span className="text-[10px] text-slate-400 font-normal">Critical</span>
                </td>
                <td className="p-2.5 text-center bg-rose-950/60 text-rose-300 font-bold">
                  29.0% - 42.0% PD<br /><span className="text-[10px] text-slate-400 font-normal">Policy Cap Exceeded</span>
                </td>
                <td className="p-2.5 text-center bg-rose-950/80 text-rose-200 font-extrabold">
                  &gt; 45.0% PD<br /><span className="text-[10px] text-rose-400 font-normal">Auto-Decline</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
