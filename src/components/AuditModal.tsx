import React, { useState } from 'react';
import { ApplicantProfile, RiskAssessmentResult } from '../types/risk';
import {
  assessLoanDefaultRisk,
  formatCurrency,
  formatPercent,
} from '../utils/riskEngine';
import { RiskGauge } from './RiskGauge';
import { FactorChart } from './FactorChart';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  User,
  Building,
  CreditCard,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

interface AuditModalProps {
  applicant: ApplicantProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdateApplicant: (updated: ApplicantProfile) => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({
  applicant,
  isOpen,
  onClose,
  onUpdateApplicant,
}) => {
  if (!isOpen) return null;

  const [loanAmount, setLoanAmount] = useState(applicant.loanAmount);
  const [loanTerm, setLoanTerm] = useState(applicant.loanTermMonths);
  const [requestedApr, setRequestedApr] = useState(applicant.requestedRatePercent || 12.0);
  const [notes, setNotes] = useState(applicant.underwriterNotes || '');
  const [status, setStatus] = useState(applicant.status);

  // Compute live updated assessment based on any tweaked loan values
  const activeApplicant: ApplicantProfile = {
    ...applicant,
    loanAmount,
    loanTermMonths: loanTerm,
    requestedRatePercent: requestedApr,
  };
  const result: RiskAssessmentResult = assessLoanDefaultRisk(activeApplicant);

  const handleSave = () => {
    onUpdateApplicant({
      ...activeApplicant,
      status,
      underwriterNotes: notes,
    });
    onClose();
  };

  const getDecisionBadge = () => {
    switch (result.decision) {
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" /> APPROVED
          </span>
        );
      case 'CONDITIONAL_APPROVAL':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" /> CONDITIONAL APPROVAL
          </span>
        );
      case 'MANUAL_REVIEW':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/40 font-bold text-xs">
            <AlertTriangle className="w-4 h-4" /> MANUAL REVIEW
          </span>
        );
      case 'DECLINED':
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold text-xs">
            <XCircle className="w-4 h-4" /> DECLINED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Underwriting Audit Memo: {applicant.applicantName}
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {applicant.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Application Date: {applicant.applicationDate} • Purpose: {applicant.loanPurpose.replace('_', ' ').toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getDecisionBadge()}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Risk & Financial Summary Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Risk Gauge Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 flex flex-col items-center justify-center">
              <RiskGauge
                probability={result.defaultProbability}
                score={result.internalRiskScore}
                grade={result.riskGrade}
              />
            </div>

            {/* Financial Metrics */}
            <div className="md:col-span-2 bg-slate-950/60 border border-slate-800 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-slate-400 block">FICO Score</span>
                <span className="text-lg font-mono font-bold text-white">
                  {applicant.creditScore}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Annual Income</span>
                <span className="text-lg font-mono font-bold text-white">
                  {formatCurrency(applicant.annualIncome)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Back-end DTI</span>
                <span
                  className={`text-lg font-mono font-bold ${
                    result.backEndDti > 0.43 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {formatPercent(result.backEndDti)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Credit Utilization</span>
                <span
                  className={`text-lg font-mono font-bold ${
                    result.revolvingUtilization > 0.70 ? 'text-amber-400' : 'text-slate-200'
                  }`}
                >
                  {formatPercent(result.revolvingUtilization)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Monthly Payment</span>
                <span className="text-lg font-mono font-bold text-white">
                  {formatCurrency(result.monthlyPayment)}/mo
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Recommended APR</span>
                <span className="text-lg font-mono font-bold text-indigo-400">
                  {result.recommendedApr.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Liquid Reserves</span>
                <span className="text-base font-mono font-medium text-slate-300">
                  {formatCurrency(applicant.liquidSavings)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Delinquencies (24m)</span>
                <span
                  className={`text-base font-mono font-medium ${
                    applicant.delinquenciesLast2Years > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {applicant.delinquenciesLast2Years}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Max Safe Loan (43% DTI)</span>
                <span className="text-base font-mono font-medium text-teal-400">
                  {formatCurrency(result.maxSafeLoanAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Policy Violations */}
          {result.policyRules.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-900/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4" />
                <span>Credit Policy Triggers & Exceptions ({result.policyRules.length})</span>
              </div>
              <div className="space-y-1.5">
                {result.policyRules.map((rule, idx) => (
                  <div key={idx} className="text-xs text-rose-200/90 flex items-start gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-900/40 text-rose-300 shrink-0">
                      {rule.code}
                    </span>
                    <div>
                      <p className="font-medium">{rule.message}</p>
                      <p className="text-[11px] text-slate-400">{rule.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Underwriter Term Adjustment / Counter-Offer Simulator */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-400" />
              Underwriter Term Restructuring & Pricing Simulation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Adjust Loan Amount: <span className="text-white font-mono font-bold">${loanAmount.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min="2000"
                  max="100000"
                  step="1000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Term: <span className="text-white font-mono font-bold">{loanTerm} months</span>
                </label>
                <select
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value={12}>12 Months (1 yr)</option>
                  <option value={24}>24 Months (2 yrs)</option>
                  <option value={36}>36 Months (3 yrs)</option>
                  <option value={48}>48 Months (4 yrs)</option>
                  <option value={60}>60 Months (5 yrs)</option>
                  <option value={84}>84 Months (7 yrs)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Assigned APR: <span className="text-white font-mono font-bold">{requestedApr.toFixed(2)}%</span>
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="4.0"
                  max="35.99"
                  value={requestedApr}
                  onChange={(e) => setRequestedApr(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Explainability Breakdown */}
          <FactorChart factors={result.factorContributions} />

          {/* Underwriter Notes & Status Override */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Final Underwriter Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-semibold"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="conditional">Conditional Approval</option>
                <option value="in_review">In Review / Committee</option>
                <option value="declined">Declined</option>
                <option value="funded">Funded</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Underwriting Notes & Decision Justification
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter credit committee rationale, required stipulations, or exceptions granted..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg p-2.5 text-white placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Audit Trail ID: <code className="text-slate-300 font-mono">AUD-{(applicant.id).replace('LN-', '')}-V3</code>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
            >
              Save Decision &amp; Memo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
