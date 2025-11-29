'use client';

import { useState } from 'react';
import { VerificationResult, ApplicantForm, EligibilityPolicy } from './types';

export default function Home() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [applicantForm, setApplicantForm] = useState<ApplicantForm>({
    name: '',
    dateOfBirth: '',
    passportNumber: '',
    nationality: '',
    intendedVisaType: '',
  });
  const [policy, setPolicy] = useState<EligibilityPolicy>({
    minAge: 18,
    maxAge: 100,
    minPassportValidity: 6,
  });
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = async () => {
    if (!imageFile) {
      setError('Please select an image file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      // Only include applicant form if at least one field is filled
      if (Object.values(applicantForm).some(val => val.trim() !== '')) {
        formData.append('applicantForm', JSON.stringify(applicantForm));
      }

      formData.append('policy', JSON.stringify(policy));

      const response = await fetch('/api/verify', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      const data: VerificationResult = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Document Verifier
          </h1>
          <p className="text-xl text-gray-600">
            Advanced verification for passports, visas, IDs, and travel documents
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Document preview"
                    className="max-w-full h-auto rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Applicant Information (Optional)
              </h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={applicantForm.name}
                  onChange={(e) =>
                    setApplicantForm({ ...applicantForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="date"
                  placeholder="Date of Birth"
                  value={applicantForm.dateOfBirth}
                  onChange={(e) =>
                    setApplicantForm({ ...applicantForm, dateOfBirth: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Passport Number"
                  value={applicantForm.passportNumber}
                  onChange={(e) =>
                    setApplicantForm({ ...applicantForm, passportNumber: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Nationality (e.g., USA, GBR)"
                  value={applicantForm.nationality}
                  onChange={(e) =>
                    setApplicantForm({ ...applicantForm, nationality: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Intended Visa Type"
                  value={applicantForm.intendedVisaType}
                  onChange={(e) =>
                    setApplicantForm({
                      ...applicantForm,
                      intendedVisaType: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Eligibility Policy
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Min Age</label>
                    <input
                      type="number"
                      value={policy.minAge || ''}
                      onChange={(e) =>
                        setPolicy({ ...policy, minAge: parseInt(e.target.value) || undefined })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Max Age</label>
                    <input
                      type="number"
                      value={policy.maxAge || ''}
                      onChange={(e) =>
                        setPolicy({ ...policy, maxAge: parseInt(e.target.value) || undefined })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Min Passport Validity (months)
                  </label>
                  <input
                    type="number"
                    value={policy.minPassportValidity || ''}
                    onChange={(e) =>
                      setPolicy({
                        ...policy,
                        minPassportValidity: parseInt(e.target.value) || undefined,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || !imageFile}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Document'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Verification Results</h2>

            {!result && !loading && (
              <div className="text-center text-gray-500 py-12">
                <svg
                  className="mx-auto h-24 w-24 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-lg">Upload a document to get started</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-lg text-gray-600">Analyzing document...</p>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                  <p className="text-gray-700">{result.summary}</p>
                </div>

                {/* Overall Confidence */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-900">Overall Confidence</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      {result.overallConfidence}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        result.overallConfidence >= 80
                          ? 'bg-green-500'
                          : result.overallConfidence >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${result.overallConfidence}%` }}
                    ></div>
                  </div>
                </div>

                {/* Document Type */}
                <div>
                  <span className="font-semibold text-gray-900">Document Type: </span>
                  <span className="text-gray-700">{result.documentType}</span>
                </div>

                {/* Extracted Fields */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Extracted Fields</h3>
                  <div className="space-y-2">
                    {Object.entries(result.extractedFields).map(([key, field]) => (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="font-medium text-gray-900">
                          {field.value} ({field.confidence}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MRZ Data */}
                {result.mrzData && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">MRZ Data</h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Checksum Valid:</span>
                        <span
                          className={`font-medium ${
                            result.mrzData.checksumValid ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {result.mrzData.checksumValid ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Checks */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Validation Checks</h3>
                  <div className="space-y-2">
                    {result.validationChecks.map((check, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border-l-4 ${
                          check.status === 'pass'
                            ? 'bg-green-50 border-green-500'
                            : check.status === 'warning'
                            ? 'bg-yellow-50 border-yellow-500'
                            : 'bg-red-50 border-red-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-gray-900">{check.field}</span>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded ${
                              check.status === 'pass'
                                ? 'bg-green-100 text-green-800'
                                : check.status === 'warning'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {check.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visa Eligibility */}
                <div
                  className={`p-4 rounded-lg ${
                    result.visaEligibility.eligible
                      ? 'bg-green-50 border-2 border-green-500'
                      : 'bg-red-50 border-2 border-red-500'
                  }`}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">Visa Eligibility</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Status:</span>
                      <span
                        className={`font-bold ${
                          result.visaEligibility.eligible ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {result.visaEligibility.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Confidence:</span>
                      <span className="font-semibold">{result.visaEligibility.confidence}%</span>
                    </div>
                    <div className="mt-3">
                      <span className="text-sm font-medium text-gray-700">Reasons:</span>
                      <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                        {result.visaEligibility.reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Recommended Actions */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Recommended Actions</h3>
                  <ul className="space-y-1">
                    {result.recommendedActions.map((action, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* JSON Output */}
                <details className="bg-gray-50 p-4 rounded-lg">
                  <summary className="font-semibold text-gray-900 cursor-pointer">
                    View JSON Output
                  </summary>
                  <pre className="mt-3 text-xs overflow-auto bg-gray-900 text-green-400 p-4 rounded">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
