import React from 'react';
import { FactorContribution } from '../types/risk';
import { TrendingDown, TrendingUp, ShieldCheck, AlertCircle } from 'lucide-react';

interface FactorChartProps {
  factors: FactorContribution[];
}

export const FactorChart: React.FC<FactorChartProps> = ({ factors }) => {
  const maxWeight = Math.max(1, ...factors.map((f) => Math.abs(f.weight)));

  const positiveFactors = factors.filter((f) => f.impact === 'positive');
  const negativeFactors = factors.filter((f) => f.impact === 'negative');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>Model Explainability (Feature Attribution)</span>
          </h4>
          <p className="text-xs text-slate-400">
            SHAP-style quantitative attribution of borrower attributes pushing risk up or down
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Lowers Risk
          </span>
          <span className="flex items-center gap-1 text-rose-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Increases Risk
          </span>
        </div>
      </div>

      <div className="space-y-2.5">
        {factors.map((factor, idx) => {
          const isPos = factor.impact === 'positive';
          const barWidthPercent = Math.min(100, Math.round((Math.abs(factor.weight) / maxWeight) * 100));

          return (
            <div
              key={idx}
              className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 transition-colors"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  {isPos ? (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-200">{factor.featureName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {String(factor.actualValue)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <span
                    className={`font-bold text-xs ${
                      isPos ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPos ? '-' : '+'}
                    {Math.abs(factor.weight)} pts
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800/70 h-1.5 rounded-full overflow-hidden my-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPos ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${barWidthPercent}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {factor.description}
              </p>
            </div>
          );
        })}
      </div>

      {factors.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-4">
          No factor attributions calculated for this profile.
        </p>
      )}
    </div>
  );
};
