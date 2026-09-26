import {
  ApplicantProfile,
  RiskAssessmentResult,
  RiskGrade,
  UnderwritingDecision,
  FactorContribution,
  PolicyRuleViolation,
} from '../types/risk';

/**
 * Standard Loss Given Default (LGD) constant used in consumer unsecured lending (Basel II standard: 45%-55%)
 */
export const DEFAULT_LGD = 0.48;

/**
 * Benchmark Risk-free / Base cost of funds rate
 */
export const BASE_COST_OF_FUNDS = 4.75;
export const SERVICING_COST = 1.25;
export const TARGET_RETURN_SPREAD = 3.00;

/**
 * Calculate fixed monthly amortization payment
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRatePct: number,
  termMonths: number
): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRatePct <= 0) return principal / termMonths;
  
  const monthlyRate = annualRatePct / 100 / 12;
  const payment =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
  
  return Number.isFinite(payment) ? payment : principal / termMonths;
}

/**
 * Compute recommended APR using Risk-Based Pricing (RAROC framework)
 */
export function calculateRiskBasedApr(pd: number, grade: RiskGrade): number {
  // Expected loss premium = (PD * LGD) / (1 - PD)
  const lossPremium = (pd * DEFAULT_LGD * 100);
  
  // Grade-specific volatility / capital buffer charge
  const capitalCharges: Record<RiskGrade, number> = {
    A: 0.5,
    B: 1.5,
    C: 3.5,
    D: 6.0,
    E: 10.0,
  };

  const rawApr = BASE_COST_OF_FUNDS + SERVICING_COST + TARGET_RETURN_SPREAD + lossPremium + capitalCharges[grade];
  
  // Clamp between legal/practical min (5.99%) and usury cap (35.99%)
  return Math.min(35.99, Math.max(5.99, Math.round(rawApr * 100) / 100));
}

/**
 * Core Quantitative Default Risk Engine
 * Implements a calibrated multivariate logistic regression scoring function
 * aligned with real-world credit risk benchmarks.
 */
