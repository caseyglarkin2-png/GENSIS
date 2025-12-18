'use client';

/**
 * CSV Import Page
 * 
 * Wizard for importing facilities from CSV:
 * 1. File upload
 * 2. Column mapping
 * 3. Preview & validation
 * 4. Import confirmation
 */

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  name: string;
  facilityType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: string;
  longitude?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = ['name', 'address', 'city', 'state', 'zipCode'];
const OPTIONAL_FIELDS: (keyof ColumnMapping)[] = ['facilityType', 'country', 'latitude', 'longitude'];

export default function CSVImportPage() {
  const params = useParams();
  const router = useRouter();
  const networkId = params.id as string;

  const [step, setStep] = useState<ImportStep>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    facilityType: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  // Parse CSV file
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter((line) => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must have at least a header row and one data row');
        return;
      }

      // Parse headers
      const headers = parseCSVLine(lines[0]);
      setCsvHeaders(headers);

      // Parse data rows
      const data = lines.slice(1).map((line) => {
        const values = parseCSVLine(line);
        const row: CSVRow = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        return row;
      });
      setCsvData(data);

      // Auto-map common column names
      const autoMapping: ColumnMapping = {
        name: '',
        facilityType: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      };

      const headerLower = headers.map((h) => h.toLowerCase());
      
      // Name mappings
      const nameIdx = headerLower.findIndex((h) => 
        h.includes('name') || h.includes('facility') || h.includes('location')
      );
      if (nameIdx >= 0) autoMapping.name = headers[nameIdx];

      // Type mappings
      const typeIdx = headerLower.findIndex((h) => 
        h.includes('type') || h.includes('category')
      );
      if (typeIdx >= 0) autoMapping.facilityType = headers[typeIdx];

      // Address mappings
      const addrIdx = headerLower.findIndex((h) => 
        h === 'address' || h.includes('street') || h.includes('address1')
      );
      if (addrIdx >= 0) autoMapping.address = headers[addrIdx];

      // City mapping
      const cityIdx = headerLower.findIndex((h) => h === 'city');
      if (cityIdx >= 0) autoMapping.city = headers[cityIdx];

      // State mapping
      const stateIdx = headerLower.findIndex((h) => 
        h === 'state' || h === 'province' || h === 'region'
      );
      if (stateIdx >= 0) autoMapping.state = headers[stateIdx];

      // Zip mapping
      const zipIdx = headerLower.findIndex((h) => 
        h.includes('zip') || h.includes('postal')
      );
      if (zipIdx >= 0) autoMapping.zipCode = headers[zipIdx];

      // Country mapping
      const countryIdx = headerLower.findIndex((h) => h.includes('country'));
      if (countryIdx >= 0) autoMapping.country = headers[countryIdx];

      // Latitude/Longitude mapping
      const latIdx = headerLower.findIndex((h) => 
        h === 'lat' || h === 'latitude' || h === 'y'
      );
      if (latIdx >= 0) autoMapping.latitude = headers[latIdx];

      const lngIdx = headerLower.findIndex((h) => 
        h === 'lng' || h === 'lon' || h === 'longitude' || h === 'long' || h === 'x'
      );
      if (lngIdx >= 0) autoMapping.longitude = headers[lngIdx];

      setMapping(autoMapping);
      setStep('mapping');
    };
    reader.readAsText(file);
  }, []);

  // Parse a CSV line (handling quoted values)
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  // Update column mapping
  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  // Validate data
  const validateData = useCallback(() => {
    const errors: ValidationError[] = [];

    csvData.forEach((row, idx) => {
      const rowNum = idx + 2; // +2 for 1-indexing and header row

      // Check required fields
      if (!mapping.name || !row[mapping.name]?.trim()) {
        errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
      }
      if (!mapping.address || !row[mapping.address]?.trim()) {
        errors.push({ row: rowNum, field: 'address', message: 'Address is required' });
      }
      if (!mapping.city || !row[mapping.city]?.trim()) {
        errors.push({ row: rowNum, field: 'city', message: 'City is required' });
      }
      if (!mapping.state || !row[mapping.state]?.trim()) {
        errors.push({ row: rowNum, field: 'state', message: 'State is required' });
      }
      if (!mapping.zipCode || !row[mapping.zipCode]?.trim()) {
        errors.push({ row: rowNum, field: 'zipCode', message: 'ZIP code is required' });
      }

      // Validate coordinates if provided
      if (mapping.latitude && row[mapping.latitude]) {
        const lat = parseFloat(row[mapping.latitude]);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          errors.push({ row: rowNum, field: 'latitude', message: 'Invalid latitude' });
        }
      }
      if (mapping.longitude && row[mapping.longitude]) {
        const lng = parseFloat(row[mapping.longitude]);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          errors.push({ row: rowNum, field: 'longitude', message: 'Invalid longitude' });
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [csvData, mapping]);

  // Proceed to preview
  const handleProceedToPreview = () => {
    // Check required mappings
    for (const field of REQUIRED_FIELDS) {
      if (!mapping[field]) {
        alert(`Please map the ${field} field`);
        return;
      }
    }

    if (validateData()) {
      setStep('preview');
    } else {
      setStep('preview'); // Still show preview, but with errors highlighted
    }
  };

  // Execute import
  const handleImport = async () => {
    if (validationErrors.length > 0) {
      const proceed = confirm(
        `There are ${validationErrors.length} validation errors. Rows with errors will be skipped. Continue?`
      );
      if (!proceed) return;
    }

    try {
      setImporting(true);
      setStep('importing');

      // Build facilities array
      const facilities = csvData
        .filter((row, idx) => {
          const rowNum = idx + 2;
          return !validationErrors.some((e) => e.row === rowNum);
        })
        .map((row) => ({
          name: row[mapping.name],
          facilityType: mapping.facilityType ? row[mapping.facilityType] : 'WAREHOUSE',
          address: row[mapping.address],
          city: row[mapping.city],
          state: row[mapping.state],
          zipCode: row[mapping.zipCode],
          country: mapping.country ? row[mapping.country] : 'USA',
          centroidLat: mapping.latitude && row[mapping.latitude] 
            ? parseFloat(row[mapping.latitude]) 
            : undefined,
          centroidLng: mapping.longitude && row[mapping.longitude]
            ? parseFloat(row[mapping.longitude])
            : undefined,
        }));

      const res = await fetch(`/api/networks/${networkId}/import/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilities }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);
      setStep('complete');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload CSV File</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Upload a CSV file with facility data. Required columns: Name, Address, City, State, ZIP Code.
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Choose File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <p className="mt-4 text-sm text-gray-400">Maximum file size: 10MB</p>
          </div>
        );

      case 'mapping':
        return (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Map Columns</h2>
            <p className="text-gray-500 mb-6">
              Match your CSV columns to the required facility fields.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {/* Required fields */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Required Fields</h3>
                <div className="space-y-4">
                  {REQUIRED_FIELDS.map((field) => (
                    <div key={field}>
                      <label className="block text-sm text-gray-600 mb-1 capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={mapping[field]}
                        onChange={(e) => updateMapping(field, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          !mapping[field] ? 'border-red-300' : ''
                        }`}
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional fields */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Optional Fields</h3>
                <div className="space-y-4">
                  {OPTIONAL_FIELDS.map((field) => (
                    <div key={field}>
                      <label className="block text-sm text-gray-600 mb-1 capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => updateMapping(field, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">None</option>
                        {csvHeaders.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sample data preview */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Sample Data Preview</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row</th>
                      {csvHeaders.slice(0, 6).map((header) => (
                        <th key={header} className="px-4 py-2 text-left text-xs font-medium text-gray-500 truncate max-w-32">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {csvData.slice(0, 3).map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                        {csvHeaders.slice(0, 6).map((header) => (
                          <td key={header} className="px-4 py-2 truncate max-w-32">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Showing first 3 of {csvData.length} rows
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleProceedToPreview}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'preview':
        return (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Import</h2>
            
            {/* Stats */}
            <div className="flex gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg px-4 py-3">
                <div className="text-2xl font-bold text-blue-600">{csvData.length}</div>
                <div className="text-sm text-blue-800">Total Rows</div>
              </div>
              <div className="bg-green-50 rounded-lg px-4 py-3">
                <div className="text-2xl font-bold text-green-600">
                  {csvData.length - validationErrors.filter((e, i, arr) => 
                    arr.findIndex((x) => x.row === e.row) === i
                  ).length}
                </div>
                <div className="text-sm text-green-800">Valid Rows</div>
              </div>
              <div className="bg-red-50 rounded-lg px-4 py-3">
                <div className="text-2xl font-bold text-red-600">
                  {validationErrors.filter((e, i, arr) => 
                    arr.findIndex((x) => x.row === e.row) === i
                  ).length}
                </div>
                <div className="text-sm text-red-800">Rows with Errors</div>
              </div>
            </div>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800 mb-2">Validation Errors</h3>
                <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                  {validationErrors.slice(0, 20).map((error, idx) => (
                    <li key={idx}>
                      Row {error.row}: {error.field} - {error.message}
                    </li>
                  ))}
                  {validationErrors.length > 20 && (
                    <li className="font-medium">
                      ... and {validationErrors.length - 20} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Preview table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Address</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">City</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">State</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ZIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {csvData.slice(0, 10).map((row, idx) => {
                    const rowNum = idx + 2;
                    const hasError = validationErrors.some((e) => e.row === rowNum);
                    return (
                      <tr key={idx} className={hasError ? 'bg-red-50' : ''}>
                        <td className="px-4 py-2">
                          {hasError ? (
                            <span className="text-red-600">❌</span>
                          ) : (
                            <span className="text-green-600">✓</span>
                          )}
                        </td>
                        <td className="px-4 py-2">{row[mapping.name] || '-'}</td>
                        <td className="px-4 py-2 truncate max-w-48">{row[mapping.address] || '-'}</td>
                        <td className="px-4 py-2">{row[mapping.city] || '-'}</td>
                        <td className="px-4 py-2">{row[mapping.state] || '-'}</td>
                        <td className="px-4 py-2">{row[mapping.zipCode] || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {csvData.length > 10 && (
              <p className="mt-2 text-xs text-gray-500">
                Showing first 10 of {csvData.length} rows
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Import {csvData.length - validationErrors.filter((e, i, arr) => 
                  arr.findIndex((x) => x.row === e.row) === i
                ).length} Facilities
              </button>
            </div>
          </div>
        );

      case 'importing':
        return (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-6 text-gray-600">Importing facilities...</p>
            <p className="text-sm text-gray-400">This may take a moment</p>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Import Complete!</h2>
            <p className="text-gray-500 mb-6">
              Successfully imported {importResult?.imported || 0} facilities.
            </p>
            
            {importResult?.errors && importResult.errors.length > 0 && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto text-left">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Warnings</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Link
                href={`/networks/${networkId}`}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                View Network
              </Link>
              <button
                onClick={() => {
                  setStep('upload');
                  setCsvHeaders([]);
                  setCsvData([]);
                  setMapping({
                    name: '',
                    facilityType: '',
                    address: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: '',
                  });
                  setValidationErrors([]);
                  setImportResult(null);
                }}
                className="px-6 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
              >
                Import More
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href={`/networks/${networkId}`} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Import Facilities</h1>
            <p className="text-sm text-gray-500">Upload a CSV file to add facilities to your network</p>
          </div>
        </div>
      </header>

      {/* Progress steps */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            {(['upload', 'mapping', 'preview', 'complete'] as const).map((s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-blue-600 text-white'
                      : step === 'complete' || 
                        (step === 'importing' && idx < 3) ||
                        (['mapping', 'preview', 'importing'].includes(step) && s === 'upload') ||
                        (['preview', 'importing'].includes(step) && s === 'mapping')
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step === 'complete' || 
                   (step === 'importing' && idx < 3) ||
                   (['mapping', 'preview', 'importing'].includes(step) && s === 'upload') ||
                   (['preview', 'importing'].includes(step) && s === 'mapping') ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`ml-2 text-sm ${
                    step === s ? 'font-medium text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {s === 'upload' && 'Upload'}
                  {s === 'mapping' && 'Map Columns'}
                  {s === 'preview' && 'Review'}
                  {s === 'complete' && 'Complete'}
                </span>
                {idx < 3 && (
                  <div className="w-12 h-px bg-gray-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6">
          {renderStepContent()}
        </div>
      </main>
    </div>
  );
}
