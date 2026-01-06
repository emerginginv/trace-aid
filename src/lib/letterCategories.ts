import { FileText, Building, Scale, Shield, Users, Sparkles } from 'lucide-react';

export type LetterCategory = 
  | 'public_records'
  | 'state_pra'
  | 'foia_federal'
  | 'nda'
  | 'correspondence'
  | 'custom_ai';

export interface LetterCategoryConfig {
  id: LetterCategory;
  name: string;
  shortName: string;
  description: string;
  icon: typeof FileText;
  tags: string[];
  color: string;
}

export const LETTER_CATEGORIES: LetterCategoryConfig[] = [
  {
    id: 'public_records',
    name: 'Public Records & FOIA Requests',
    shortName: 'Public Records',
    description: 'General template for requesting public records from government agencies',
    icon: FileText,
    tags: ['General', 'Records'],
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'state_pra',
    name: 'State Public Records Request',
    shortName: 'State PRA',
    description: 'State-specific public records act requests with proper statutory citations',
    icon: Building,
    tags: ['State-Specific'],
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'foia_federal',
    name: 'Freedom of Information Act (Federal)',
    shortName: 'FOIA Federal',
    description: 'Request federal agency records under 5 U.S.C. § 552',
    icon: Scale,
    tags: ['Federal', 'FOIA'],
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    id: 'nda',
    name: 'Non-Disclosure Agreement (NDA)',
    shortName: 'NDA',
    description: 'Confidentiality agreements for protecting sensitive information',
    icon: Shield,
    tags: ['Legal', 'Agreement'],
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'correspondence',
    name: 'Client / Attorney Correspondence',
    shortName: 'Correspondence',
    description: 'Professional letters to clients, attorneys, and other parties',
    icon: Users,
    tags: ['Communication'],
    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  },
  {
    id: 'custom_ai',
    name: 'Custom Letter (AI-Generated)',
    shortName: 'Custom AI',
    description: 'Describe your needs and let AI generate a professional letter',
    icon: Sparkles,
    tags: ['AI-Powered'],
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
];

export const US_STATES = [
  { value: 'AL', label: 'Alabama', statute: 'Ala. Code § 36-12-40' },
  { value: 'AK', label: 'Alaska', statute: 'Alaska Stat. § 40.25.110' },
  { value: 'AZ', label: 'Arizona', statute: 'Ariz. Rev. Stat. § 39-121' },
  { value: 'AR', label: 'Arkansas', statute: 'Ark. Code Ann. § 25-19-105' },
  { value: 'CA', label: 'California', statute: 'Cal. Gov. Code § 6250' },
  { value: 'CO', label: 'Colorado', statute: 'Colo. Rev. Stat. § 24-72-201' },
  { value: 'CT', label: 'Connecticut', statute: 'Conn. Gen. Stat. § 1-200' },
  { value: 'DE', label: 'Delaware', statute: '29 Del. C. § 10001' },
  { value: 'FL', label: 'Florida', statute: 'Fla. Stat. § 119.01' },
  { value: 'GA', label: 'Georgia', statute: 'O.C.G.A. § 50-18-70' },
  { value: 'HI', label: 'Hawaii', statute: 'Haw. Rev. Stat. § 92F-11' },
  { value: 'ID', label: 'Idaho', statute: 'Idaho Code § 74-101' },
  { value: 'IL', label: 'Illinois', statute: '5 ILCS 140/1' },
  { value: 'IN', label: 'Indiana', statute: 'Ind. Code § 5-14-3-1' },
  { value: 'IA', label: 'Iowa', statute: 'Iowa Code § 22.1' },
  { value: 'KS', label: 'Kansas', statute: 'K.S.A. § 45-215' },
  { value: 'KY', label: 'Kentucky', statute: 'KRS § 61.870' },
  { value: 'LA', label: 'Louisiana', statute: 'La. R.S. § 44:1' },
  { value: 'ME', label: 'Maine', statute: '1 M.R.S. § 400' },
  { value: 'MD', label: 'Maryland', statute: 'Md. Code, Gen. Prov. § 4-101' },
  { value: 'MA', label: 'Massachusetts', statute: 'M.G.L. c. 66 § 10' },
  { value: 'MI', label: 'Michigan', statute: 'MCL § 15.231' },
  { value: 'MN', label: 'Minnesota', statute: 'Minn. Stat. § 13.01' },
  { value: 'MS', label: 'Mississippi', statute: 'Miss. Code Ann. § 25-61-1' },
  { value: 'MO', label: 'Missouri', statute: 'Mo. Rev. Stat. § 610.010' },
  { value: 'MT', label: 'Montana', statute: 'Mont. Code Ann. § 2-6-101' },
  { value: 'NE', label: 'Nebraska', statute: 'Neb. Rev. Stat. § 84-712' },
  { value: 'NV', label: 'Nevada', statute: 'Nev. Rev. Stat. § 239.005' },
  { value: 'NH', label: 'New Hampshire', statute: 'RSA § 91-A:1' },
  { value: 'NJ', label: 'New Jersey', statute: 'N.J.S.A. § 47:1A-1' },
  { value: 'NM', label: 'New Mexico', statute: 'NMSA § 14-2-1' },
  { value: 'NY', label: 'New York', statute: 'N.Y. Pub. Off. Law § 84' },
  { value: 'NC', label: 'North Carolina', statute: 'N.C. Gen. Stat. § 132-1' },
  { value: 'ND', label: 'North Dakota', statute: 'N.D. Cent. Code § 44-04-18' },
  { value: 'OH', label: 'Ohio', statute: 'Ohio Rev. Code § 149.43' },
  { value: 'OK', label: 'Oklahoma', statute: '51 O.S. § 24A.1' },
  { value: 'OR', label: 'Oregon', statute: 'ORS § 192.311' },
  { value: 'PA', label: 'Pennsylvania', statute: '65 P.S. § 67.101' },
  { value: 'RI', label: 'Rhode Island', statute: 'R.I. Gen. Laws § 38-2-1' },
  { value: 'SC', label: 'South Carolina', statute: 'S.C. Code Ann. § 30-4-10' },
  { value: 'SD', label: 'South Dakota', statute: 'SDCL § 1-27-1' },
  { value: 'TN', label: 'Tennessee', statute: 'Tenn. Code Ann. § 10-7-503' },
  { value: 'TX', label: 'Texas', statute: 'Tex. Gov. Code § 552.001' },
  { value: 'UT', label: 'Utah', statute: 'Utah Code § 63G-2-101' },
  { value: 'VT', label: 'Vermont', statute: '1 V.S.A. § 315' },
  { value: 'VA', label: 'Virginia', statute: 'Va. Code § 2.2-3700' },
  { value: 'WA', label: 'Washington', statute: 'RCW § 42.56.001' },
  { value: 'WV', label: 'West Virginia', statute: 'W. Va. Code § 29B-1-1' },
  { value: 'WI', label: 'Wisconsin', statute: 'Wis. Stat. § 19.31' },
  { value: 'WY', label: 'Wyoming', statute: 'Wyo. Stat. § 16-4-201' },
  { value: 'DC', label: 'District of Columbia', statute: 'D.C. Code § 2-531' },
];

export const FEDERAL_AGENCIES = [
  'Department of Justice (DOJ)',
  'Department of Homeland Security (DHS)',
  'Federal Bureau of Investigation (FBI)',
  'Central Intelligence Agency (CIA)',
  'Department of Defense (DOD)',
  'Department of State',
  'Department of the Treasury',
  'Department of Health and Human Services (HHS)',
  'Environmental Protection Agency (EPA)',
  'Securities and Exchange Commission (SEC)',
  'Federal Trade Commission (FTC)',
  'Social Security Administration (SSA)',
  'Department of Veterans Affairs (VA)',
  'Department of Labor',
  'Department of Education',
  'Department of Transportation (DOT)',
  'Department of Energy (DOE)',
  'Department of Agriculture (USDA)',
  'Department of Commerce',
  'Department of the Interior',
  'Department of Housing and Urban Development (HUD)',
  'Other Federal Agency',
];

export const NDA_TYPES = [
  { value: 'unilateral', label: 'Unilateral (One-Way)', description: 'One party discloses, the other receives' },
  { value: 'mutual', label: 'Mutual (Two-Way)', description: 'Both parties share confidential information' },
];

export const CORRESPONDENCE_TYPES = [
  { value: 'client', label: 'Client' },
  { value: 'attorney', label: 'Attorney' },
  { value: 'insurance', label: 'Insurance Company' },
  { value: 'government', label: 'Government Agency' },
  { value: 'other', label: 'Other' },
];

export const LETTER_TONES = [
  { value: 'formal', label: 'Formal', description: 'Professional and business-like' },
  { value: 'professional', label: 'Professional', description: 'Courteous but direct' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'urgent', label: 'Urgent', description: 'Time-sensitive and action-oriented' },
];

export function getCategoryConfig(category: LetterCategory): LetterCategoryConfig | undefined {
  return LETTER_CATEGORIES.find(c => c.id === category);
}

export function getStateInfo(stateCode: string) {
  return US_STATES.find(s => s.value === stateCode);
}
