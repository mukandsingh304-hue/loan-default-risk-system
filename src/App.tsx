import React, { useState } from 'react';
import { ApplicantProfile } from './types/risk';
import { INITIAL_PORTFOLIO_APPLICANTS } from './data/mockApplicants';
import { Navbar, NavTab } from './components/Navbar';
import { RiskEvaluator } from './components/RiskEvaluator';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import { ApplicationsQueue } from './components/ApplicationsQueue';
import { BatchAssessment } from './components/BatchAssessment';
import { PricingCalculator } from './components/PricingCalculator';
import { AuditModal } from './components/AuditModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('evaluator');
  const [portfolio, setPortfolio] = useState<ApplicantProfile[]>(INITIAL_PORTFOLIO_APPLICANTS);
  const [auditApplicant, setAuditApplicant] = useState<ApplicantProfile | null>(null);

  const handleAddApplicantToPortfolio = (applicant: ApplicantProfile) => {
    setPortfolio((prev) => [applicant, ...prev]);
  };

  const handleUpdateApplicant = (updated: ApplicantProfile) => {
    setPortfolio((prev) =>
      prev.map((app) => (app.id === updated.id ? updated : app))
    );
    if (auditApplicant?.id === updated.id) {
      setAuditApplicant(updated);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        portfolioCount={portfolio.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'evaluator' && (
          <RiskEvaluator
            onAddApplicantToPortfolio={handleAddApplicantToPortfolio}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioDashboard
            portfolio={portfolio}
            onSelectApplicant={(app) => setAuditApplicant(app)}
          />
        )}

        {activeTab === 'queue' && (
          <ApplicationsQueue
            applicants={portfolio}
            onUpdateApplicant={handleUpdateApplicant}
            onOpenNewApplication={() => setActiveTab('evaluator')}
          />
        )}

        {activeTab === 'batch' && <BatchAssessment />}

        {activeTab === 'pricing' && <PricingCalculator />}
      </main>

      {/* Audit Modal if triggered from Portfolio or elsewhere */}
      {auditApplicant && (
        <AuditModal
          applicant={auditApplicant}
          isOpen={true}
          onClose={() => setAuditApplicant(null)}
          onUpdateApplicant={handleUpdateApplicant}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-400">Loan Default Risk Assessment System</span>
            <span>•</span>
            <span>IRB / Basel III Capital Compliance</span>
            <span>•</span>
            <span>FCRA / ECOA Model Governance</span>
          </div>
          <div className="font-mono text-[11px] text-slate-600">
            Engine: LogisticScorecard-v3.4.1 [Calibrated on Benchmark Portfolios]
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
