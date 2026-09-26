export type LoanPurpose =
  | 'debt_consolidation'
  | 'credit_card_refinance'
  | 'home_improvement'
  | 'small_business'
  | 'auto_purchase'
  | 'medical_expense'
  | 'major_purchase'
  | 'education'
  | 'other';

export type HousingStatus = 'OWN' | 'MORTGAGE' | 'RENT' | 'OTHER';

export type EmploymentStatus =
  | 'employed_full_time'
  | 'employed_part_time'
  | 'self_employed'
  | 'unemployed'
  | 'retired';

export type EducationLevel =
  | 'high_school'
  | 'associates'
  | 'bachelors'
  | 'masters'
  | 'doctorate'
  | 'other';

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type UnderwritingDecision =
  | 'APPROVED'
  | 'CONDITIONAL_APPROVAL'
  | 'MANUAL_REVIEW'
  | 'DECLINED';

export type ApplicationStatus =
  | 'pending'
  | 'approved'
  | 'conditional'
  | 'in_review'
  | 'declined'
  | 'funded';

export interface ApplicantProfile {
  id: string;
  applicantName: string;
  email: string;
  phone: string;
  age: number;
  education: EducationLevel;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dependents: number;
  housingStatus: HousingStatus;
  
  // Employment
  employmentStatus: EmploymentStatus;
  jobTitle: string;
  employerName: string;
  employmentYears: number;
  industry: string;

  // Financials
  annualIncome: number;
  monthlyDebt: number; // existing monthly debt obligations
  liquidSavings: number;
  totalAssets: number;

  // Credit Bureau Record
  creditScore: number; // FICO 300 - 850
  creditHistoryLengthYears: number;
  openCreditLines: number;
  totalCreditLimit: number;
  revolvingBalance: number;
  delinquenciesLast2Years: number;
  derogatoryRecords: number;
  inquiriesLast6Months: number;
  bankruptcies: number;

  // Loan Request
  loanAmount: number;
  loanPurpose: LoanPurpose;
  loanTermMonths: number; // 12, 24, 36, 48, 60, 84
  requestedRatePercent?: number;

  // Metadata
  applicationDate: string;
  status: ApplicationStatus;
  underwriterNotes?: string;
}

export interface FactorContribution {
  featureName: string;
  category: 'credit' | 'financial' | 'employment' | 'loan';
  impact: 'positive' | 'negative' | 'neutral';
  weight: number; // -1 to +1 scale
  description: string;
  actualValue: string | number;
}

export interface PolicyRuleViolation {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  recommendation: string;
}

export interface RiskAssessmentResult {
  defaultProbability: number; // 0.0 - 1.0 (e.g. 0.045 = 4.5%)
  riskGrade: RiskGrade;
  internalRiskScore: number; // 300 - 850 calibrated
  decision: UnderwritingDecision;
  
  // Financial Ratios
  frontEndDti: number; // Existing debt / Monthly Gross
  backEndDti: number;  // (Existing debt + New Loan Payment) / Monthly Gross
  revolvingUtilization: number; // revolvingBalance / totalCreditLimit
  loanToIncomeRatio: number;   // loanAmount / annualIncome
  
  // Loan Financials
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  recommendedApr: number; // Risk-based pricing
  maxSafeLoanAmount: number; // Amount that caps Back-End DTI at 43%
  expectedLoss: number; // Expected dollar loss = PD * LGD * LoanAmount (LGD ~ 48%)
  
  // Explainability & Rules
  factorContributions: FactorContribution[];
  policyRules: PolicyRuleViolation[];
  summaryNote: string;
}

export interface PortfolioMetrics {
  totalLoanVolume: number;
  activeLoanCount: number;
  weightedAvgPd: number;
  expectedTotalLoss: number;
  portfolioLossRate: number;
  gradeDistribution: Record<RiskGrade, { count: number; volume: number; avgPd: number }>;
  purposeDistribution: Record<string, { count: number; volume: number; avgPd: number }>;
  nonPerformingRatio: number;
  regulatoryCapitalReserve: number;
}

export interface StressScenario {
  id: string;
  name: string;
  description: string;
  unemploymentShift: number; // e.g. +3.5%
  rateHikeBps: number; // e.g. +250 bps
  gdpContraction: number; // e.g. -2.0%
  inflationShock: number; // e.g. +4.0%
}
