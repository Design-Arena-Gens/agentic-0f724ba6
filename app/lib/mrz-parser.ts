import { MRZData } from '../types';

export class MRZParser {
  static parseMRZ(mrzLines: string[]): MRZData | null {
    if (!mrzLines || mrzLines.length < 2) return null;

    // Clean lines
    const lines = mrzLines.map(line => line.replace(/[^A-Z0-9<]/g, ''));

    // TD3 format (passports) - 2 lines of 44 characters
    if (lines.length === 2 && lines[0].length === 44 && lines[1].length === 44) {
      return this.parseTD3(lines);
    }

    // TD1 format (ID cards) - 3 lines of 30 characters
    if (lines.length === 3 && lines[0].length === 30) {
      return this.parseTD1(lines);
    }

    return null;
  }

  private static parseTD3(lines: string[]): MRZData {
    const line1 = lines[0];
    const line2 = lines[1];

    const documentType = line1.substring(0, 2).replace(/<+$/, '');
    const issuingCountry = line1.substring(2, 5).replace(/<+$/, '');
    const names = line1.substring(5, 44).split('<<');
    const surname = names[0]?.replace(/</g, ' ').trim() || '';
    const givenNames = names[1]?.replace(/</g, ' ').trim() || '';

    const documentNumber = line2.substring(0, 9).replace(/<+$/, '');
    const documentNumberChecksum = line2.substring(9, 10);
    const nationality = line2.substring(10, 13).replace(/<+$/, '');
    const dateOfBirth = this.parseDate(line2.substring(13, 19));
    const dobChecksum = line2.substring(19, 20);
    const sex = line2.substring(20, 21);
    const expiryDate = this.parseDate(line2.substring(21, 27));
    const expiryChecksum = line2.substring(27, 28);

    // Validate checksums
    const checksumValid =
      this.validateChecksum(line2.substring(0, 9), documentNumberChecksum) &&
      this.validateChecksum(line2.substring(13, 19), dobChecksum) &&
      this.validateChecksum(line2.substring(21, 27), expiryChecksum);

    return {
      documentType,
      issuingCountry,
      documentNumber,
      dateOfBirth,
      expiryDate,
      nationality,
      surname,
      givenNames,
      sex,
      checksumValid,
    };
  }

  private static parseTD1(lines: string[]): MRZData {
    const line1 = lines[0];
    const line2 = lines[1];
    const line3 = lines[2];

    const documentType = line1.substring(0, 2).replace(/<+$/, '');
    const issuingCountry = line1.substring(2, 5).replace(/<+$/, '');
    const documentNumber = line1.substring(5, 14).replace(/<+$/, '');

    const dateOfBirth = this.parseDate(line2.substring(0, 6));
    const sex = line2.substring(7, 8);
    const expiryDate = this.parseDate(line2.substring(8, 14));
    const nationality = line2.substring(15, 18).replace(/<+$/, '');

    const names = line3.split('<<');
    const surname = names[0]?.replace(/</g, ' ').trim() || '';
    const givenNames = names[1]?.replace(/</g, ' ').trim() || '';

    return {
      documentType,
      issuingCountry,
      documentNumber,
      dateOfBirth,
      expiryDate,
      nationality,
      surname,
      givenNames,
      sex,
      checksumValid: true, // Simplified for TD1
    };
  }

  private static parseDate(dateStr: string): string {
    if (!dateStr || dateStr.length !== 6) return '';

    const year = parseInt(dateStr.substring(0, 2));
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);

    // Assume 20xx for years < 50, 19xx for years >= 50
    const fullYear = year < 50 ? 2000 + year : 1900 + year;

    return `${fullYear}-${month}-${day}`;
  }

  private static validateChecksum(data: string, checksum: string): boolean {
    const weights = [7, 3, 1];
    let sum = 0;

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      let value: number;

      if (char >= '0' && char <= '9') {
        value = parseInt(char);
      } else if (char >= 'A' && char <= 'Z') {
        value = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      } else {
        value = 0; // '<' is treated as 0
      }

      sum += value * weights[i % 3];
    }

    const calculatedChecksum = (sum % 10).toString();
    return calculatedChecksum === checksum;
  }

  static extractMRZFromText(text: string): string[] {
    const lines = text.split('\n').map(line => line.trim());
    const mrzLines: string[] = [];

    // Look for lines with typical MRZ patterns
    for (const line of lines) {
      // MRZ lines typically have many uppercase letters and < characters
      const cleanLine = line.replace(/\s/g, '');
      const mrzPattern = /^[A-Z0-9<]{28,44}$/;

      if (mrzPattern.test(cleanLine)) {
        mrzLines.push(cleanLine);
      }
    }

    return mrzLines;
  }
}