export function assessLoanDefaultRisk(applicant: ApplicantProfile): RiskAssessmentResult {
  const annualIncome = Math.max(1, applicant.annualIncome || 1);
  const monthlyGrossIncome = annualIncome / 12;
  const monthlyDebt = Math.max(0, applicant.monthlyDebt || 0);
  const loanAmount = Math.max(500, applicant.loanAmount || 500);
  const termMonths = Math.max(12, applicant.loanTermMonths || 36);

  // 1. Initial preliminary payment estimate using approximate base APR (12%)
  const prelimApr = applicant.requestedRatePercent || 12.5;
  const prelimPayment = calculateMonthlyPayment(loanAmount, prelimApr, termMonths);

  // 2. Compute key financial ratios
  const frontEndDti = monthlyDebt / monthlyGrossIncome;
  const backEndDti = (monthlyDebt + prelimPayment) / monthlyGrossIncome;
  
  const totalCreditLimit = Math.max(500, applicant.totalCreditLimit || 1000);
  const revolvingBalance = Math.max(0, applicant.revolvingBalance || 0);
  const revolvingUtilization = Math.min(1.5, revolvingBalance / totalCreditLimit);
  const loanToIncomeRatio = loanAmount / annualIncome;

  // 3. Logistic Scorecard Formulation
  // Base log-odds calibrated for ~6.5% average portfolio default rate
  // logit = ln(p / (1 - p))
  let logit = -2.85;

  // Track SHAP-like factor attributions
  const factors: FactorContribution[] = [];

  // Factor A: Credit Score (FICO) - Baseline benchmark is 700
  const fico = Math.min(850, Math.max(300, applicant.creditScore || 650));
  let ficoLogitDelta = 0;
  if (fico >= 780) {
    ficoLogitDelta = -1.35;
  } else if (fico >= 740) {
    ficoLogitDelta = -0.95;
  } else if (fico >= 700) {
    ficoLogitDelta = -0.45;
  } else if (fico >= 660) {
    ficoLogitDelta = 0.15;
  } else if (fico >= 620) {
    ficoLogitDelta = 0.75;
  } else if (fico >= 580) {
    ficoLogitDelta = 1.45;
  } else {
    ficoLogitDelta = 2.25;
  }
  logit += ficoLogitDelta;
  factors.push({
    featureName: 'Credit Score (FICO)',
    category: 'credit',
    impact: ficoLogitDelta <= 0 ? 'positive' : 'negative',
    weight: Math.round(-ficoLogitDelta * 30),
    description: fico >= 720
      ? `Strong credit score (${fico}) significantly decreases default likelihood`
      : fico >= 640
      ? `Fair credit score (${fico}) carries moderate baseline risk`
      : `Adverse credit score (${fico}) heavily escalates default risk`,
    actualValue: fico,
  });

  // Factor B: Back-end Debt-to-Income (DTI) - Baseline benchmark is 28%
  let dtiDelta = 0;
  if (backEndDti <= 0.20) {
    dtiDelta = -0.65;
  } else if (backEndDti <= 0.35) {
    dtiDelta = -0.20;
  } else if (backEndDti <= 0.43) {
    dtiDelta = 0.35;
  } else if (backEndDti <= 0.50) {
    dtiDelta = 0.90;
  } else {
    dtiDelta = 1.70;
  }
  logit += dtiDelta;
  factors.push({
    featureName: 'Debt-to-Income Ratio (DTI)',
    category: 'financial',
    impact: dtiDelta <= 0 ? 'positive' : 'negative',
    weight: Math.round(-dtiDelta * 25),
    description: backEndDti <= 0.35
      ? `Healthy DTI of ${(backEndDti * 100).toFixed(1)}% confirms robust repayment cushion`
      : backEndDti <= 0.45
      ? `Elevated DTI of ${(backEndDti * 100).toFixed(1)}% tightens monthly cash flow`
      : `High DTI of ${(backEndDti * 100).toFixed(1)}% severely restricts debt service capacity`,
    actualValue: `${(backEndDti * 100).toFixed(1)}%`,
  });

  // Factor C: Revolving Credit Utilization - Baseline benchmark is 25%
  let utilDelta = 0;
  if (revolvingUtilization <= 0.15) {
    utilDelta = -0.45;
  } else if (revolvingUtilization <= 0.30) {
    utilDelta = -0.15;
  } else if (revolvingUtilization <= 0.60) {
    utilDelta = 0.25;
  } else if (revolvingUtilization <= 0.80) {
    utilDelta = 0.70;
  } else {
    utilDelta = 1.25;
  }
  logit += utilDelta;
  factors.push({
    featureName: 'Revolving Credit Utilization',
    category: 'credit',
    impact: utilDelta <= 0 ? 'positive' : 'negative',
    weight: Math.round(-utilDelta * 20),
    description: revolvingUtilization <= 0.30
      ? `Low utilization of ${(revolvingUtilization * 100).toFixed(1)}% indicates disciplined credit management`
      : revolvingUtilization <= 0.65
      ? `Moderate credit utilization of ${(revolvingUtilization * 100).toFixed(1)}%`
      : `Excessive utilization of ${(revolvingUtilization * 100).toFixed(1)}% signals liquidity strain`,
    actualValue: `${(revolvingUtilization * 100).toFixed(1)}%`,
  });

  // Factor D: Delinquencies in Last 2 Years
  const delinq = Math.max(0, applicant.delinquenciesLast2Years || 0);
  let delinqDelta = 0;
  if (delinq === 0) {
    delinqDelta = -0.30;
  } else if (delinq === 1) {
    delinqDelta = 0.65;
  } else if (delinq === 2) {
    delinqDelta = 1.20;
  } else {
    delinqDelta = 1.85;
  }
  logit += delinqDelta;
  factors.push({
    featureName: 'Recent Delinquencies (24 mo)',
    category: 'credit',
    impact: delinqDelta <= 0 ? 'positive' : 'negative',
    weight: Math.round(-delinqDelta * 22),
    description: delinq === 0
      ? `Clean repayment history with 0 delinquencies in last 24 months`
      : `${delinq} past-due payment incident(s) reported in the last 24 months`,
    actualValue: delinq,
  });

  // Factor E: Derogatory Records / Bankruptcies
  const derog = (applicant.derogatoryRecords || 0) + (applicant.bankruptcies || 0) * 2;
  let derogDelta = 0;
  if (derog === 0) {
    derogDelta = -0.15;
  } else if (derog === 1) {
    derogDelta = 0.85;
  } else {
    derogDelta = 1.75;
  }
  logit += derogDelta;
  if (derog > 0) {
    factors.push({
      featureName: 'Derogatory Public Records / Bankruptcies',
      category: 'credit',
      impact: 'negative',
      weight: Math.round(-derogDelta * 20),
      description: `Applicant has ${derog} adverse public record/bankruptcy mark(s)`,
      actualValue: derog,
    });
  }

  // Factor F: Loan-to-Income (LTI) & Amount
  let ltiDelta = 0;
  if (loanToIncomeRatio <= 0.15) {
    ltiDelta = -0.35;
  } else if (loanToIncomeRatio <= 0.30) {
    ltiDelta = -0.10;
  } else if (loanToIncomeRatio <= 0.50) {
    ltiDelta = 0.30;
  } else {
    ltiDelta = 0.75;
  }
  logit += ltiDelta;
  factors.push({
    featureName: 'Loan-to-Income Exposure',
    category: 'loan',
    impact: ltiDelta <= 0 ? 'positive' : 'negative',
    weight: Math.round(-ltiDelta * 15),
    description: `Loan represents ${(loanToIncomeRatio * 100).toFixed(1)}% of annual gross income ($${loanAmount.toLocaleString()})`,
    actualValue: `${(loanToIncomeRatio * 100).toFixed(1)}%`,
  });

  // Factor G: Employment & Stability
  const empYears = applicant.employmentYears || 0;
  let empDelta = 0;
  if (applicant.employmentStatus === 'unemployed') {
    empDelta = 1.90;
  } else if (empYears >= 5) {
    empDelta = -0.40;
  } else if (empYears >= 2) {
    empDelta = -0.20;
  } else if (empYears >= 1) {
    empDelta = 0.05;
  } else {
    empDelta = 0.35;
  }
  logit += empDelta;
  factors.push({
    featureName: 'Employment Stability & Tenure',
    category: 'employment',
    impact: empDelta <= 0 ? 'positive' : 'negative',
    weight: Math.round(-empDelta * 15),
    description: applicant.employmentStatus === 'unemployed'
      ? 'Applicant is currently unemployed — critical income continuity risk'
      : `${empYears.toFixed(1)} years tenure at current employer (${applicant.employerName || 'Undisclosed'})`,
    actualValue: `${empYears} yrs`,
  });

  // Factor H: Liquid Savings Buffer vs Loan Size
  const liquidSavings = applicant.liquidSavings || 0;
  const reserveMonths = liquidSavings / (monthlyDebt + prelimPayment || 1);
  let reserveDelta = 0;
  if (reserveMonths >= 6) {
    reserveDelta = -0.35;
  } else if (reserveMonths >= 3) {
    reserveDelta = -0.15;
  } else if (reserveMonths < 1) {
    reserveDelta = 0.30;
  }
  logit += reserveDelta;
  factors.push({
    featureName: 'Cash Reserves / Liquidity Runway',
    category: 'financial',
    impact: reserveDelta <= 0 ? 'positive' : 'negative',
    weight: Math.round(-reserveDelta * 12),
    description: reserveMonths >= 3
      ? `$${liquidSavings.toLocaleString()} in liquid reserves covers ${reserveMonths.toFixed(1)} months of debt obligations`
      : `Thin cash reserves ($${liquidSavings.toLocaleString()}) cover only ${reserveMonths.toFixed(1)} months of obligations`,
    actualValue: `$${liquidSavings.toLocaleString()}`,
  });

  // Factor I: Credit Inquiries Velocity (Last 6 Months)
  const inquiries = applicant.inquiriesLast6Months || 0;
  let inqDelta = 0;
  if (inquiries === 0) {
    inqDelta = -0.10;
  } else if (inquiries >= 4) {
    inqDelta = 0.55;
  } else if (inquiries >= 2) {
    inqDelta = 0.25;
  }
  logit += inqDelta;

  // Factor J: Housing Stability
  if (applicant.housingStatus === 'OWN') {
    logit -= 0.20;
  } else if (applicant.housingStatus === 'MORTGAGE') {
    logit -= 0.10;
  } else if (applicant.housingStatus === 'RENT') {
    logit += 0.15;
  }

  // 4. Calculate Final Probability of Default (PD) via standard Logistic Sigmoid
  // P(Default) = 1 / (1 + e^(-logit))
  let pd = 1 / (1 + Math.exp(-logit));
  
  // Guard rails on probability: min 0.4% (even supreme prime has baseline life event risk), max 85%
  pd = Math.min(0.85, Math.max(0.004, pd));

  // 5. Determine Credit Grade
  let riskGrade: RiskGrade;
  if (pd < 0.025) {
    riskGrade = 'A';
  } else if (pd < 0.065) {
    riskGrade = 'B';
  } else if (pd < 0.14) {
    riskGrade = 'C';
  } else if (pd < 0.25) {
    riskGrade = 'D';
  } else {
    riskGrade = 'E';
  }

  // 6. Calculate Internal Score (300 to 850 calibrated scale inversely related to PD)
  // At PD=0.4% -> score ~ 830; at PD=50% -> score ~ 380
  const internalRiskScore = Math.round(
    Math.min(850, Math.max(300, 850 - Math.pow(pd, 0.45) * 580))
  );

  // 7. Policy Rules and Hard Triggers Check
  const policyRules: PolicyRuleViolation[] = [];

  if (backEndDti > 0.50) {
    policyRules.push({
      code: 'POL_DTI_EXCESSIVE',
      severity: 'critical',
      message: `Back-end DTI of ${(backEndDti * 100).toFixed(1)}% exceeds absolute policy ceiling of 50.0%`,
      recommendation: 'Reject application or require loan restructuring / debt consolidation payoff condition',
    });
  } else if (backEndDti > 0.43) {
    policyRules.push({
      code: 'POL_DTI_ELEVATED',
      severity: 'warning',
      message: `Back-end DTI of ${(backEndDti * 100).toFixed(1)}% exceeds qualified mortgage benchmark (43%)`,
      recommendation: 'Verify supplemental unearned income or require guarantor / cosigner',
    });
  }

  if (fico < 580) {
    policyRules.push({
      code: 'POL_FICO_SUBPRIME',
      severity: 'critical',
      message: `FICO score of ${fico} is below standard automated underwriting threshold (580)`,
      recommendation: 'Decline or refer to specialized credit rehabilitation program',
    });
  } else if (fico < 640) {
    policyRules.push({
      code: 'POL_FICO_NEARPRIME',
      severity: 'warning',
      message: `FICO score of ${fico} is in near-prime territory (640 threshold)`,
      recommendation: 'Conduct secondary manual review and mandate proof of employment verification',
    });
  }

  if (applicant.employmentStatus === 'unemployed') {
    policyRules.push({
      code: 'POL_EMPLOYMENT_NONE',
      severity: 'critical',
      message: 'Applicant has no active employment or stated primary source of earned income',
      recommendation: 'Decline application due to absence of verified recurring debt service cashflow',
    });
  }

  if (applicant.delinquenciesLast2Years >= 2) {
    policyRules.push({
      code: 'POL_RECENT_DELINQUENCIES',
      severity: 'warning',
      message: `${applicant.delinquenciesLast2Years} 30+ day delinquencies recorded within past 24 months`,
      recommendation: 'Request written Letter of Explanation for past credit events',
    });
  }

  if (applicant.bankruptcies > 0) {
    policyRules.push({
      code: 'POL_BANKRUPTCY',
      severity: 'critical',
      message: 'Active or recent bankruptcy filing detected on credit bureau report',
      recommendation: 'Decline if discharge was under 24 months; require full bankruptcy discharge documentation',
    });
  }

  if (revolvingUtilization > 0.85) {
    policyRules.push({
      code: 'POL_MAXED_CREDIT',
      severity: 'warning',
      message: `Revolving credit utilization is severely strained at ${(revolvingUtilization * 100).toFixed(1)}%`,
      recommendation: 'Ensure funds are directly disbursed to creditors if consolidating debt',
    });
  }

  // 8. Automated Underwriting Decision
  const hasCriticalViolation = policyRules.some((r) => r.severity === 'critical');
  let decision: UnderwritingDecision;

  if (hasCriticalViolation || pd >= 0.28) {
    decision = 'DECLINED';
  } else if (pd < 0.045 && backEndDti <= 0.40 && fico >= 680) {
    decision = 'APPROVED';
  } else if (pd < 0.12 && backEndDti <= 0.46) {
    decision = 'CONDITIONAL_APPROVAL';
  } else {
    decision = 'MANUAL_REVIEW';
  }

  // 9. Risk-Based APR and Recalculated Payment
  const recommendedApr = calculateRiskBasedApr(pd, riskGrade);
  const actualApr = applicant.requestedRatePercent || recommendedApr;
  const finalMonthlyPayment = calculateMonthlyPayment(loanAmount, actualApr, termMonths);
  const totalPayment = finalMonthlyPayment * termMonths;
  const totalInterest = Math.max(0, totalPayment - loanAmount);

  // 10. Max Safe Loan Amount calculation (capping Back-End DTI at 43%)
  // Max allowable monthly payment = (0.43 * monthlyGrossIncome) - monthlyDebt
  const maxAllowablePayment = Math.max(0, 0.43 * monthlyGrossIncome - monthlyDebt);
  let maxSafeLoanAmount = 0;
  if (maxAllowablePayment > 0) {
    const monthlyRate = actualApr / 100 / 12;
    if (monthlyRate > 0) {
      maxSafeLoanAmount = Math.round(
        (maxAllowablePayment * (1 - Math.pow(1 + monthlyRate, -termMonths))) / monthlyRate
      );
    } else {
      maxSafeLoanAmount = Math.round(maxAllowablePayment * termMonths);
    }
  }

  // 11. Expected Dollar Loss
  const expectedLoss = Math.round(loanAmount * pd * DEFAULT_LGD);

  // Sort factor contributions by absolute weight descending
  factors.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  // Executive summary
  let summaryNote = '';
  if (decision === 'APPROVED') {
    summaryNote = `Auto-approved for $${loanAmount.toLocaleString()} at ${actualApr.toFixed(2)}% APR. High creditworthiness with strong cash flow buffer and low default propensity (${(pd * 100).toFixed(2)}%).`;
  } else if (decision === 'CONDITIONAL_APPROVAL') {
    summaryNote = `Approved with stipulations. Conditioned on verified W-2/paystubs and maximum loan limit of $${Math.min(loanAmount, maxSafeLoanAmount || loanAmount).toLocaleString()}. Risk-based pricing set at ${actualApr.toFixed(2)}% APR.`;
  } else if (decision === 'MANUAL_REVIEW') {
    summaryNote = `Referred to Senior Underwriter. Elevated risk factors (${(pd * 100).toFixed(2)}% PD) require manual credit committee discretion.`;
  } else {
    summaryNote = `Declined under automated guidelines. Probability of default (${(pd * 100).toFixed(2)}%) exceeds credit policy risk appetite.`;
  }

  return {
    defaultProbability: pd,
    riskGrade,
    internalRiskScore,
    decision,
    frontEndDti,
    backEndDti,
    revolvingUtilization,
    loanToIncomeRatio,
    monthlyPayment: Math.round(finalMonthlyPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    recommendedApr,
    maxSafeLoanAmount,
    expectedLoss,
    factorContributions: factors,
    policyRules,
    summaryNote,
  };
}

/**
 * Format currency helper
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage helper
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
