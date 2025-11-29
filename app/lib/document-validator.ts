import { ValidationCheck, MRZData, ApplicantForm, EligibilityPolicy } from '../types';
import { differenceInMonths, differenceInYears, parseISO, isBefore, isAfter } from 'date-fns';

export class DocumentValidator {
  static validateDocument(
    extractedData: any,
    mrzData: MRZData | null,
    applicantForm?: ApplicantForm,
    policy?: EligibilityPolicy
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Date format validation
    if (extractedData.dateOfBirth?.value) {
      checks.push(this.validateDateFormat(extractedData.dateOfBirth.value, 'Date of Birth'));
    }

    if (extractedData.expiryDate?.value) {
      checks.push(this.validateDateFormat(extractedData.expiryDate.value, 'Expiry Date'));
      checks.push(this.validateExpiryDate(extractedData.expiryDate.value));
    }

    // MRZ validation
    if (mrzData) {
      checks.push({
        field: 'MRZ Checksum',
        status: mrzData.checksumValid ? 'pass' : 'fail',
        message: mrzData.checksumValid
          ? 'MRZ checksums are valid'
          : 'MRZ checksum validation failed',
      });

      // Cross-check MRZ with extracted data
      if (extractedData.documentNumber?.value && mrzData.documentNumber) {
        const match = this.normalizeString(extractedData.documentNumber.value) ===
          this.normalizeString(mrzData.documentNumber);
        checks.push({
          field: 'Document Number',
          status: match ? 'pass' : 'warning',
          message: match
            ? 'Document number matches MRZ'
            : 'Document number differs from MRZ',
        });
      }

      // Name matching
      if (extractedData.fullName?.value) {
        const extractedName = this.normalizeString(extractedData.fullName.value);
        const mrzName = this.normalizeString(`${mrzData.givenNames} ${mrzData.surname}`);
        const similarity = this.calculateSimilarity(extractedName, mrzName);
        checks.push({
          field: 'Name',
          status: similarity > 0.8 ? 'pass' : similarity > 0.6 ? 'warning' : 'fail',
          message: `Name similarity: ${(similarity * 100).toFixed(0)}%`,
        });
      }
    }

    // Applicant form validation
    if (applicantForm && extractedData.documentNumber?.value) {
      const docMatch = this.normalizeString(applicantForm.passportNumber) ===
        this.normalizeString(extractedData.documentNumber.value);
      checks.push({
        field: 'Passport Number Match',
        status: docMatch ? 'pass' : 'fail',
        message: docMatch
          ? 'Passport number matches application'
          : 'Passport number does not match application',
      });
    }

    if (applicantForm && extractedData.dateOfBirth?.value) {
      const dobMatch = applicantForm.dateOfBirth === extractedData.dateOfBirth.value;
      checks.push({
        field: 'Date of Birth Match',
        status: dobMatch ? 'pass' : 'fail',
        message: dobMatch
          ? 'Date of birth matches application'
          : 'Date of birth does not match application',
      });
    }

    // Policy validation
    if (policy && extractedData.dateOfBirth?.value) {
      const age = this.calculateAge(extractedData.dateOfBirth.value);
      if (policy.minAge && age < policy.minAge) {
        checks.push({
          field: 'Age Requirement',
          status: 'fail',
          message: `Applicant is ${age} years old, minimum age is ${policy.minAge}`,
        });
      }
      if (policy.maxAge && age > policy.maxAge) {
        checks.push({
          field: 'Age Requirement',
          status: 'fail',
          message: `Applicant is ${age} years old, maximum age is ${policy.maxAge}`,
        });
      }
    }

    if (policy && extractedData.nationality?.value) {
      const nationality = extractedData.nationality.value;
      if (policy.allowedNationalities && !policy.allowedNationalities.includes(nationality)) {
        checks.push({
          field: 'Nationality',
          status: 'fail',
          message: `Nationality ${nationality} is not in allowed list`,
        });
      }
      if (policy.blockedNationalities && policy.blockedNationalities.includes(nationality)) {
        checks.push({
          field: 'Nationality',
          status: 'fail',
          message: `Nationality ${nationality} is blocked`,
        });
      }
    }

    if (policy && policy.minPassportValidity && extractedData.expiryDate?.value) {
      const monthsValid = differenceInMonths(
        parseISO(extractedData.expiryDate.value),
        new Date()
      );
      if (monthsValid < policy.minPassportValidity) {
        checks.push({
          field: 'Passport Validity',
          status: 'fail',
          message: `Passport valid for ${monthsValid} months, requires ${policy.minPassportValidity} months`,
        });
      }
    }

    return checks;
  }

