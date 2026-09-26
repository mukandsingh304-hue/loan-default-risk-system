import React, { useState } from 'react';
import {
  ApplicantProfile,
  EducationLevel,
  EmploymentStatus,
  HousingStatus,
  LoanPurpose,
  RiskAssessmentResult,
} from '../types/risk';
import {
  assessLoanDefaultRisk,
  formatCurrency,
  formatPercent,
} from '../utils/riskEngine';
import { BENCHMARK_PRESETS } from '../data/mockApplicants';
import { RiskGauge } from './RiskGauge';
import { FactorChart } from './FactorChart';
import {
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sliders,
  DollarSign,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  RotateCcw,
  FileCheck,
} from 'lucide-react';

interface RiskEvaluatorProps {
  onAddApplicantToPortfolio: (applicant: ApplicantProfile) => void;
}

const defaultProfile: ApplicantProfile = {
  id: `LN-${Date.now().toString().slice(-4)}`,
  applicantName: 'Rachel Green',
  email: 'rachel.green@apexdesign.com',
  phone: '(555) 234-8901',
  age: 34,
  education: 'bachelors',
  maritalStatus: 'single',
  dependents: 0,
  housingStatus: 'RENT',
  employmentStatus: 'employed_full_time',
  jobTitle: 'Senior UX Designer',
  employerName: 'Apex Interactive Studio',
  employmentYears: 4.5,
  industry: 'Technology',
  annualIncome: 95000,
  monthlyDebt: 1250,
  liquidSavings: 18500,
  totalAssets: 65000,
  creditScore: 725,
  creditHistoryLengthYears: 9,
  openCreditLines: 8,
  totalCreditLimit: 36000,
  revolvingBalance: 5800,
  delinquenciesLast2Years: 0,
  derogatoryRecords: 0,
  inquiriesLast6Months: 1,
  bankruptcies: 0,
  loanAmount: 22000,
  loanPurpose: 'debt_consolidation',
  loanTermMonths: 36,
  applicationDate: new Date().toISOString().split('T')[0],
  status: 'pending',
};

