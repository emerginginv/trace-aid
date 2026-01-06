// Comprehensive FOIA and State Public Records Act statutory information

export interface FeeStructure {
  searchFee: string;
  duplicationFee: string;
  reviewFee: string;
  freePages: number;
}

export interface JurisdictionInfo {
  code: string;
  name: string;
  statute: string;
  statuteName: string;
  responseDeadline: string;
  responseDeadlineDays: number;
  feeWaiverProvision: string;
  expeditedProvision: string;
  // Enhanced fields
  appealProvision: string;
  appealDeadline: string;
  appealBody: string;
  feeStructure: FeeStructure;
  exemptions: string[];
  legalLanguage: {
    opening: string;
    closing: string;
    feeWaiver: string;
    expedited: string;
    appeal: string;
    feeNotice: string;
  };
}

export const FEDERAL_FOIA: JurisdictionInfo = {
  code: 'federal',
  name: 'Federal (FOIA)',
  statute: '5 U.S.C. § 552',
  statuteName: 'Freedom of Information Act',
  responseDeadline: '20 business days',
  responseDeadlineDays: 20,
  feeWaiverProvision: '5 U.S.C. § 552(a)(4)(A)(iii)',
  expeditedProvision: '5 U.S.C. § 552(a)(6)(E)',
  appealProvision: '5 U.S.C. § 552(a)(6)(A)',
  appealDeadline: '90 days',
  appealBody: 'Agency FOIA Appeals Office or Office of Government Information Services (OGIS)',
  feeStructure: {
    searchFee: '$25-$50 per hour',
    duplicationFee: '$0.10-$0.25 per page',
    reviewFee: 'Commercial requesters only',
    freePages: 100
  },
  exemptions: [
    'National security (Exemption 1)',
    'Internal agency rules (Exemption 2)',
    'Statutory exemptions (Exemption 3)',
    'Trade secrets (Exemption 4)',
    'Privileged communications (Exemption 5)',
    'Personal privacy (Exemption 6)',
    'Law enforcement (Exemption 7)',
    'Financial institutions (Exemption 8)',
    'Geological data (Exemption 9)'
  ],
  legalLanguage: {
    opening: 'Pursuant to the Freedom of Information Act (FOIA), 5 U.S.C. § 552, I am requesting access to and copies of',
    closing: 'As provided under 5 U.S.C. § 552(a)(6)(A), I expect a response within twenty (20) business days.',
    feeWaiver: 'I am requesting a waiver of all fees associated with this request pursuant to 5 U.S.C. § 552(a)(4)(A)(iii). Disclosure of the requested information is in the public interest because it is likely to contribute significantly to public understanding of the operations or activities of the government and is not primarily in my commercial interest.',
    expedited: 'I am requesting expedited processing of this request pursuant to 5 U.S.C. § 552(a)(6)(E). There is a compelling need for the requested records because',
    appeal: 'If this request is denied in whole or in part, I am entitled to appeal that decision to the agency\'s FOIA Appeals Office within 90 days pursuant to 5 U.S.C. § 552(a)(6)(A). I may also seek dispute resolution services from the Office of Government Information Services (OGIS).',
    feeNotice: 'I understand that fees may apply. Please notify me if the estimated costs exceed $25 before proceeding. I am willing to pay reasonable duplication fees for non-exempt records.'
  }
};

