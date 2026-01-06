// Comprehensive FOIA and State Public Records Act statutory information

export interface JurisdictionInfo {
  code: string;
  name: string;
  statute: string;
  statuteName: string;
  responseDeadline: string;
  responseDeadlineDays: number;
  feeWaiverProvision: string;
  expeditedProvision: string;
  legalLanguage: {
    opening: string;
    closing: string;
    feeWaiver: string;
    expedited: string;
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
  legalLanguage: {
    opening: 'Pursuant to the Freedom of Information Act (FOIA), 5 U.S.C. § 552, I am requesting access to and copies of',
    closing: 'As provided under 5 U.S.C. § 552(a)(6)(A), I expect a response within twenty (20) business days.',
    feeWaiver: 'I am requesting a waiver of all fees associated with this request pursuant to 5 U.S.C. § 552(a)(4)(A)(iii). Disclosure of the requested information is in the public interest because it is likely to contribute significantly to public understanding of the operations or activities of the government and is not primarily in my commercial interest.',
    expedited: 'I am requesting expedited processing of this request pursuant to 5 U.S.C. § 552(a)(6)(E). There is a compelling need for the requested records because'
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
    legalLanguage: {
      opening: 'Pursuant to the Alabama Open Records Law, Ala. Code § 36-12-40, I am requesting access to and copies of',
      closing: 'I expect a response within a reasonable time, as required by Alabama law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Alaska Public Records Act, Alaska Stat. § 40.25.110, I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Alaska law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Arizona Public Records Law, Ariz. Rev. Stat. § 39-121 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Arizona law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Arkansas Freedom of Information Act, Ark. Code Ann. § 25-19-105, I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Arkansas law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  CA: {
    code: 'CA',
    name: 'California',
    statute: 'Cal. Gov. Code §§ 6250-6270',
    statuteName: 'California Public Records Act',
    responseDeadline: '10 calendar days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Cal. Gov. Code § 6253(b)',
    expeditedProvision: 'Cal. Gov. Code § 6253(c)',
    legalLanguage: {
      opening: 'Pursuant to the California Public Records Act, Government Code Sections 6250-6270, I am requesting access to and copies of',
      closing: 'As required by Government Code Section 6253(c), I expect a determination regarding this request within ten (10) calendar days.',
      feeWaiver: 'I am requesting that fees be waived or reduced pursuant to Government Code Section 6253(b) as the disclosure serves the public interest.',
      expedited: 'I am requesting expedited processing as the records are urgently needed because'
    }
  },
  CO: {
    code: 'CO',
    name: 'Colorado',
    statute: 'Colo. Rev. Stat. § 24-72-201',
    statuteName: 'Colorado Open Records Act',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: 'Colo. Rev. Stat. § 24-72-205',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Colorado Open Records Act, C.R.S. § 24-72-201 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Colorado law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Connecticut Freedom of Information Act, Conn. Gen. Stat. § 1-200 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within four (4) business days as required by Connecticut law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Delaware Freedom of Information Act, 29 Del. Code § 10003, I am requesting access to and copies of',
      closing: 'I expect a response within fifteen (15) business days as required by Delaware law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the District of Columbia Freedom of Information Act, D.C. Code § 2-532, I am requesting access to and copies of',
      closing: 'I expect a response within fifteen (15) business days as required by D.C. law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: 'I am requesting expedited processing as the records are urgently needed because'
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
    legalLanguage: {
      opening: 'Pursuant to the Florida Public Records Act, Chapter 119, Florida Statutes, I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Florida law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Georgia Open Records Act, O.C.G.A. § 50-18-70 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Georgia law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  HI: {
    code: 'HI',
    name: 'Hawaii',
    statute: 'Haw. Rev. Stat. § 92F-11',
    statuteName: 'Uniform Information Practices Act',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Haw. Rev. Stat. § 92F-21',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Uniform Information Practices Act, Haw. Rev. Stat. § 92F-11, I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Hawaii law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Idaho Public Records Act, Idaho Code § 74-102, I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Idaho law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Illinois Freedom of Information Act, 5 ILCS 140/1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Illinois law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Indiana Access to Public Records Act, Ind. Code § 5-14-3-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within seven (7) calendar days as required by Indiana law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Iowa Open Records Law, Iowa Code Chapter 22, I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Iowa law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  KS: {
    code: 'KS',
    name: 'Kansas',
    statute: 'K.S.A. § 45-218',
    statuteName: 'Kansas Open Records Act',
    responseDeadline: '3 business days',
    responseDeadlineDays: 3,
    feeWaiverProvision: 'K.S.A. § 45-219',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Kansas Open Records Act, K.S.A. § 45-218 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Kansas law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Kentucky Open Records Act, KRS § 61.870 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Kentucky law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Louisiana Public Records Law, La. Rev. Stat. § 44:1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Louisiana law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Maine Freedom of Access Act, 1 M.R.S.A. § 408-A, I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Maine law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  MD: {
    code: 'MD',
    name: 'Maryland',
    statute: 'Md. Code, Gen. Prov. § 4-101',
    statuteName: 'Maryland Public Information Act',
    responseDeadline: '30 calendar days',
    responseDeadlineDays: 30,
    feeWaiverProvision: 'Md. Code, Gen. Prov. § 4-206',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Maryland Public Information Act, Md. Code, Gen. Prov. § 4-101 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within thirty (30) calendar days as required by Maryland law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Massachusetts Public Records Law, Mass. Gen. Laws ch. 66 § 10, I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Massachusetts law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Michigan Freedom of Information Act, MCL § 15.231 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Michigan law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Minnesota Government Data Practices Act, Minn. Stat. Chapter 13, I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Minnesota law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Mississippi Public Records Act, Miss. Code Ann. § 25-61-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within seven (7) business days as required by Mississippi law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Missouri Sunshine Law, Mo. Rev. Stat. § 610.010 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Missouri law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  MT: {
    code: 'MT',
    name: 'Montana',
    statute: 'Mont. Code Ann. § 2-6-1001',
    statuteName: 'Montana Right to Know',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Mont. Code Ann. § 2-6-1003',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to Montana\'s Right to Know law, Mont. Code Ann. § 2-6-1001 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Montana law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Nebraska Public Records Statutes, Neb. Rev. Stat. § 84-712, I am requesting access to and copies of',
      closing: 'I expect a response within four (4) business days as required by Nebraska law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Nevada Public Records Act, NRS § 239.010 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Nevada law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the New Hampshire Right-to-Know Law, RSA § 91-A:4, I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by New Hampshire law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  NJ: {
    code: 'NJ',
    name: 'New Jersey',
    statute: 'N.J.S.A. § 47:1A-1',
    statuteName: 'Open Public Records Act',
    responseDeadline: '7 business days',
    responseDeadlineDays: 7,
    feeWaiverProvision: 'N.J.S.A. § 47:1A-5',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Open Public Records Act, N.J.S.A. § 47:1A-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within seven (7) business days as required by New Jersey law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  NM: {
    code: 'NM',
    name: 'New Mexico',
    statute: 'N.M. Stat. Ann. § 14-2-1',
    statuteName: 'Inspection of Public Records Act',
    responseDeadline: '15 calendar days',
    responseDeadlineDays: 15,
    feeWaiverProvision: 'N.M. Stat. Ann. § 14-2-9',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Inspection of Public Records Act, NMSA § 14-2-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within fifteen (15) calendar days as required by New Mexico law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  NY: {
    code: 'NY',
    name: 'New York',
    statute: 'N.Y. Pub. Off. Law § 87',
    statuteName: 'Freedom of Information Law',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'N.Y. Pub. Off. Law § 87(1)(b)',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the New York Freedom of Information Law, Public Officers Law Article 6, I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by New York law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the North Carolina Public Records Law, N.C. Gen. Stat. § 132-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by North Carolina law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the North Dakota Open Records Law, N.D. Cent. Code § 44-04-18, I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by North Dakota law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Ohio Public Records Act, Ohio Rev. Code § 149.43, I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Ohio law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Oklahoma Open Records Act, 51 Okla. Stat. § 24A.1 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Oklahoma law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Oregon Public Records Law, ORS § 192.311 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Oregon law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Pennsylvania Right-to-Know Law, 65 P.S. § 67.101 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Pennsylvania law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  RI: {
    code: 'RI',
    name: 'Rhode Island',
    statute: 'R.I. Gen. Laws § 38-2-1',
    statuteName: 'Access to Public Records Act',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'R.I. Gen. Laws § 38-2-4',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Access to Public Records Act, R.I. Gen. Laws § 38-2-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Rhode Island law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the South Carolina Freedom of Information Act, S.C. Code Ann. § 30-4-10 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by South Carolina law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the South Dakota Open Records Law, SDCL § 1-27-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by South Dakota law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Tennessee Public Records Act, Tenn. Code Ann. § 10-7-503, I am requesting access to and copies of',
      closing: 'I expect a response within seven (7) business days as required by Tennessee law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  TX: {
    code: 'TX',
    name: 'Texas',
    statute: 'Tex. Gov\'t Code § 552.001',
    statuteName: 'Texas Public Information Act',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Tex. Gov\'t Code § 552.267',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Texas Public Information Act, Texas Government Code Chapter 552, I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Texas law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  UT: {
    code: 'UT',
    name: 'Utah',
    statute: 'Utah Code § 63G-2-101',
    statuteName: 'Government Records Access and Management Act',
    responseDeadline: '10 business days',
    responseDeadlineDays: 10,
    feeWaiverProvision: 'Utah Code § 63G-2-203',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Government Records Access and Management Act, Utah Code § 63G-2-101 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Utah law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Vermont Public Records Act, 1 V.S.A. § 315 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within three (3) business days as required by Vermont law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  VA: {
    code: 'VA',
    name: 'Virginia',
    statute: 'Va. Code § 2.2-3700',
    statuteName: 'Virginia Freedom of Information Act',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Va. Code § 2.2-3704',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Virginia Freedom of Information Act, Va. Code § 2.2-3700 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Virginia law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  },
  WA: {
    code: 'WA',
    name: 'Washington',
    statute: 'Wash. Rev. Code § 42.56.001',
    statuteName: 'Washington Public Records Act',
    responseDeadline: '5 business days',
    responseDeadlineDays: 5,
    feeWaiverProvision: 'Wash. Rev. Code § 42.56.120',
    expeditedProvision: '',
    legalLanguage: {
      opening: 'Pursuant to the Washington Public Records Act, RCW § 42.56.001 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by Washington law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the West Virginia Freedom of Information Act, W. Va. Code § 29B-1-1 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within five (5) business days as required by West Virginia law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Wisconsin Open Records Law, Wis. Stat. § 19.31 et seq., I am requesting access to and copies of',
      closing: 'I expect a response within ten (10) business days as required by Wisconsin law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
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
    legalLanguage: {
      opening: 'Pursuant to the Wyoming Public Records Act, Wyo. Stat. § 16-4-201 et seq., I am requesting access to and copies of',
      closing: 'I expect a prompt response as required by Wyoming law.',
      feeWaiver: 'I am requesting a waiver of fees for this request as the disclosure serves the public interest.',
      expedited: ''
    }
  }
};

export function getJurisdictionInfo(code: string): JurisdictionInfo {
  if (code === 'federal') {
    return FEDERAL_FOIA;
  }
  return STATE_STATUTES[code] || FEDERAL_FOIA;
}

export function getAllJurisdictions(): { code: string; name: string }[] {
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

export const DELIVERY_PREFERENCES = [
  { value: 'email', label: 'Email (Preferred)', description: 'Electronic delivery to email address' },
  { value: 'mail', label: 'Physical Mail', description: 'Mailed copies to address' },
  { value: 'portal', label: 'Online Portal', description: 'Access through agency portal' }
] as const;

export type DeliveryPreference = typeof DELIVERY_PREFERENCES[number]['value'];
