import React, { useState } from 'react';
import { ApplicantProfile, ApplicationStatus, RiskGrade } from '../types/risk';
import { assessLoanDefaultRisk, formatCurrency, formatPercent } from '../utils/riskEngine';
import { AuditModal } from './AuditModal';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface ApplicationsQueueProps {
  applicants: ApplicantProfile[];
  onUpdateApplicant: (updated: ApplicantProfile) => void;
  onOpenNewApplication: () => void;
}

export const ApplicationsQueue: React.FC<ApplicationsQueueProps> = ({
  applicants,
  onUpdateApplicant,
  onOpenNewApplication,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantProfile | null>(null);

  // Compute assessments for all applicants
  const processedApplicants = applicants.map((app) => ({
    applicant: app,
    result: assessLoanDefaultRisk(app),
  }));

  // Filtering
  const filtered = processedApplicants.filter(({ applicant, result }) => {
    // Search
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      applicant.applicantName.toLowerCase().includes(term) ||
      applicant.id.toLowerCase().includes(term) ||
      applicant.employerName.toLowerCase().includes(term) ||
      applicant.loanPurpose.toLowerCase().includes(term);

    // Status
    const matchesStatus =
      statusFilter === 'all' || applicant.status === statusFilter;

    // Grade
    const matchesGrade =
      gradeFilter === 'all' || result.riskGrade === gradeFilter;

    return matchesSearch && matchesStatus && matchesGrade;
  });

  // Batch action: Approve all Grade A & B that are currently pending or in_review
  const handleBatchApprovePrime = () => {
    processedApplicants.forEach(({ applicant, result }) => {
      if (
        (result.riskGrade === 'A' || result.riskGrade === 'B') &&
        (applicant.status === 'pending' || applicant.status === 'in_review')
      ) {
        onUpdateApplicant({
          ...applicant,
          status: 'approved',
          underwriterNotes: 'Batch approved under Prime automated underwriting policy.',
        });
      }
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'ApplicationID',
      'ApplicantName',
      'FICO',
      'AnnualIncome',
      'LoanAmount',
      'LoanPurpose',
      'TermMonths',
      'BackEndDTI',
      'DefaultProbability',
      'RiskGrade',
      'RecommendedAPR',
      'Status',
    ];

    const rows = processedApplicants.map(({ applicant, result }) => [
      applicant.id,
      `"${applicant.applicantName}"`,
      applicant.creditScore,
      applicant.annualIncome,
      applicant.loanAmount,
      applicant.loanPurpose,
      applicant.loanTermMonths,
      (result.backEndDti * 100).toFixed(1) + '%',
      (result.defaultProbability * 100).toFixed(2) + '%',
      result.riskGrade,
      result.recommendedApr.toFixed(2) + '%',
      applicant.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Loan_Risk_Portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'approved':
      case 'funded':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {status.toUpperCase()}
          </span>
        );
      case 'conditional':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> CONDITIONAL
          </span>
        );
      case 'in_review':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> IN REVIEW
          </span>
        );
      case 'declined':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> DECLINED
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
    }
  };

  const getGradePill = (grade: RiskGrade) => {
    const colors: Record<RiskGrade, string> = {
      A: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      B: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      C: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      D: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      E: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${colors[grade]}`}>
        Grade {grade}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, employer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="conditional">Conditional</option>
            <option value="declined">Declined</option>
            <option value="funded">Funded</option>
          </select>

          {/* Grade Filter */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-slate-200"
          >
            <option value="all">All Risk Grades</option>
            <option value="A">Grade A (Prime+)</option>
            <option value="B">Grade B (Prime)</option>
            <option value="C">Grade C (Near-Prime)</option>
            <option value="D">Grade D (Subprime)</option>
            <option value="E">Grade E (Critical)</option>
          </select>

          {/* Batch Approve Prime */}
          <button
            onClick={handleBatchApprovePrime}
            title="Auto-approve all Grade A & B pending applications"
            className="px-3 py-2 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Batch Pass Prime
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {/* New App Button */}
          <button
            onClick={onOpenNewApplication}
            className="px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Assessment
          </button>
        </div>

      </div>

      {/* Applications Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Applicant &amp; Facility</th>
                <th className="py-3 px-3">Credit Profile</th>
                <th className="py-3 px-3">Loan Request</th>
                <th className="py-3 px-3">Back DTI</th>
                <th className="py-3 px-3">Default Risk (PD)</th>
                <th className="py-3 px-3">Risk Tier</th>
                <th className="py-3 px-3">Rec. APR</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(({ applicant, result }) => (
                <tr
                  key={applicant.id}
                  className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedApplicant(applicant)}
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-xs">
                        {applicant.applicantName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {applicant.jobTitle} • {applicant.employerName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {applicant.id}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono">
                    <span className="font-bold text-slate-200">
                      {applicant.creditScore} FICO
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {applicant.delinquenciesLast2Years} Delinq. (24m)
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono">
                    <span className="font-bold text-white block">
                      {formatCurrency(applicant.loanAmount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans capitalize">
                      {applicant.loanPurpose.replace('_', ' ')} • {applicant.loanTermMonths}m
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono">
                    <span
                      className={`font-semibold ${
                        result.backEndDti > 0.43 ? 'text-rose-400' : 'text-slate-200'
                      }`}
                    >
                      {formatPercent(result.backEndDti)}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono">
                    <span
                      className={`font-bold ${
                        result.defaultProbability < 0.05
                          ? 'text-emerald-400'
                          : result.defaultProbability < 0.12
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(result.defaultProbability, 2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Loss: {formatCurrency(result.expectedLoss)}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    {getGradePill(result.riskGrade)}
                  </td>

                  <td className="py-3 px-3 font-mono text-indigo-400 font-semibold">
                    {result.recommendedApr.toFixed(2)}%
                  </td>

                  <td className="py-3 px-3">
                    {getStatusBadge(applicant.status)}
                  </td>

                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedApplicant(applicant)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Audit Credit Memo"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {applicant.status !== 'approved' && (
                        <button
                          onClick={() =>
                            onUpdateApplicant({
                              ...applicant,
                              status: 'approved',
                              underwriterNotes: 'Fast-track approved by Underwriter.',
                            })
                          }
                          className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-colors"
                          title="Quick Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {applicant.status !== 'declined' && (
                        <button
                          onClick={() =>
                            onUpdateApplicant({
                              ...applicant,
                              status: 'declined',
                              underwriterNotes: 'Declined under secondary underwriting review.',
                            })
                          }
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                          title="Quick Decline"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-xs">
            No loan applications found matching the selected filters.
          </div>
        )}
      </div>

      {/* Selected Applicant Audit Modal */}
      {selectedApplicant && (
        <AuditModal
          applicant={selectedApplicant}
          isOpen={true}
          onClose={() => setSelectedApplicant(null)}
          onUpdateApplicant={onUpdateApplicant}
        />
      )}
    </div>
  );
};