export const STATE_STATUTES: Record<string, JurisdictionInfo> = {
  AL: {
    code: 'AL',
    name: 'Alabama',
    statute: 'Ala. Code § 36-12-40',
    statuteName: 'Alabama Open Records Law',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Ala. Code § 36-12-40',
    expeditedProvision: '',
    appealProvision: 'Ala. Code § 36-12-41',
    appealDeadline: '2 years (civil action)',
    appealBody: 'Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Law enforcement records',
      'Medical records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Alabama Open Records Law, Ala. Code § 36-12-40, I am requesting access to and copies of',
      closing: 'I expect a response within a reasonable time, as required by Alabama law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a civil action in Circuit Court within two years pursuant to Ala. Code § 36-12-41.',
      feeNotice: 'I understand duplication fees may apply at $0.25 per page. Please notify me if costs exceed $25.'
    }
  },
  AK: {
    code: 'AK',
    name: 'Alaska',
    statute: 'Alaska Stat. § 40.25.110',
    statuteName: 'Alaska Public Records Act',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Alaska Stat. § 40.25.110',
    expeditedProvision: '',
    appealProvision: 'Alaska Stat. § 40.25.124',
    appealDeadline: '30 days',
    appealBody: 'Superior Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Law enforcement records',
      'Medical records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Alaska Public Records Act, Alaska Stat. § 40.25.110, I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Alaska law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a civil action in Superior Court within 30 days pursuant to Alaska Stat. § 40.25.124.',
      feeNotice: 'I understand duplication fees may apply at $0.25 per page. Please notify me if costs exceed $25.'
    }
  },
  AZ: {
    code: 'AZ',
    name: 'Arizona',
    statute: 'Ariz. Rev. Stat. § 39-121',
    statuteName: 'Arizona Public Records Law',
    responseDeadline: 'Promptly',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Ariz. Rev. Stat. § 39-121.01',
    expeditedProvision: '',
    appealProvision: 'Ariz. Rev. Stat. § 39-121.02',
    appealDeadline: '35 days',
    appealBody: 'Superior Court',
    feeStructure: {
      searchFee: 'Not chargeable',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Confidential records by law',
      'Attorney-client privilege',
      'Work product'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Arizona Public Records Law, Ariz. Rev. Stat. § 39-121 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Arizona law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a special action in Superior Court within 35 days pursuant to Ariz. Rev. Stat. § 39-121.02.',
      feeNotice: 'I understand that actual duplication costs may apply. Please notify me if costs exceed $25.'
    }
  },
  AR: {
    code: 'AR',
    name: 'Arkansas',
    statute: 'Ark. Code Ann. § 25-19-105',
    statuteName: 'Arkansas Freedom of Information Act',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: 'Ark. Code Ann. § 25-19-109',
    expeditedProvision: '',
    appealProvision: 'Ark. Code Ann. § 25-19-107',
    appealDeadline: 'No specific deadline',
    appealBody: 'Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Medical records',
      'Education records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Arkansas Freedom of Information Act, Ark. Code Ann. § 25-19-105, I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Arkansas law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a petition in Circuit Court pursuant to Ark. Code Ann. § 25-19-107.',
      feeNotice: 'I understand that actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  CA: {
    code: 'CA',
    name: 'California',
    statute: 'Cal. Gov. Code §§ 6250-6270',
    statuteName: 'California Public Records Act (CPRA)',
    responseDeadline: '10 calendar days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Cal. Gov. Code § 6253(b)',
    expeditedProvision: 'Cal. Gov. Code § 6253(c)',
    appealProvision: 'Cal. Gov. Code § 6259',
    appealDeadline: '20 days',
    appealBody: 'Superior Court',
    feeStructure: {
      searchFee: 'Not chargeable',
      duplicationFee: '$0.10 per page',
      reviewFee: 'Not chargeable',
      freePages: 0
    },
    exemptions: [
      'Preliminary drafts and notes (§ 6254(a))',
      'Personnel files (§ 6254(c))',
      'Pending litigation (§ 6254(b))',
      'Law enforcement investigations (§ 6254(f))',
      'Attorney-client privilege (§ 6254(k))'
    ],
    legalLanguage: {
      opening: 'Pursuant to the California Public Records Act, Government Code Sections 6250-6270, I am requesting access to and copies of',
      closing: 'As required by Government Code Section 6253(c), I expect a determination within ten (10) calendar days.',
      feeWaiver: 'I am requesting that fees be waived or reduced pursuant to Government Code Section 6253(b) as the disclosure serves the public interest.',
      expedited: 'I am requesting expedited processing as the records are urgently needed because',
      appeal: 'If this request is denied, I may petition for relief in Superior Court within 20 days pursuant to Government Code Section 6259.',
      feeNotice: 'I understand duplication fees of $0.10 per page may apply. Please contact me if estimated costs exceed $25.'
    }
  },
  CO: {
    code: 'CO',
    name: 'Colorado',
    statute: 'Colo. Rev. Stat. § 24-72-201',
    statuteName: 'Colorado Open Records Act (CORA)',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: 'Colo. Rev. Stat. § 24-72-205',
    expeditedProvision: '',
    appealProvision: 'Colo. Rev. Stat. § 24-72-204',
    appealDeadline: '21 days',
    appealBody: 'District Court',
    feeStructure: {
      searchFee: '$30 per hour (after first hour)',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel files',
      'Trade secrets',
      'Law enforcement investigations'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Colorado Open Records Act, C.R.S. § 24-72-201 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Colorado law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may seek review in District Court within 21 days pursuant to C.R.S. § 24-72-204.',
      feeNotice: 'I understand fees may apply at $0.25 per page plus $30/hour for search time after the first hour. Please notify me if costs exceed $25.'
    }
  },
  CT: {
    code: 'CT',
    name: 'Connecticut',
    statute: 'Conn. Gen. Stat. § 1-200',
    statuteName: 'Connecticut Freedom of Information Act',
    responseDeadline: '4 business days',
    responseDeadlineDays: 4,
    feeWaiverProvision: 'Conn. Gen. Stat. § 1-212',
    expeditedProvision: '',
    appealProvision: 'Conn. Gen. Stat. § 1-206',
    appealDeadline: '30 days',
    appealBody: 'Freedom of Information Commission',
    feeStructure: {
      searchFee: 'Not chargeable',
      duplicationFee: '$0.50 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Preliminary drafts',
      'Personnel files',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Connecticut Freedom of Information Act, Conn. Gen. Stat. § 1-200 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within four (4) business days as required by Connecticut law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may appeal to the Freedom of Information Commission within 30 days pursuant to Conn. Gen. Stat. § 1-206.',
      feeNotice: 'I understand duplication fees of $0.50 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  DE: {
    code: 'DE',
    name: 'Delaware',
    statute: '29 Del. Code § 10003',
    statuteName: 'Delaware Freedom of Information Act',
    responseDeadline: '15 business days',
    responseDeadlineDays: 15,
    feeWaiverProvision: '29 Del. Code § 10003',
    expeditedProvision: '',
    appealProvision: '29 Del. Code § 10005',
    appealDeadline: '60 days',
    appealBody: 'Superior Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.10 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel files',
      'Trade secrets',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Delaware Freedom of Information Act, 29 Del. Code § 10003, I am requesting access to and copies of',
      closing: 'I expect a response within fifteen (15) business days as required by Delaware law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a complaint in Superior Court within 60 days pursuant to 29 Del. Code § 10005.',
      feeNotice: 'I understand duplication fees of $0.10 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  DC: {
    code: 'DC',
    name: 'District of Columbia',
    statute: 'D.C. Code § 2-532',
    statuteName: 'District of Columbia Freedom of Information Act',
    responseDeadline: '15 business days',
    responseDeadlineDays: 15,
    feeWaiverProvision: 'D.C. Code § 2-532',
    expeditedProvision: 'D.C. Code § 2-532(d)',
    appealProvision: 'D.C. Code § 2-537',
    appealDeadline: '30 days',
    appealBody: 'Mayor\'s Office or Superior Court',
    feeStructure: {
      searchFee: '$15 per hour',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Trade secrets',
      'Personnel files',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the District of Columbia Freedom of Information Act, D.C. Code § 2-532, I am requesting access to and copies of',
      closing: 'I expect a response within fifteen (15) business days as required by D.C. law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: 'I am requesting expedited processing as the records are urgently needed because',
      appeal: 'If this request is denied, I may appeal to the Mayor\'s Office within 30 days or file a complaint in Superior Court pursuant to D.C. Code § 2-537.',
      feeNotice: 'I understand fees of $0.25 per page and $15/hour for search time may apply. Please notify me if costs exceed $25.'
    }
  },
  FL: {
    code: 'FL',
    name: 'Florida',
    statute: 'Fla. Stat. § 119.01',
    statuteName: 'Florida Public Records Act',
    responseDeadline: 'Promptly',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Fla. Stat. § 119.07(4)',
    expeditedProvision: '',
    appealProvision: 'Fla. Stat. § 119.11',
    appealDeadline: '30 days',
    appealBody: 'Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost of staff time',
      duplicationFee: '$0.15 per page (one-sided)',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Active criminal intelligence (§ 119.071)',
      'Social security numbers (§ 119.0721)',
      'Home addresses of law enforcement (§ 119.071(4))',
      'Trade secrets',
      'Certain personnel records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Florida Public Records Act, Chapter 119, Florida Statutes, I am requesting access to and copies of',
      closing: 'The Florida Public Records Act requires that public records be provided promptly.',
      feeWaiver: 'I request that fees be waived as the disclosure serves the public interest and is not primarily for commercial purposes.',
      expedited: '',
      appeal: 'If this request is denied, I am entitled to seek judicial review in Circuit Court within 30 days pursuant to Fla. Stat. § 119.11.',
      feeNotice: 'I understand fees for duplication may apply at the rate of $0.15 per one-sided page. Please notify me if costs exceed $25.'
    }
  },
  GA: {
    code: 'GA',
    name: 'Georgia',
    statute: 'O.C.G.A. § 50-18-70',
    statuteName: 'Georgia Open Records Act',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: 'O.C.G.A. § 50-18-71',
    expeditedProvision: '',
    appealProvision: 'O.C.G.A. § 50-18-73',
    appealDeadline: '90 days',
    appealBody: 'Superior Court or Attorney General Mediation',
    feeStructure: {
      searchFee: '$25 per hour (after first quarter hour)',
      duplicationFee: '$0.10 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Medical records',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Georgia Open Records Act, O.C.G.A. § 50-18-70 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Georgia law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a complaint in Superior Court or seek mediation through the Attorney General within 90 days pursuant to O.C.G.A. § 50-18-73.',
      feeNotice: 'I understand fees of $0.10 per page and $25/hour for search time may apply. Please notify me if costs exceed $25.'
    }
  },
  HI: {
    code: 'HI',
    name: 'Hawaii',
    statute: 'Haw. Rev. Stat. § 92F-11',
    statuteName: 'Uniform Information Practices Act (UIPA)',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Haw. Rev. Stat. § 92F-21',
    expeditedProvision: '',
    appealProvision: 'Haw. Rev. Stat. § 92F-42',
    appealDeadline: '30 days',
    appealBody: 'Office of Information Practices or Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.05 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Frustrate legitimate government function',
      'Personal privacy',
      'Business confidential'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Uniform Information Practices Act, Haw. Rev. Stat. § 92F-11, I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Hawaii law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may appeal to the Office of Information Practices within 30 days or file a complaint in Circuit Court pursuant to Haw. Rev. Stat. § 92F-42.',
      feeNotice: 'I understand duplication fees of $0.05 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  ID: {
    code: 'ID',
    name: 'Idaho',
    statute: 'Idaho Code § 74-102',
    statuteName: 'Idaho Public Records Act',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: 'Idaho Code § 74-102',
    expeditedProvision: '',
    appealProvision: 'Idaho Code § 74-115',
    appealDeadline: '180 days',
    appealBody: 'District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Trade secrets',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Idaho Public Records Act, Idaho Code § 74-102, I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Idaho law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a petition in District Court within 180 days pursuant to Idaho Code § 74-115.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  IL: {
    code: 'IL',
    name: 'Illinois',
    statute: '5 ILCS 140/1',
    statuteName: 'Illinois Freedom of Information Act',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: '5 ILCS 140/6',
    expeditedProvision: '',
    appealProvision: '5 ILCS 140/9.5',
    appealDeadline: '60 days',
    appealBody: 'Public Access Counselor or Circuit Court',
    feeStructure: {
      searchFee: 'Not chargeable (first 8 pages free)',
      duplicationFee: '$0.15 per page (black & white)',
      reviewFee: 'N/A',
      freePages: 8
    },
    exemptions: [
      'Personal information (§ 7(1)(b))',
      'Law enforcement records (§ 7(1)(d))',
      'Trade secrets (§ 7(1)(g))'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Illinois Freedom of Information Act, 5 ILCS 140/1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Illinois law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a request for review with the Public Access Counselor or the Circuit Court within 60 days pursuant to 5 ILCS 140/9.5.',
      feeNotice: 'I understand the first 8 pages are free, with charges of $0.15 per page thereafter. Please notify me if costs exceed $25.'
    }
  },
  IN: {
    code: 'IN',
    name: 'Indiana',
    statute: 'Ind. Code § 5-14-3-1',
    statuteName: 'Indiana Access to Public Records Act',
    responseDeadline: '7 calendar days',
    responseDeadlineDays: 7,
    feeWaiverProvision: 'Ind. Code § 5-14-3-8',
    expeditedProvision: '',
    appealProvision: 'Ind. Code § 5-14-5-6',
    appealDeadline: '30 days',
    appealBody: 'Public Access Counselor or Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.10 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Investigatory records (§ 5-14-3-4(b)(1))',
      'Personnel files',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Indiana Access to Public Records Act, Ind. Code § 5-14-3-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within seven (7) calendar days as required by Indiana law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a formal complaint with the Public Access Counselor within 30 days or seek judicial review pursuant to Ind. Code § 5-14-5-6.',
      feeNotice: 'I understand duplication fees of $0.10 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  IA: {
    code: 'IA',
    name: 'Iowa',
    statute: 'Iowa Code § 22.2',
    statuteName: 'Iowa Open Records Law',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Iowa Code § 22.3',
    expeditedProvision: '',
    appealProvision: 'Iowa Code § 22.10',
    appealDeadline: '20 days',
    appealBody: 'Iowa Public Information Board or District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Trade secrets',
      'Criminal investigation records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Iowa Open Records Law, Iowa Code Chapter 22, I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Iowa law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a complaint with the Iowa Public Information Board within 20 days or seek judicial review in District Court pursuant to Iowa Code § 22.10.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  KS: {
    code: 'KS',
    name: 'Kansas',
    statute: 'K.S.A. § 45-218',
    statuteName: 'Kansas Open Records Act (KORA)',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: 'K.S.A. § 45-219',
    expeditedProvision: '',
    appealProvision: 'K.S.A. § 45-222',
    appealDeadline: '30 days',
    appealBody: 'District Court',
    feeStructure: {
      searchFee: '$25 per hour',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Criminal investigation records',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Kansas Open Records Act, K.S.A. § 45-218 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Kansas law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a civil action in District Court within 30 days pursuant to K.S.A. § 45-222.',
      feeNotice: 'I understand fees of $0.25 per page and $25/hour for search time may apply. Please notify me if costs exceed $25.'
    }
  },
  KY: {
    code: 'KY',
    name: 'Kentucky',
    statute: 'Ky. Rev. Stat. § 61.870',
    statuteName: 'Kentucky Open Records Act',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Ky. Rev. Stat. § 61.874',
    expeditedProvision: '',
    appealProvision: 'Ky. Rev. Stat. § 61.880',
    appealDeadline: '30 days',
    appealBody: 'Attorney General or Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.10 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personal privacy (§ 61.878(1)(a))',
      'Preliminary recommendations (§ 61.878(1)(i))',
      'Law enforcement records (§ 61.878(1)(h))'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Kentucky Open Records Act, KRS § 61.870 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Kentucky law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may appeal to the Attorney General within 30 days or seek judicial review in Circuit Court pursuant to KRS § 61.880.',
      feeNotice: 'I understand duplication fees of $0.10 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  LA: {
    code: 'LA',
    name: 'Louisiana',
    statute: 'La. Rev. Stat. § 44:1',
    statuteName: 'Louisiana Public Records Law',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: 'La. Rev. Stat. § 44:32',
    expeditedProvision: '',
    appealProvision: 'La. Rev. Stat. § 44:35',
    appealDeadline: '60 days',
    appealBody: 'District Court',
    feeStructure: {
      searchFee: 'Not chargeable',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Law enforcement records',
      'Trade secrets',
      'Personnel records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Louisiana Public Records Law, La. Rev. Stat. § 44:1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Louisiana law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a petition in District Court within 60 days pursuant to La. Rev. Stat. § 44:35.',
      feeNotice: 'I understand duplication fees of $0.25 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  ME: {
    code: 'ME',
    name: 'Maine',
    statute: '1 M.R.S.A. § 408-A',
    statuteName: 'Maine Freedom of Access Act',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: '1 M.R.S.A. § 408-A',
    expeditedProvision: '',
    appealProvision: '1 M.R.S.A. § 409',
    appealDeadline: '30 days',
    appealBody: 'Superior Court',
    feeStructure: {
      searchFee: '$15 per hour (after first hour)',
      duplicationFee: '$0.10 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Criminal history records',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Maine Freedom of Access Act, 1 M.R.S.A. § 408-A, I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Maine law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file an appeal in Superior Court within 30 days pursuant to 1 M.R.S.A. § 409.',
      feeNotice: 'I understand fees of $0.10 per page and $15/hour for search time after the first hour may apply. Please notify me if costs exceed $25.'
    }
  },
  MD: {
    code: 'MD',
    name: 'Maryland',
    statute: 'Md. Code, Gen. Prov. § 4-101',
    statuteName: 'Maryland Public Information Act (MPIA)',
    responseDeadline: '30 calendar days',
    responseDeadlineDays: 30,
    feeWaiverProvision: 'Md. Code, Gen. Prov. § 4-206',
    expeditedProvision: '',
    appealProvision: 'Md. Code, Gen. Prov. § 4-362',
    appealDeadline: '30 days',
    appealBody: 'Public Access Ombudsman or Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost (first 2 hours free)',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records (§ 4-311)',
      'Trade secrets (§ 4-335)',
      'Law enforcement records (§ 4-351)'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Maryland Public Information Act, Md. Code, Gen. Prov. § 4-101 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within thirty (30) calendar days as required by Maryland law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may seek review by the Public Access Ombudsman or file an action in Circuit Court within 30 days pursuant to Gen. Prov. § 4-362.',
      feeNotice: 'I understand the first 2 hours of search are free, with charges of $0.25 per page for duplication. Please notify me if costs exceed $25.'
    }
  },
  MA: {
    code: 'MA',
    name: 'Massachusetts',
    statute: 'Mass. Gen. Laws ch. 66 § 10',
    statuteName: 'Massachusetts Public Records Law',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Mass. Gen. Laws ch. 66 § 10',
    expeditedProvision: '',
    appealProvision: 'Mass. Gen. Laws ch. 66 § 10A',
    appealDeadline: '90 days',
    appealBody: 'Supervisor of Records or Superior Court',
    feeStructure: {
      searchFee: '$25 per hour',
      duplicationFee: '$0.05 per page (black & white)',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel information',
      'Trade secrets',
      'Investigatory records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Massachusetts Public Records Law, Mass. Gen. Laws ch. 66 § 10, I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Massachusetts law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may petition the Supervisor of Records within 90 days or seek judicial review in Superior Court pursuant to Mass. Gen. Laws ch. 66 § 10A.',
      feeNotice: 'I understand fees of $0.05 per page and $25/hour for search time may apply. Please notify me if costs exceed $25.'
    }
  },
  MI: {
    code: 'MI',
    name: 'Michigan',
    statute: 'Mich. Comp. Laws § 15.231',
    statuteName: 'Michigan Freedom of Information Act',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Mich. Comp. Laws § 15.234',
    expeditedProvision: '',
    appealProvision: 'Mich. Comp. Laws § 15.240',
    appealDeadline: '180 days',
    appealBody: 'Circuit Court',
    feeStructure: {
      searchFee: 'Hourly rate of lowest-paid employee capable',
      duplicationFee: '$0.10 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records (§ 15.243(1)(a))',
      'Law enforcement records (§ 15.243(1)(b))',
      'Trade secrets (§ 15.243(1)(f))'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Michigan Freedom of Information Act, MCL § 15.231 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Michigan law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a civil action in Circuit Court within 180 days pursuant to MCL § 15.240.',
      feeNotice: 'I understand duplication fees of $0.10 per page plus hourly labor costs may apply. Please notify me if costs exceed $25.'
    }
  },
  MN: {
    code: 'MN',
    name: 'Minnesota',
    statute: 'Minn. Stat. § 13.01',
    statuteName: 'Minnesota Government Data Practices Act',
    responseDeadline: 'Promptly',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Minn. Stat. § 13.03',
    expeditedProvision: '',
    appealProvision: 'Minn. Stat. § 13.08',
    appealDeadline: '2 years',
    appealBody: 'Commissioner of Administration or District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel data (§ 13.43)',
      'Welfare data (§ 13.46)',
      'Law enforcement data (§ 13.82)'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Minnesota Government Data Practices Act, Minn. Stat. Chapter 13, I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Minnesota law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a complaint with the Commissioner of Administration or seek judicial review in District Court within 2 years pursuant to Minn. Stat. § 13.08.',
      feeNotice: 'I understand duplication fees of $0.25 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  MS: {
    code: 'MS',
    name: 'Mississippi',
    statute: 'Miss. Code Ann. § 25-61-1',
    statuteName: 'Mississippi Public Records Act',
    responseDeadline: '7 business days',
    responseDeadlineDays: 7,
    feeWaiverProvision: 'Miss. Code Ann. § 25-61-7',
    expeditedProvision: '',
    appealProvision: 'Miss. Code Ann. § 25-61-13',
    appealDeadline: '30 days',
    appealBody: 'Ethics Commission or Chancery Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Trade secrets',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Mississippi Public Records Act, Miss. Code Ann. § 25-61-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within seven (7) business days as required by Mississippi law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a complaint with the Ethics Commission within 30 days or seek judicial review in Chancery Court pursuant to Miss. Code Ann. § 25-61-13.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  MO: {
    code: 'MO',
    name: 'Missouri',
    statute: 'Mo. Rev. Stat. § 610.010',
    statuteName: 'Missouri Sunshine Law',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: 'Mo. Rev. Stat. § 610.026',
    expeditedProvision: '',
    appealProvision: 'Mo. Rev. Stat. § 610.027',
    appealDeadline: '1 year',
    appealBody: 'Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost (research fee)',
      duplicationFee: '$0.10 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records (§ 610.021)',
      'Legal actions (§ 610.021(1))',
      'Law enforcement records (§ 610.100)'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Missouri Sunshine Law, Mo. Rev. Stat. § 610.010 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Missouri law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a civil action in Circuit Court within 1 year pursuant to Mo. Rev. Stat. § 610.027.',
      feeNotice: 'I understand duplication fees of $0.10 per page plus actual research costs may apply. Please notify me if costs exceed $25.'
    }
  },
  MT: {
    code: 'MT',
    name: 'Montana',
    statute: 'Mont. Code Ann. § 2-6-1001',
    statuteName: 'Montana Constitution Right to Know',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Mont. Code Ann. § 2-6-1003',
    expeditedProvision: '',
    appealProvision: 'Mont. Code Ann. § 2-6-1013',
    appealDeadline: '180 days',
    appealBody: 'District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Individual privacy',
      'Trade secrets',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to Montana\'s constitutional Right to Know, Mont. Code Ann. § 2-6-1001 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Montana law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a petition in District Court within 180 days pursuant to Mont. Code Ann. § 2-6-1013.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  NE: {
    code: 'NE',
    name: 'Nebraska',
    statute: 'Neb. Rev. Stat. § 84-712',
    statuteName: 'Nebraska Public Records Statutes',
    responseDeadline: '4 business days',
    responseDeadlineDays: 4,
    feeWaiverProvision: 'Neb. Rev. Stat. § 84-712',
    expeditedProvision: '',
    appealProvision: 'Neb. Rev. Stat. § 84-712.03',
    appealDeadline: 'Reasonable time',
    appealBody: 'Attorney General or District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost (reasonable)',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel files',
      'Criminal investigations',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Nebraska Public Records Statutes, Neb. Rev. Stat. § 84-712, I am requesting access to and copies of',
      closing: 'I expect a response within four (4) business days as required by Nebraska law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may request an opinion from the Attorney General or file a civil action in District Court pursuant to Neb. Rev. Stat. § 84-712.03.',
      feeNotice: 'I understand reasonable actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  NV: {
    code: 'NV',
    name: 'Nevada',
    statute: 'Nev. Rev. Stat. § 239.010',
    statuteName: 'Nevada Public Records Act',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Nev. Rev. Stat. § 239.055',
    expeditedProvision: '',
    appealProvision: 'Nev. Rev. Stat. § 239.011',
    appealDeadline: '2 years',
    appealBody: 'District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.05-$0.65 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personal information',
      'Trade secrets',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Nevada Public Records Act, NRS § 239.010 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Nevada law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file an action in District Court within 2 years pursuant to NRS § 239.011.',
      feeNotice: 'I understand duplication fees between $0.05 and $0.65 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  NH: {
    code: 'NH',
    name: 'New Hampshire',
    statute: 'N.H. Rev. Stat. Ann. § 91-A:4',
    statuteName: 'New Hampshire Right-to-Know Law',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'N.H. Rev. Stat. Ann. § 91-A:4',
    expeditedProvision: '',
    appealProvision: 'N.H. Rev. Stat. Ann. § 91-A:7',
    appealDeadline: '30 days (internal), 2 years (court)',
    appealBody: 'Public body or Superior Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Law enforcement records',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the New Hampshire Right-to-Know Law, RSA § 91-A:4, I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by New Hampshire law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file an internal appeal within 30 days or seek judicial review in Superior Court within 2 years pursuant to RSA § 91-A:7.',
      feeNotice: 'I understand duplication fees of $0.25 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  NJ: {
    code: 'NJ',
    name: 'New Jersey',
    statute: 'N.J.S.A. § 47:1A-1',
    statuteName: 'Open Public Records Act (OPRA)',
    responseDeadline: '7 business days',
    responseDeadlineDays: 7,
    feeWaiverProvision: 'N.J.S.A. § 47:1A-5',
    expeditedProvision: '',
    appealProvision: 'N.J.S.A. § 47:1A-6',
    appealDeadline: '45 days',
    appealBody: 'Government Records Council or Superior Court',
    feeStructure: {
      searchFee: 'Special service charge if extraordinary',
      duplicationFee: '$0.05 per letter-size page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Advisory, consultative, deliberative (ACD)',
      'Personnel records',
      'Criminal investigation records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Open Public Records Act, N.J.S.A. § 47:1A-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within seven (7) business days as required by New Jersey law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a complaint with the Government Records Council within 45 days or seek judicial review in Superior Court pursuant to N.J.S.A. § 47:1A-6.',
      feeNotice: 'I understand duplication fees of $0.05 per letter-size page may apply. Please notify me if costs exceed $25.'
    }
  },
  NM: {
    code: 'NM',
    name: 'New Mexico',
    statute: 'N.M. Stat. Ann. § 14-2-1',
    statuteName: 'Inspection of Public Records Act (IPRA)',
    responseDeadline: '15 calendar days',
    responseDeadlineDays: 15,
    feeWaiverProvision: 'N.M. Stat. Ann. § 14-2-9',
    expeditedProvision: '',
    appealProvision: 'N.M. Stat. Ann. § 14-2-12',
    appealDeadline: '60 days',
    appealBody: 'District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Law enforcement records (§ 14-2-1(A))',
      'Trade secrets',
      'Personal information'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Inspection of Public Records Act, NMSA § 14-2-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within fifteen (15) calendar days as required by New Mexico law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a petition in District Court within 60 days pursuant to NMSA § 14-2-12.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  NY: {
    code: 'NY',
    name: 'New York',
    statute: 'N.Y. Pub. Off. Law § 87',
    statuteName: 'Freedom of Information Law (FOIL)',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'N.Y. Pub. Off. Law § 87(1)(b)',
    expeditedProvision: '',
    appealProvision: 'N.Y. Pub. Off. Law § 89(4)',
    appealDeadline: '30 days',
    appealBody: 'Agency Records Access Officer, then Committee on Open Government',
    feeStructure: {
      searchFee: 'Not chargeable',
      duplicationFee: '$0.25 per page',
      reviewFee: 'Not chargeable',
      freePages: 0
    },
    exemptions: [
      'Inter-agency or intra-agency materials (§ 87(2)(g))',
      'Law enforcement records (§ 87(2)(e))',
      'Trade secrets (§ 87(2)(d))'
    ],
    legalLanguage: {
      opening: 'Pursuant to the New York Freedom of Information Law (FOIL), Public Officers Law Article 6, I am requesting access to and copies of',
      closing: 'FOIL requires a response within five (5) business days.',
      feeWaiver: 'I request a fee waiver as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may appeal within 30 days to the agency Records Access Officer, and thereafter to the Committee on Open Government, pursuant to Public Officers Law Section 89(4).',
      feeNotice: 'I understand duplication fees may apply at $0.25 per page. Please advise if costs will exceed $25.'
    }
  },
  NC: {
    code: 'NC',
    name: 'North Carolina',
    statute: 'N.C. Gen. Stat. § 132-1',
    statuteName: 'North Carolina Public Records Law',
    responseDeadline: 'Promptly',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'N.C. Gen. Stat. § 132-6',
    expeditedProvision: '',
    appealProvision: 'N.C. Gen. Stat. § 132-9',
    appealDeadline: 'No specific deadline',
    appealBody: 'Superior Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records (§ 126-22)',
      'Criminal investigations',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the North Carolina Public Records Law, N.C. Gen. Stat. § 132-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by North Carolina law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may seek judicial review in Superior Court pursuant to N.C. Gen. Stat. § 132-9.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  ND: {
    code: 'ND',
    name: 'North Dakota',
    statute: 'N.D. Cent. Code § 44-04-18',
    statuteName: 'North Dakota Open Records Law',
    responseDeadline: 'Promptly',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'N.D. Cent. Code § 44-04-18',
    expeditedProvision: '',
    appealProvision: 'N.D. Cent. Code § 44-04-21.2',
    appealDeadline: '30 days',
    appealBody: 'Attorney General or District Court',
    feeStructure: {
      searchFee: '$25 per hour (after first hour)',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Attorney-client privilege',
      'Personnel records',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the North Dakota Open Records Law, N.D. Cent. Code § 44-04-18, I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by North Dakota law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may request an opinion from the Attorney General within 30 days or seek judicial review in District Court pursuant to N.D. Cent. Code § 44-04-21.2.',
      feeNotice: 'I understand fees of $0.25 per page and $25/hour for search time after the first hour may apply. Please notify me if costs exceed $25.'
    }
  },
  OH: {
    code: 'OH',
    name: 'Ohio',
    statute: 'Ohio Rev. Code § 149.43',
    statuteName: 'Ohio Public Records Act',
    responseDeadline: 'Promptly',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Ohio Rev. Code § 149.43(B)',
    expeditedProvision: '',
    appealProvision: 'Ohio Rev. Code § 149.43(C)',
    appealDeadline: 'No specific deadline',
    appealBody: 'Court of Claims or Common Pleas Court',
    feeStructure: {
      searchFee: 'Not chargeable',
      duplicationFee: '$0.05 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Medical records (§ 149.43(A)(1)(a))',
      'Law enforcement records (§ 149.43(A)(2))',
      'Trial preparation records (§ 149.43(A)(4))'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Ohio Public Records Act, Ohio Rev. Code § 149.43, I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Ohio law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a mandamus action in the Court of Claims or Common Pleas Court pursuant to Ohio Rev. Code § 149.43(C).',
      feeNotice: 'I understand duplication fees of $0.05 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  OK: {
    code: 'OK',
    name: 'Oklahoma',
    statute: '51 Okla. Stat. § 24A.1',
    statuteName: 'Oklahoma Open Records Act',
    responseDeadline: 'Promptly',
    responseDeadlineDays: 5,
    feeWaiverProvision: '51 Okla. Stat. § 24A.5',
    expeditedProvision: '',
    appealProvision: '51 Okla. Stat. § 24A.17',
    appealDeadline: '10 days (DA), then District Court',
    appealBody: 'District Attorney or District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Law enforcement records',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Oklahoma Open Records Act, 51 Okla. Stat. § 24A.1 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Oklahoma law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may request the District Attorney review the denial within 10 days, or seek judicial review in District Court pursuant to 51 Okla. Stat. § 24A.17.',
      feeNotice: 'I understand duplication fees of $0.25 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  OR: {
    code: 'OR',
    name: 'Oregon',
    statute: 'Or. Rev. Stat. § 192.311',
    statuteName: 'Oregon Public Records Law',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Or. Rev. Stat. § 192.324',
    expeditedProvision: '',
    appealProvision: 'Or. Rev. Stat. § 192.411',
    appealDeadline: '60 days',
    appealBody: 'Attorney General or Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personal privacy (§ 192.355)',
      'Law enforcement records',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Oregon Public Records Law, ORS § 192.311 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Oregon law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may request review from the Attorney General\'s Public Records Advocate within 60 days or seek judicial review in Circuit Court pursuant to ORS § 192.411.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  PA: {
    code: 'PA',
    name: 'Pennsylvania',
    statute: '65 P.S. § 67.101',
    statuteName: 'Pennsylvania Right-to-Know Law',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: '65 P.S. § 67.1307',
    expeditedProvision: '',
    appealProvision: '65 P.S. § 67.1101',
    appealDeadline: '15 business days',
    appealBody: 'Office of Open Records or Commonwealth Court',
    feeStructure: {
      searchFee: 'Not chargeable',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personal information (§ 67.708(b)(1))',
      'Trade secrets (§ 67.708(b)(11))',
      'Law enforcement records (§ 67.708(b)(16))'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Pennsylvania Right-to-Know Law, 65 P.S. § 67.101 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Pennsylvania law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may appeal to the Office of Open Records within 15 business days or seek judicial review in Commonwealth Court pursuant to 65 P.S. § 67.1101.',
      feeNotice: 'I understand duplication fees of $0.25 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  RI: {
    code: 'RI',
    name: 'Rhode Island',
    statute: 'R.I. Gen. Laws § 38-2-1',
    statuteName: 'Access to Public Records Act (APRA)',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'R.I. Gen. Laws § 38-2-4',
    expeditedProvision: '',
    appealProvision: 'R.I. Gen. Laws § 38-2-8',
    appealDeadline: '180 days',
    appealBody: 'Chief Administrative Officer (appeal) or Superior Court',
    feeStructure: {
      searchFee: '$15 per hour (after first hour)',
      duplicationFee: '$0.15 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records (§ 38-2-2(4)(A)(I))',
      'Law enforcement records (§ 38-2-2(4)(D))',
      'Trade secrets (§ 38-2-2(4)(B))'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Access to Public Records Act, R.I. Gen. Laws § 38-2-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Rhode Island law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file an appeal with the Chief Administrative Officer within 180 days or seek judicial review in Superior Court pursuant to R.I. Gen. Laws § 38-2-8.',
      feeNotice: 'I understand fees of $0.15 per page and $15/hour for search time after the first hour may apply. Please notify me if costs exceed $25.'
    }
  },
  SC: {
    code: 'SC',
    name: 'South Carolina',
    statute: 'S.C. Code Ann. § 30-4-10',
    statuteName: 'South Carolina Freedom of Information Act',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'S.C. Code Ann. § 30-4-30',
    expeditedProvision: '',
    appealProvision: 'S.C. Code Ann. § 30-4-100',
    appealDeadline: '1 year',
    appealBody: 'Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Trade secrets',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the South Carolina Freedom of Information Act, S.C. Code Ann. § 30-4-10 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by South Carolina law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a civil action in Circuit Court within 1 year pursuant to S.C. Code Ann. § 30-4-100.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  SD: {
    code: 'SD',
    name: 'South Dakota',
    statute: 'S.D. Codified Laws § 1-27-1',
    statuteName: 'South Dakota Open Records Law',
    responseDeadline: 'Promptly',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'S.D. Codified Laws § 1-27-1.4',
    expeditedProvision: '',
    appealProvision: 'S.D. Codified Laws § 1-27-1.5',
    appealDeadline: 'Timely',
    appealBody: 'Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Trade secrets',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the South Dakota Open Records Law, SDCL § 1-27-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by South Dakota law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may seek judicial review in Circuit Court pursuant to SDCL § 1-27-1.5.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  TN: {
    code: 'TN',
    name: 'Tennessee',
    statute: 'Tenn. Code Ann. § 10-7-503',
    statuteName: 'Tennessee Public Records Act',
    responseDeadline: '7 business days',
    responseDeadlineDays: 7,
    feeWaiverProvision: 'Tenn. Code Ann. § 10-7-503',
    expeditedProvision: '',
    appealProvision: 'Tenn. Code Ann. § 10-7-505',
    appealDeadline: '60 days',
    appealBody: 'Office of Open Records Counsel or Chancery Court',
    feeStructure: {
      searchFee: '$20 per hour (after first hour)',
      duplicationFee: '$0.15 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Confidential records (§ 10-7-504)',
      'Personnel records',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Tennessee Public Records Act, Tenn. Code Ann. § 10-7-503, I am requesting access to and copies of',
      closing: 'I expect a response within seven (7) business days as required by Tennessee law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a complaint with the Office of Open Records Counsel within 60 days or seek judicial review in Chancery Court pursuant to Tenn. Code Ann. § 10-7-505.',
      feeNotice: 'I understand fees of $0.15 per page and $20/hour for search time after the first hour may apply. Please notify me if costs exceed $25.'
    }
  },
  TX: {
    code: 'TX',
    name: 'Texas',
    statute: 'Tex. Gov\'t Code § 552.001',
    statuteName: 'Texas Public Information Act (PIA)',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Tex. Gov\'t Code § 552.267',
    expeditedProvision: '',
    appealProvision: 'Tex. Gov\'t Code § 552.301',
    appealDeadline: '10 business days (AG ruling)',
    appealBody: 'Texas Attorney General',
    feeStructure: {
      searchFee: '$15 per hour (after first hour)',
      duplicationFee: '$0.10 per page',
      reviewFee: 'N/A for most requesters',
      freePages: 50
    },
    exemptions: [
      'Information excepted from disclosure (§ 552.101-552.153)',
      'Law enforcement records (§ 552.108)',
      'Legal matters (§ 552.103)'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Texas Public Information Act, Government Code Chapter 552, I am requesting access to and copies of',
      closing: 'The Public Information Act requires a response within ten (10) business days.',
      feeWaiver: 'I request a waiver or reduction of fees pursuant to Section 552.267.',
      expedited: '',
      appeal: 'If you believe any records are excepted from disclosure, you must request an Attorney General ruling within 10 business days pursuant to Section 552.301.',
      feeNotice: 'I understand charges may apply for copies exceeding 50 pages at $0.10 per page. Please notify me if costs exceed $25.'
    }
  },
  UT: {
    code: 'UT',
    name: 'Utah',
    statute: 'Utah Code § 63G-2-101',
    statuteName: 'Government Records Access and Management Act (GRAMA)',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Utah Code § 63G-2-203',
    expeditedProvision: '',
    appealProvision: 'Utah Code § 63G-2-401',
    appealDeadline: '30 days',
    appealBody: 'Chief Administrative Officer, then State Records Committee or District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Private records (§ 63G-2-302)',
      'Protected records (§ 63G-2-305)',
      'Controlled records (§ 63G-2-304)'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Government Records Access and Management Act, Utah Code § 63G-2-101 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Utah law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may appeal to the Chief Administrative Officer within 30 days, and thereafter to the State Records Committee or District Court pursuant to Utah Code § 63G-2-401.',
      feeNotice: 'I understand duplication fees of $0.25 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  VT: {
    code: 'VT',
    name: 'Vermont',
    statute: '1 V.S.A. § 315',
    statuteName: 'Vermont Public Records Act',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: '1 V.S.A. § 316',
    expeditedProvision: '',
    appealProvision: '1 V.S.A. § 319',
    appealDeadline: '60 days',
    appealBody: 'Superior Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.25 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records',
      'Law enforcement records',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Vermont Public Records Act, 1 V.S.A. § 315 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Vermont law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file an action in Superior Court within 60 days pursuant to 1 V.S.A. § 319.',
      feeNotice: 'I understand duplication fees of $0.25 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  VA: {
    code: 'VA',
    name: 'Virginia',
    statute: 'Va. Code § 2.2-3700',
    statuteName: 'Virginia Freedom of Information Act (VFOIA)',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Va. Code § 2.2-3704',
    expeditedProvision: '',
    appealProvision: 'Va. Code § 2.2-3713',
    appealDeadline: '1 year',
    appealBody: 'FOIA Council (advisory) or General District or Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost (reasonable)',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel records (§ 2.2-3705.1)',
      'Law enforcement records (§ 2.2-3706)',
      'Trade secrets (§ 2.2-3705.6)'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Virginia Freedom of Information Act, Va. Code § 2.2-3700 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Virginia law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may petition the FOIA Council for advisory opinion or file an action in General District or Circuit Court within 1 year pursuant to Va. Code § 2.2-3713.',
      feeNotice: 'I understand reasonable actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  WA: {
    code: 'WA',
    name: 'Washington',
    statute: 'Wash. Rev. Code § 42.56.001',
    statuteName: 'Washington Public Records Act (PRA)',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Wash. Rev. Code § 42.56.120',
    expeditedProvision: '',
    appealProvision: 'Wash. Rev. Code § 42.56.550',
    appealDeadline: '1 year',
    appealBody: 'Superior Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: '$0.15 per page',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personal information (§ 42.56.230)',
      'Law enforcement (§ 42.56.240)',
      'Agency deliberations (§ 42.56.280)'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Washington Public Records Act, RCW § 42.56.001 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Washington law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file a petition in Superior Court within 1 year pursuant to RCW § 42.56.550.',
      feeNotice: 'I understand duplication fees of $0.15 per page may apply. Please notify me if costs exceed $25.'
    }
  },
  WV: {
    code: 'WV',
    name: 'West Virginia',
    statute: 'W. Va. Code § 29B-1-1',
    statuteName: 'West Virginia Freedom of Information Act',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'W. Va. Code § 29B-1-3',
    expeditedProvision: '',
    appealProvision: 'W. Va. Code § 29B-1-5',
    appealDeadline: '30 days (appeal), 1 year (court)',
    appealBody: 'Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel files',
      'Law enforcement records',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the West Virginia Freedom of Information Act, W. Va. Code § 29B-1-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by West Virginia law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may file an action in Circuit Court within 1 year pursuant to W. Va. Code § 29B-1-5.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  WI: {
    code: 'WI',
    name: 'Wisconsin',
    statute: 'Wis. Stat. § 19.31',
    statuteName: 'Wisconsin Open Records Law',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Wis. Stat. § 19.35',
    expeditedProvision: '',
    appealProvision: 'Wis. Stat. § 19.37',
    appealDeadline: 'No specific deadline',
    appealBody: 'Attorney General (opinion) or Circuit Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost (reasonable)',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Law enforcement records',
      'Personnel records',
      'Trade secrets'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Wisconsin Open Records Law, Wis. Stat. § 19.31 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Wisconsin law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may request an opinion from the Attorney General or file a mandamus action in Circuit Court pursuant to Wis. Stat. § 19.37.',
      feeNotice: 'I understand reasonable actual costs may apply. Please notify me if costs exceed $25.'
    }
  },
  WY: {
    code: 'WY',
    name: 'Wyoming',
    statute: 'Wyo. Stat. § 16-4-201',
    statuteName: 'Wyoming Public Records Act',
    responseDeadline: 'Promptly',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Wyo. Stat. § 16-4-204',
    expeditedProvision: '',
    appealProvision: 'Wyo. Stat. § 16-4-203',
    appealDeadline: 'No specific deadline',
    appealBody: 'District Court',
    feeStructure: {
      searchFee: 'Actual cost',
      duplicationFee: 'Actual cost',
      reviewFee: 'N/A',
      freePages: 0
    },
    exemptions: [
      'Personnel files',
      'Trade secrets',
      'Law enforcement records'
    ],
    legalLanguage: {
      opening: 'Pursuant to the Wyoming Public Records Act, Wyo. Stat. § 16-4-201 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Wyoming law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: '',
      appeal: 'If this request is denied, I may seek judicial review in District Court pursuant to Wyo. Stat. § 16-4-203.',
      feeNotice: 'I understand actual costs may apply. Please notify me if costs exceed $25.'
    }
  }
};

export function getJurisdictionInfo(code: string): JurisdictionInfo {
  if (code === 'federal') {
    return FEDERAL_FOIA;
  }
  return STATE_STATUTES[code] || FEDERAL_FOIA;
}

export function getAllJurisdictions(): Array<{ code: string; name: string }> {
  const jurisdictions = [
    { code: 'federal', name: 'Federal (FOIA)' },
    ...Object.values(STATE_STATUTES).map(s => ({ code: s.code, name: s.name }))
  ];
  return jurisdictions.sort((a, b) => {
    if (a.code === 'federal') return -1;
    if (b.code === 'federal') return 1;
    return a.name.localeCompare(b.name);
  });
}

export type DeliveryPreference = 'email' | 'mail' | 'portal';

export const DELIVERY_PREFERENCES: Array<{ 
  value: DeliveryPreference; 
  label: string; 
  description: string;
}> = [
  { 
    value: 'email', 
    label: 'Electronic Delivery (Email)', 
    description: 'Receive records via email attachment or download link' 
  },
  { 
    value: 'mail', 
    label: 'Physical Mail', 
    description: 'Receive hard copies via postal mail' 
  },
  { 
    value: 'portal', 
    label: 'Online Portal', 
    description: 'Access records through the agency\'s online portal' 
  }
];

// Helper function to format fee structure for display
export function formatFeeStructure(feeStructure: FeeStructure): string {
  const parts: string[] = [];
  
  if (feeStructure.duplicationFee !== 'N/A') {
    parts.push(`Copies: ${feeStructure.duplicationFee}`);
  }
  if (feeStructure.searchFee !== 'Not chargeable' && feeStructure.searchFee !== 'N/A') {
    parts.push(`Search: ${feeStructure.searchFee}`);
  }
  if (feeStructure.freePages > 0) {
    parts.push(`First ${feeStructure.freePages} pages free`);
  }
  
  return parts.join(' • ') || 'Contact agency for fee schedule';
}
