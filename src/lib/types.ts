export interface StateData {
  code: string;
  name: string;
  deedTypeName: string;
  statute: {
    name: string;
    section: string;
    year: number;
    lastVerified: string;
    url?: string;
  };
  witnessCount: number;
  notaryRequired: boolean;
  officialWitnessRule?: boolean;
  spousalJoinderRequired?: 'always' | 'homestead' | 'never';
  recordingOffice: string;
  recordingFee: {
    firstPage: number;
    additionalPage: number;
    currency: string;
  };
  documentaryStampTax?: {
    rate: number;
    minimum: number;
    notes?: string;
  };
  counties?: Array<{
    name: string;
    recordingOffice: string;
    url?: string;
  }>;
  deedPreparationStatement: boolean;
  pcorRequired: boolean;
  additionalForms: string[];
}
