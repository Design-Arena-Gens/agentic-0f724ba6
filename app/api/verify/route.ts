import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import { MRZParser } from '../../lib/mrz-parser';
import { DocumentValidator } from '../../lib/document-validator';
import {
  VerificationResult,
  ExtractedField,
  ApplicantForm,
  EligibilityPolicy,
  MRZData,
} from '../../types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const applicantFormStr = formData.get('applicantForm') as string;
    const policyStr = formData.get('policy') as string;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Convert image to buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Perform OCR
    const worker = await createWorker('eng');
    const { data: { text, confidence } } = await worker.recognize(buffer);
    await worker.terminate();

    // Extract document information
    const extractedFields = extractDocumentFields(text);

    // Parse MRZ if present
    const mrzLines = MRZParser.extractMRZFromText(text);
    const mrzData = MRZParser.parseMRZ(mrzLines);

    // Enhance extracted fields with MRZ data
    if (mrzData) {
      if (!extractedFields.documentNumber && mrzData.documentNumber) {
        extractedFields.documentNumber = {
          value: mrzData.documentNumber,
          confidence: 90,
        };
      }
      if (!extractedFields.fullName) {
        extractedFields.fullName = {
          value: `${mrzData.givenNames} ${mrzData.surname}`.trim(),
          confidence: 90,
        };
      }
      if (!extractedFields.dateOfBirth && mrzData.dateOfBirth) {
        extractedFields.dateOfBirth = {
          value: mrzData.dateOfBirth,
          confidence: 90,
        };
      }
      if (!extractedFields.expiryDate && mrzData.expiryDate) {
        extractedFields.expiryDate = {
          value: mrzData.expiryDate,
          confidence: 90,
        };
      }
      if (!extractedFields.nationality && mrzData.nationality) {
        extractedFields.nationality = {
          value: mrzData.nationality,
          confidence: 90,
        };
      }
      if (!extractedFields.sex && mrzData.sex) {
        extractedFields.sex = {
          value: mrzData.sex,
          confidence: 90,
        };
      }
    }

    // Parse applicant form and policy
    const applicantForm: ApplicantForm | undefined = applicantFormStr
      ? JSON.parse(applicantFormStr)
      : undefined;
    const policy: EligibilityPolicy | undefined = policyStr
      ? JSON.parse(policyStr)
      : undefined;

    // Determine document type
    const documentType = determineDocumentType(text, mrzData);

    // Calculate overall confidence
    const fieldConfidences = Object.values(extractedFields).map(
      (field: any) => field.confidence
    );
    const overallConfidence = fieldConfidences.length > 0
      ? Math.round(
          fieldConfidences.reduce((sum, conf) => sum + conf, 0) /
            fieldConfidences.length
        )
      : Math.round(confidence);

    // Validate document
    const validationChecks = DocumentValidator.validateDocument(
      extractedFields,
      mrzData,
      applicantForm,
      policy
    );

    // Assess eligibility
    const visaEligibility = DocumentValidator.assessEligibility(
      validationChecks,
      applicantForm,
      policy
    );

    // Generate recommendations
    const recommendedActions = DocumentValidator.generateRecommendations(
      validationChecks,
      visaEligibility,
      overallConfidence
    );

    // Generate summary
    const summary = DocumentValidator.generateSummary(
      documentType,
      visaEligibility,
      overallConfidence,
      extractedFields
    );

    const result: VerificationResult = {
      overallConfidence,
      documentType,
      extractedFields,
      mrzData: mrzData || undefined,
      validationChecks,
      visaEligibility,
      recommendedActions,
      summary,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

function extractDocumentFields(text: string): any {
  const fields: any = {};

  // Passport number patterns
  const passportPatterns = [
    /(?:passport|document)\s*(?:no|number|#)?\s*:?\s*([A-Z0-9]{6,12})/i,
    /\b([A-Z]{1,2}\d{7,9})\b/,
  ];

  for (const pattern of passportPatterns) {
    const match = text.match(pattern);
    if (match) {
      fields.documentNumber = {
        value: match[1].toUpperCase(),
        confidence: 75,
      };
      break;
    }
  }

  // Name patterns
  const namePatterns = [
    /(?:name|surname|given\s*names?)\s*:?\s*([A-Z][A-Z\s]{2,40})/i,
    /([A-Z]{2,})\s+([A-Z]{2,}(?:\s+[A-Z]{2,})?)/,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      fields.fullName = {
        value: match[1]?.trim() || `${match[1]} ${match[2]}`.trim(),
        confidence: 70,
      };
      break;
    }
  }

  // Date patterns (ISO 8601 preferred)
  const datePatterns = [
    /(?:birth|born|dob)\s*:?\s*(\d{4}-\d{2}-\d{2})/i,
    /(?:birth|born|dob)\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      fields.dateOfBirth = {
        value: normalizeDate(match[1]),
        confidence: 70,
      };
      break;
    }
  }

  // Expiry date patterns
  const expiryPatterns = [
    /(?:expiry|expires|valid\s*until)\s*:?\s*(\d{4}-\d{2}-\d{2})/i,
    /(?:expiry|expires|valid\s*until)\s*:?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
  ];

  for (const pattern of expiryPatterns) {
    const match = text.match(pattern);
    if (match) {
      fields.expiryDate = {
        value: normalizeDate(match[1]),
        confidence: 70,
      };
      break;
    }
  }

  // Nationality patterns
  const nationalityPatterns = [
    /(?:nationality|citizen)\s*:?\s*([A-Z]{2,3}|[A-Z][a-z]{2,20})/i,
  ];

  for (const pattern of nationalityPatterns) {
    const match = text.match(pattern);
    if (match) {
      fields.nationality = {
        value: match[1].toUpperCase(),
        confidence: 70,
      };
      break;
    }
  }

  // Sex patterns
  const sexPatterns = [/(?:sex|gender)\s*:?\s*([MF])/i];

  for (const pattern of sexPatterns) {
    const match = text.match(pattern);
    if (match) {
      fields.sex = {
        value: match[1].toUpperCase(),
        confidence: 80,
      };
      break;
    }
  }

  return fields;
}

function normalizeDate(dateStr: string): string {
  // If already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
  const match = dateStr.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return dateStr;
}

function determineDocumentType(text: string, mrzData: MRZData | null): string {
  const textLower = text.toLowerCase();

  if (mrzData?.documentType) {
    const docType = mrzData.documentType;
    if (docType.startsWith('P')) return 'Passport';
    if (docType.startsWith('I')) return 'ID Card';
    if (docType.startsWith('V')) return 'Visa';
  }

  if (textLower.includes('passport')) return 'Passport';
  if (textLower.includes('visa')) return 'Visa';
  if (textLower.includes('identity') || textLower.includes('national id'))
    return 'National ID';
  if (
    textLower.includes('driving') ||
    textLower.includes('driver') ||
    textLower.includes('licence')
  )
    return 'Driving Licence';

  return 'Unknown Document';
}
