export interface ExtractedField {
  value: string;
  confidence: number;
}

export interface ValidationCheck {
  field: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

export interface MRZData {
  documentType: string;
  issuingCountry: string;
  documentNumber: string;
  dateOfBirth: string;
  expiryDate: string;
  nationality: string;
  surname: string;
  givenNames: string;
  sex: string;
  checksumValid: boolean;
}

export interface ApplicantForm {
  name: string;
  dateOfBirth: string;
  passportNumber: string;
  nationality: string;
  intendedVisaType: string;
}

export interface EligibilityPolicy {
  minAge?: number;
  maxAge?: number;
  allowedNationalities?: string[];
  blockedNationalities?: string[];
  minPassportValidity?: number; // months
  visaTypeRequirements?: Record<string, any>;
}

export interface VerificationResult {
  overallConfidence: number;
  documentType: string;
  extractedFields: {
    documentNumber?: ExtractedField;
    fullName?: ExtractedField;
    dateOfBirth?: ExtractedField;
    dateOfIssue?: ExtractedField;
    expiryDate?: ExtractedField;
    nationality?: ExtractedField;
    issuingCountry?: ExtractedField;
    sex?: ExtractedField;
    placeOfBirth?: ExtractedField;
  };
  mrzData?: MRZData;
  validationChecks: ValidationCheck[];
  visaEligibility: {
    eligible: boolean;
    confidence: number;
    reasons: string[];
  };
  recommendedActions: string[];
  summary: string;
}
