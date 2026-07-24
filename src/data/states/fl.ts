import type { StateData } from '../../lib/types';

export const florida: StateData = {
  code: 'FL',
  name: 'Florida',
  deedTypeName: 'Quitclaim Deed',
  statute: {
    name: 'Fla. Stat.',
    section: '§ 689.01',
    year: 2026,
    lastVerified: 'June 2026',
    url: 'https://www.flsenate.gov/Laws/Statutes/2023/689.01',
  },
  witnessCount: 2,
  notaryRequired: true,
  officialWitnessRule: true, // notary can serve as one of the two witnesses, signing twice
  spousalJoinderRequired: 'homestead', // non-titled spouse must sign if homestead property
  recordingOffice: 'Clerk of Court',
  recordingFee: {
    firstPage: 10.00,
    additionalPage: 8.50,
    currency: 'USD',
  },
  documentaryStampTax: {
    rate: 0.007, // $0.70 per $100
    minimum: 0.70,
    notes: 'On family transfers for love and affection ($0 consideration), minimum $0.70 applies',
  },
  counties: [
    { name: 'Miami-Dade', recordingOffice: 'Miami-Dade Clerk of Courts', url: 'https://www.miami-dadeclerk.com' },
    { name: 'Broward', recordingOffice: 'Broward County Records Division', url: 'https://www.browardclerk.org' },
    { name: 'Hillsborough', recordingOffice: 'Hillsborough County Clerk of Court', url: 'https://www.hillsclerk.com' },
    { name: 'Orange', recordingOffice: 'Orange County Comptroller', url: 'https://comptroller.ocfl.net' },
    { name: 'Palm Beach', recordingOffice: 'Palm Beach County Clerk & Comptroller', url: 'https://www.mypalmbeachclerk.com' },
  ],
  deedPreparationStatement: false,
  pcorRequired: false,
  additionalForms: [],
};
