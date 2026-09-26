import React, { useState } from 'react';
import {
  calculateMonthlyPayment,
  calculateRiskBasedApr,
  DEFAULT_LGD,
  BASE_COST_OF_FUNDS,
  SERVICING_COST,
  TARGET_RETURN_SPREAD,
  formatCurrency,
  formatPercent,
} from '../utils/riskEngine';
import { RiskGrade } from '../types/risk';
import { Calculator, Percent, DollarSign, Calendar, TrendingUp } from 'lucide-react';

export const PricingCalculator: React.FC = () => {
  const [loanPrincipal, setLoanPrincipal] = useState(25000);
  const [termMonths, setTermMonths] = useState(36);
  const [selectedGrade, setSelectedGrade] = useState<RiskGrade>('B');
  const [customApr, setCustomApr] = useState<number | null>(null);

  // Approximate default probability for each grade
  const gradePds: Record<RiskGrade, number> = {
    A: 0.015,
    B: 0.045,
    C: 0.095,
    D: 0.185,
    E: 0.320,
  };

  const pd = gradePds[selectedGrade];
  const recommendedApr = calculateRiskBasedApr(pd, selectedGrade);
  const effectiveApr = customApr !== null ? customApr : recommendedApr;

  const monthlyPayment = calculateMonthlyPayment(loanPrincipal, effectiveApr, termMonths);
  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = Math.max(0, totalPayment - loanPrincipal);
  const expectedLossDollars = loanPrincipal * pd * DEFAULT_LGD;

  // Breakdown components
  const lossPremium = pd * DEFAULT_LGD * 100;
  const capitalCharges: Record<RiskGrade, number> = {
    A: 0.5,
    B: 1.5,
    C: 3.5,
    D: 6.0,
    E: 10.0,
  };
  const capitalBuffer = capitalCharges[selectedGrade];

  // Generate amortization table
  const amortizationSchedule = [];
  let balance = loanPrincipal;
  const monthlyRate = effectiveApr / 100 / 12;

  for (let m = 1; m <= Math.min(termMonths, 60); m++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = Math.min(balance, monthlyPayment - interestPayment);
    balance = Math.max(0, balance - principalPayment);

    amortizationSchedule.push({
      month: m,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance: balance,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Risk-Based Pricing (RAROC) &amp; Loan Amortization Engine
            </h3>
            <p className="text-xs text-slate-400">
              Institutional yield curve pricing calibrated to borrower default probability and target return on equity
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Interactive Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Facility Parameters
            </h4>

            {/* Principal */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-300 font-medium">Loan Principal</span>
                <span className="font-mono font-bold text-white text-sm">
                  {formatCurrency(loanPrincipal)}
                </span>
              </div>
              <input
                type="range"
                min="2000"
                max="100000"
                step="1000"
                value={loanPrincipal}
                onChange={(e) => setLoanPrincipal(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>$2,000</span>
                <span>$50,000</span>
                <span>$100,000</span>
              </div>
            </div>

            {/* Term Months */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Loan Term (Months)
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[12, 24, 36, 48, 60].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTermMonths(t)}
                    className={`py-2 text-xs font-mono font-bold rounded-lg border transition-colors ${
                      termMonths === t
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t}m
                  </button>
                ))}
              </div>
            </div>

            {/* Risk Grade Selection */}
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1.5">
                Borrower Credit Risk Tier
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(['A', 'B', 'C', 'D', 'E'] as RiskGrade[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setSelectedGrade(g);
                      setCustomApr(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      selectedGrade === g
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Grade {g}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                Assumed Default Probability: {(pd * 100).toFixed(1)}% PD
              </span>
            </div>

            {/* APR Override */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-300">Effective APR (%)</span>
                <span className="font-mono font-bold text-indigo-400">
                  {effectiveApr.toFixed(2)}%
                </span>
              </div>
              <input
                type="number"
                step="0.1"
                min="4.0"
                max="35.99"
                value={effectiveApr}
                onChange={(e) => setCustomApr(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Model recommended: {recommendedApr.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Institutional Pricing Waterfall / RAROC Stack */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Percent className="w-4 h-4 text-teal-400" />
              RAROC Pricing Waterfall Breakdown
            </h4>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 font-sans">1. Base Cost of Funds (SOFR benchmark):</span>
                <span className="text-white font-bold">{BASE_COST_OF_FUNDS.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 font-sans">2. Operational &amp; Servicing Margin:</span>
                <span className="text-white font-bold">+{SERVICING_COST.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 font-sans">3. Expected Default Loss Spread:</span>
                <span className="text-rose-400 font-bold">+{lossPremium.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 font-sans">4. Capital Buffer &amp; Tail Risk:</span>
                <span className="text-amber-400 font-bold">+{capitalBuffer.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400 font-sans">5. Target Hurdle ROE Spread:</span>
                <span className="text-emerald-400 font-bold">+{TARGET_RETURN_SPREAD.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-bold text-sm">
                <span className="font-sans">Total Calibrated APR:</span>
                <span>{recommendedApr.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Payment Overview & Amortization Table (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Monthly Payment
              </span>
              <span className="text-2xl font-mono font-extrabold text-white block mt-1">
                {formatCurrency(monthlyPayment)}
              </span>
              <span className="text-[10px] text-slate-500">
                Fixed monthly installment
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Total Interest
              </span>
              <span className="text-2xl font-mono font-extrabold text-amber-400 block mt-1">
                {formatCurrency(totalInterest)}
              </span>
              <span className="text-[10px] text-slate-500">
                Over {termMonths} months
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Total Cost of Loan
              </span>
              <span className="text-2xl font-mono font-extrabold text-indigo-400 block mt-1">
                {formatCurrency(totalPayment)}
              </span>
              <span className="text-[10px] text-slate-500">
                Principal + Interest
              </span>
            </div>
          </div>

          {/* Amortization Schedule Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                Amortization Schedule (First {Math.min(termMonths, 36)} Months)
              </h4>
              <span className="text-xs font-mono text-slate-400">
                Principal: {formatCurrency(loanPrincipal)} @ {effectiveApr.toFixed(2)}%
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/90 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Mo</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Principal</th>
                    <th className="py-2.5 px-3">Interest</th>
                    <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {amortizationSchedule.slice(0, 36).map((row) => (
                    <tr key={row.month} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-slate-400">#{row.month}</td>
                      <td className="py-2 px-3 text-white">{formatCurrency(row.payment)}</td>
                      <td className="py-2 px-3 text-emerald-400">{formatCurrency(row.principal)}</td>
                      <td className="py-2 px-3 text-amber-400">{formatCurrency(row.interest)}</td>
                      <td className="py-2 px-3 text-right text-slate-300 font-bold">
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