export const RiskEvaluator: React.FC<RiskEvaluatorProps> = ({
  onAddApplicantToPortfolio,
}) => {
  const [profile, setProfile] = useState<ApplicantProfile>(defaultProfile);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfFicoDelta, setWhatIfFicoDelta] = useState(0);
  const [whatIfDebtPaydown, setWhatIfDebtPaydown] = useState(0);
  const [whatIfIncomeDelta, setWhatIfIncomeDelta] = useState(0);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  // Compute primary assessment
  const result: RiskAssessmentResult = assessLoanDefaultRisk(profile);

  // Compute what-if simulation profile if active
  const simulatedProfile: ApplicantProfile = {
    ...profile,
    creditScore: Math.min(850, Math.max(300, profile.creditScore + whatIfFicoDelta)),
    revolvingBalance: Math.max(0, profile.revolvingBalance - whatIfDebtPaydown),
    annualIncome: Math.max(1000, profile.annualIncome + whatIfIncomeDelta),
  };
  const simulatedResult: RiskAssessmentResult = assessLoanDefaultRisk(simulatedProfile);

  const handlePresetSelect = (presetKey: string) => {
    const preset = BENCHMARK_PRESETS[presetKey];
    if (preset) {
      setProfile({
        ...defaultProfile,
        ...preset,
        id: `LN-${Math.floor(1000 + Math.random() * 9000)}`,
        applicationDate: new Date().toISOString().split('T')[0],
      });
      // reset what-if
      setWhatIfFicoDelta(0);
      setWhatIfDebtPaydown(0);
      setWhatIfIncomeDelta(0);
      setSubmittedMessage(null);
    }
  };

  const handleFieldChange = (field: keyof ApplicantProfile, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSubmittedMessage(null);
  };

  const handleAddToPortfolio = () => {
    const newApp: ApplicantProfile = {
      ...profile,
      id: `LN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: result.decision === 'APPROVED' ? 'approved' : result.decision === 'DECLINED' ? 'declined' : 'in_review',
      requestedRatePercent: result.recommendedApr,
      underwriterNotes: result.summaryNote,
    };
    onAddApplicantToPortfolio(newApp);
    setSubmittedMessage(`Application for ${profile.applicantName} (${newApp.id}) submitted to the Underwriting Queue!`);
    setTimeout(() => setSubmittedMessage(null), 5000);
  };

  const getDecisionHeader = () => {
    switch (result.decision) {
      case 'APPROVED':
        return {
          icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
          title: 'RECOMMENDED: APPROVAL',
          bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
        };
      case 'CONDITIONAL_APPROVAL':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          title: 'CONDITIONAL APPROVAL (STIPULATIONS REQUIRED)',
          bg: 'bg-amber-950/40 border-amber-500/30 text-amber-300',
        };
      case 'MANUAL_REVIEW':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-blue-400" />,
          title: 'REFERRED TO SENIOR CREDIT COMMITTEE',
          bg: 'bg-blue-950/40 border-blue-500/30 text-blue-300',
        };
      case 'DECLINED':
      default:
        return {
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          title: 'RECOMMENDED: DECLINE (EXCEEDS POLICY RISK)',
          bg: 'bg-rose-950/40 border-rose-500/30 text-rose-300',
        };
    }
  };

  const decisionHeader = getDecisionHeader();

  return (
    <div className="space-y-6">
      {/* Top Presets & Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Live Loan Default Risk Assessment</h3>
            <p className="text-xs text-slate-400">
              Real-time predictive scoring powered by calibrated multivariate logistic regression
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 whitespace-nowrap hidden md:inline">
            Load Benchmark:
          </span>
          <select
            onChange={(e) => handlePresetSelect(e.target.value)}
            defaultValue=""
            className="w-full sm:w-64 bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="" disabled>
              ⚡ Select Benchmark Profile...
            </option>
            {Object.entries(BENCHMARK_PRESETS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name} ({v.tag})
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setProfile(defaultProfile);
              setWhatIfFicoDelta(0);
              setWhatIfDebtPaydown(0);
              setWhatIfIncomeDelta(0);
            }}
            title="Reset to Default"
            className="p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {submittedMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs flex items-center justify-between animate-in fade-in">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            {submittedMessage}
          </span>
          <button
            onClick={() => setSubmittedMessage(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Inputs on Left, Real-Time Scoring on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Columns: Inputs (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Section 1: Loan Request */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                1. Loan Request &amp; Purpose
              </h4>
              <span className="text-xs font-mono text-indigo-400 font-bold">
                {formatCurrency(profile.loanAmount)} • {profile.loanTermMonths} Mo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-300">Requested Amount</label>
                  <span className="text-xs font-mono font-bold text-white">
                    ${profile.loanAmount.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={profile.loanAmount}
                  onChange={(e) => handleFieldChange('loanAmount', Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                  <span>$1,000</span>
                  <span>$50,000</span>
                  <span>$100,000</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Term Length</label>
                <select
                  value={profile.loanTermMonths}
                  onChange={(e) => handleFieldChange('loanTermMonths', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white"
                >
                  <option value={12}>12 Months (1 yr)</option>
                  <option value={24}>24 Months (2 yrs)</option>
                  <option value={36}>36 Months (3 yrs)</option>
                  <option value={48}>48 Months (4 yrs)</option>
                  <option value={60}>60 Months (5 yrs)</option>
                  <option value={84}>84 Months (7 yrs)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-300 block mb-1">Loan Purpose</label>
                <select
                  value={profile.loanPurpose}
                  onChange={(e) => handleFieldChange('loanPurpose', e.target.value as LoanPurpose)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white"
                >
                  <option value="debt_consolidation">Debt Consolidation</option>
                  <option value="credit_card_refinance">Credit Card Refinancing</option>
                  <option value="home_improvement">Home Improvement</option>
                  <option value="small_business">Small Business Expansion</option>
                  <option value="auto_purchase">Auto Purchase</option>
                  <option value="medical_expense">Medical Expense</option>
                  <option value="major_purchase">Major Purchase</option>
                  <option value="education">Education &amp; Training</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Target APR (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="3"
                  max="35.99"
                  value={profile.requestedRatePercent || result.recommendedApr}
                  onChange={(e) => handleFieldChange('requestedRatePercent', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Credit Bureau Profile */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                2. Credit Bureau Profile &amp; Repayment History
              </h4>
              <span className={`text-xs font-mono font-bold ${
                profile.creditScore >= 740 ? 'text-emerald-400' : profile.creditScore >= 670 ? 'text-teal-400' : profile.creditScore >= 580 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                FICO: {profile.creditScore}
              </span>
            </div>

            {/* FICO Score Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Credit Score (FICO Score 8)
                </label>
                <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                  {profile.creditScore}
                </span>
              </div>
              <input
                type="range"
                min="350"
                max="850"
                step="5"
                value={profile.creditScore}
                onChange={(e) => handleFieldChange('creditScore', Number(e.target.value))}
                className="w-full accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span className="text-rose-400">Poor (350-579)</span>
                <span className="text-amber-400">Fair (580-669)</span>
                <span className="text-teal-400">Good (670-739)</span>
                <span className="text-emerald-400">Excellent (740-850)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Credit History (Years)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="40"
                  step="0.5"
                  value={profile.creditHistoryLengthYears}
                  onChange={(e) => handleFieldChange('creditHistoryLengthYears', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Total Revolving Balance
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={profile.revolvingBalance}
                    onChange={(e) => handleFieldChange('revolvingBalance', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg pl-6 pr-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Total Credit Limit
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-500">$</span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={profile.totalCreditLimit}
                    onChange={(e) => handleFieldChange('totalCreditLimit', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg pl-6 pr-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Delinquencies (Last 24m)
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  value={profile.delinquenciesLast2Years}
                  onChange={(e) => handleFieldChange('delinquenciesLast2Years', Number(e.target.value))}
                  className={`w-full bg-slate-950 border text-xs rounded-lg px-3 py-2 font-mono ${
                    profile.delinquenciesLast2Years > 0
                      ? 'border-rose-500 text-rose-300'
                      : 'border-slate-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Derogatory Marks
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={profile.derogatoryRecords}
                  onChange={(e) => handleFieldChange('derogatoryRecords', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Inquiries (Last 6m)
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={profile.inquiriesLast6Months}
                  onChange={(e) => handleFieldChange('inquiriesLast6Months', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financial Capacity & Income */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                3. Financial Capacity &amp; Cash Flow
              </h4>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {formatCurrency(profile.annualIncome)}/yr
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Annual Gross Income ($)
                </label>
                <input
                  type="number"
                  min="5000"
                  step="1000"
                  value={profile.annualIncome}
                  onChange={(e) => handleFieldChange('annualIncome', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Monthly Gross: {formatCurrency(profile.annualIncome / 12)}
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Existing Monthly Debt Obligations ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={profile.monthlyDebt}
                  onChange={(e) => handleFieldChange('monthlyDebt', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Mortgage, rent, auto loans, credit card minimums
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Liquid Cash Reserves &amp; Savings ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={profile.liquidSavings}
                  onChange={(e) => handleFieldChange('liquidSavings', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Total Net Worth / Assets ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="2000"
                  value={profile.totalAssets}
                  onChange={(e) => handleFieldChange('totalAssets', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Employment & Demographics */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                4. Employment &amp; Demographics
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Applicant Name
                </label>
                <input
                  type="text"
                  value={profile.applicantName}
                  onChange={(e) => handleFieldChange('applicantName', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Employment Status
                </label>
                <select
                  value={profile.employmentStatus}
                  onChange={(e) => handleFieldChange('employmentStatus', e.target.value as EmploymentStatus)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white"
                >
                  <option value="employed_full_time">Employed Full-Time</option>
                  <option value="employed_part_time">Employed Part-Time</option>
                  <option value="self_employed">Self-Employed / Business</option>
                  <option value="retired">Retired / Pension</option>
                  <option value="unemployed">Unemployed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Tenure at Current Job (Yrs)
                </label>
                <input
                  type="number"
                  min="0"
                  max="45"
                  step="0.5"
                  value={profile.employmentYears}
                  onChange={(e) => handleFieldChange('employmentYears', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Housing Status
                </label>
                <select
                  value={profile.housingStatus}
                  onChange={(e) => handleFieldChange('housingStatus', e.target.value as HousingStatus)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white"
                >
                  <option value="OWN">Own Home (Free &amp; Clear)</option>
                  <option value="MORTGAGE">Mortgage</option>
                  <option value="RENT">Rent</option>
                  <option value="OTHER">Other / Shared</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Education Level
                </label>
                <select
                  value={profile.education}
                  onChange={(e) => handleFieldChange('education', e.target.value as EducationLevel)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-3 py-2 text-white"
                >
                  <option value="high_school">High School / GED</option>
                  <option value="associates">Associate's Degree</option>
                  <option value="bachelors">Bachelor's Degree</option>
                  <option value="masters">Master's Degree</option>
                  <option value="doctorate">Doctorate / MD / JD</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Age &amp; Dependents
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="18"
                    max="90"
                    value={profile.age}
                    onChange={(e) => handleFieldChange('age', Number(e.target.value))}
                    placeholder="Age"
                    className="w-1/2 bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={profile.dependents}
                    onChange={(e) => handleFieldChange('dependents', Number(e.target.value))}
                    placeholder="Deps"
                    className="w-1/2 bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Columns: Live Results & Explainability (5 cols) */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-4">
          
          {/* Main Scoring Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            {/* Decision Banner */}
            <div className={`p-3.5 border-b flex items-center justify-between ${decisionHeader.bg}`}>
              <div className="flex items-center gap-2">
                {decisionHeader.icon}
                <span className="font-extrabold text-xs tracking-wide">
                  {decisionHeader.title}
                </span>
              </div>
              <span className="text-[11px] font-mono opacity-80 font-bold">
                Tier {result.riskGrade}
              </span>
            </div>

            {/* Gauge */}
            <div className="p-4 flex flex-col items-center bg-slate-950/40 border-b border-slate-800">
              <RiskGauge
                probability={result.defaultProbability}
                score={result.internalRiskScore}
                grade={result.riskGrade}
              />
              <p className="text-xs text-slate-300 text-center px-4 mt-1 italic">
                "{result.summaryNote}"
              </p>
            </div>

            {/* Key Underwriting Metrics Grid */}
            <div className="p-4 grid grid-cols-2 gap-3 border-b border-slate-800 bg-slate-900/60">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Back-end DTI</span>
                <span
                  className={`text-base font-mono font-bold ${
                    result.backEndDti > 0.43 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {formatPercent(result.backEndDti)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Ceiling benchmark: 43.0%
                </span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Recommended APR</span>
                <span className="text-base font-mono font-bold text-indigo-400">
                  {result.recommendedApr.toFixed(2)}%
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Risk-adjusted RAROC
                </span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Monthly Installment</span>
                <span className="text-base font-mono font-bold text-white">
                  {formatCurrency(result.monthlyPayment)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Total interest: {formatCurrency(result.totalInterest)}
                </span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Max Safe Loan Cap</span>
                <span className="text-base font-mono font-bold text-teal-400">
                  {formatCurrency(result.maxSafeLoanAmount)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  At 43% DTI threshold
                </span>
              </div>
            </div>

            {/* Policy Violations */}
            {result.policyRules.length > 0 && (
              <div className="p-4 border-b border-slate-800 bg-rose-950/20">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Credit Policy Exceptions ({result.policyRules.length})</span>
                </div>
                <div className="space-y-1.5">
                  {result.policyRules.map((p, idx) => (
                    <div key={idx} className="text-xs text-rose-200/80 bg-rose-950/50 p-2 rounded border border-rose-900/40">
                      <p className="font-semibold text-rose-300">{p.message}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{p.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 bg-slate-950/60 flex flex-col gap-2">
              <button
                onClick={handleAddToPortfolio}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <FileCheck className="w-4 h-4" />
                Submit Application to Active Portfolio
              </button>
            </div>
          </div>

          {/* Interactive What-If Simulation Drawer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowWhatIf(!showWhatIf)}
                className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Sliders className="w-4 h-4" />
                <span>Interactive What-If Sensitivity Simulator</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/30">
                  {showWhatIf ? 'Hide' : 'Expand'}
                </span>
              </button>
            </div>

            {showWhatIf && (
              <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Credit Score Improvement:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {whatIfFicoDelta >= 0 ? `+${whatIfFicoDelta}` : whatIfFicoDelta} pts (Now {simulatedProfile.creditScore})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="80"
                    step="5"
                    value={whatIfFicoDelta}
                    onChange={(e) => setWhatIfFicoDelta(Number(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Pay Down Revolving Debt:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      ${whatIfDebtPaydown.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={profile.revolvingBalance}
                    step="500"
                    value={whatIfDebtPaydown}
                    onChange={(e) => setWhatIfDebtPaydown(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1 text-slate-300">
                    <span>Annual Income Increase:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      +${whatIfIncomeDelta.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="40000"
                    step="2000"
                    value={whatIfIncomeDelta}
                    onChange={(e) => setWhatIfIncomeDelta(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                {/* Simulation Delta Card */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Baseline Default Probability:</span>
                    <span className="font-bold text-white">{(result.defaultProbability * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Simulated Default Probability:</span>
                    <span className="font-bold text-emerald-400">{(simulatedResult.defaultProbability * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-300">
                    <span>Projected Risk Grade:</span>
                    <span className="font-bold text-white">
                      Grade {result.riskGrade} &rarr; Grade {simulatedResult.riskGrade}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Recommended APR Impact:</span>
                    <span className="font-bold text-indigo-400">
                      {result.recommendedApr.toFixed(2)}% &rarr; {simulatedResult.recommendedApr.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Explainability Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <FactorChart factors={result.factorContributions} />
          </div>

        </div>

      </div>
    </div>
  );
};