  static assessEligibility(
    checks: ValidationCheck[],
    applicantForm?: ApplicantForm,
    policy?: EligibilityPolicy
  ): { eligible: boolean; confidence: number; reasons: string[] } {
    const failedChecks = checks.filter(c => c.status === 'fail');
    const warningChecks = checks.filter(c => c.status === 'warning');
    const passedChecks = checks.filter(c => c.status === 'pass');

    const eligible = failedChecks.length === 0;
    const totalChecks = checks.length || 1;
    const confidence = Math.round(
      ((passedChecks.length + warningChecks.length * 0.5) / totalChecks) * 100
    );

    const reasons: string[] = [];

    if (failedChecks.length > 0) {
      reasons.push(...failedChecks.map(c => `${c.field}: ${c.message}`));
    }

    if (warningChecks.length > 0) {
      reasons.push(...warningChecks.map(c => `Warning - ${c.field}: ${c.message}`));
    }

    if (eligible && passedChecks.length > 0) {
      reasons.push('All validation checks passed');
    }

    return { eligible, confidence, reasons };
  }

  static generateRecommendations(
    checks: ValidationCheck[],
    eligibility: { eligible: boolean; confidence: number; reasons: string[] },
    overallConfidence: number
  ): string[] {
    const recommendations: string[] = [];

    if (!eligibility.eligible) {
      recommendations.push('REJECT APPLICATION: Critical validation failures detected');
      const failedChecks = checks.filter(c => c.status === 'fail');
      failedChecks.forEach(check => {
        recommendations.push(`- Address issue: ${check.field}`);
      });
    } else if (overallConfidence < 60) {
      recommendations.push('MANUAL REVIEW REQUIRED: Low confidence in document extraction');
      recommendations.push('Request higher quality document images');
    } else if (overallConfidence < 80 || eligibility.confidence < 80) {
      recommendations.push('MANUAL REVIEW RECOMMENDED: Moderate confidence level');
      const warningChecks = checks.filter(c => c.status === 'warning');
      if (warningChecks.length > 0) {
        recommendations.push('Verify discrepancies manually');
      }
    } else {
      recommendations.push('APPROVE: All checks passed with high confidence');
      recommendations.push('Proceed with visa processing');
    }

    return recommendations;
  }

  static generateSummary(
    documentType: string,
    eligibility: { eligible: boolean; confidence: number; reasons: string[] },
    overallConfidence: number,
    extractedData: any
  ): string {
    const name = extractedData.fullName?.value || 'Unknown';
    const docNum = extractedData.documentNumber?.value || 'Unknown';
    const nationality = extractedData.nationality?.value || 'Unknown';

    const status = eligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
    const confidenceLevel = overallConfidence >= 80 ? 'HIGH' : overallConfidence >= 60 ? 'MODERATE' : 'LOW';

    return `Document verification complete for ${documentType} #${docNum} (${name}, ${nationality}). Status: ${status} with ${confidenceLevel} confidence (${overallConfidence}%). ${eligibility.eligible ? 'All validation checks passed.' : `Failed checks: ${eligibility.reasons.filter(r => !r.startsWith('Warning')).length}.`} ${overallConfidence < 80 ? 'Manual review recommended.' : ''}`;
  }

  private static validateDateFormat(date: string, fieldName: string): ValidationCheck {
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}$/;
    const isValid = iso8601Pattern.test(date);

    return {
      field: fieldName,
      status: isValid ? 'pass' : 'fail',
      message: isValid ? 'Date format is valid (ISO 8601)' : 'Date format is invalid',
    };
  }

  private static validateExpiryDate(expiryDate: string): ValidationCheck {
    try {
      const expiry = parseISO(expiryDate);
      const now = new Date();
      const isExpired = isBefore(expiry, now);

      return {
        field: 'Expiry Date',
        status: isExpired ? 'fail' : 'pass',
        message: isExpired ? 'Document has expired' : 'Document is valid',
      };
    } catch {
      return {
        field: 'Expiry Date',
        status: 'fail',
        message: 'Unable to parse expiry date',
      };
    }
  }

  private static calculateAge(dateOfBirth: string): number {
    try {
      return differenceInYears(new Date(), parseISO(dateOfBirth));
    } catch {
      return 0;
    }
  }

  private static normalizeString(str: string): string {
    return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
