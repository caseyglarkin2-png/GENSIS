/**
 * PDF Generation Service
 * 
 * Generates executive PDF reports using Playwright for HTML → PDF conversion.
 * Includes Network Rollout Brief with hero line and watermark rules.
 */

import { chromium, type Browser } from 'playwright';
import type { NetworkROI } from '../types';
import type { ROIConfidenceResult, DataCompletenessResult } from './scoring';

export interface PDFGenerationOptions {
  format?: 'Letter' | 'A4';
  landscape?: boolean;
  displayHeaderFooter?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

export interface NetworkReportData {
  networkId: string;
  networkName: string;
  facilityCoun: number;
  verifiedCount: number;
  networkROI: NetworkROI;
  avgROIConfidence: number;
  avgDataCompleteness: number;
  assumptionsVersion: string;
  scoringVersion: string;
  facilities: Array<{
    id: string;
    name: string;
    city: string;
    state: string;
    verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'UNVERIFIED';
    projectedAnnualROI: number;
    dataCompletenessScore: number;
    roiConfidenceScore: number;
    priorityScore?: number;
  }>;
}

export interface FacilityReportData {
  facilityId: string;
  facilityName: string;
  address: string;
  verificationStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'UNVERIFIED';
  centroid?: [number, number];
  hasPolygon: boolean;
  projectedAnnualROI: number;
  projectedMonthlyROI: number;
  delayCostPerMonth: number;
  roiConfidence: ROIConfidenceResult;
  dataCompleteness: DataCompletenessResult;
  roiComponents: Array<{
    name: string;
    annualSavings: number;
    confidence: number;
    enabled: boolean;
  }>;
  assumptionsVersion: string;
}

/**
 * Generate Network Rollout Brief PDF
 */
export async function generateNetworkReportPDF(
  data: NetworkReportData,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    
    // Generate HTML content
    const html = generateNetworkReportHTML(data);
    
    await page.setContent(html, {
      waitUntil: 'networkidle',
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: options.format || 'Letter',
      landscape: options.landscape || false,
      printBackground: true,
      displayHeaderFooter: options.displayHeaderFooter || false,
      margin: options.margin || {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

/**
 * Generate Facility One-Pager PDF
 */
export async function generateFacilityReportPDF(
  data: FacilityReportData,
  options: PDFGenerationOptions = {}
): Promise<Buffer> {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    
    const html = generateFacilityReportHTML(data);
    
    await page.setContent(html, {
      waitUntil: 'networkidle',
    });

    const pdf = await page.pdf({
      format: options.format || 'Letter',
      landscape: options.landscape || false,
      printBackground: true,
      displayHeaderFooter: options.displayHeaderFooter || false,
      margin: options.margin || {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

/**
 * Generate HTML for Network Rollout Brief
 */
function generateNetworkReportHTML(data: NetworkReportData): string {
  const verifiedPercent = data.facilityCoun > 0
    ? Math.round((data.verifiedCount / data.facilityCoun) * 100)
    : 0;

  const shouldWatermark = 
    data.avgROIConfidence < 70 || 
    verifiedPercent < 70;

  const roiConfidenceLevel = getConfidenceLevel(data.avgROIConfidence);
  const completenessLevel = getCompletenessLevel(data.avgDataCompleteness);

  const delayCostMonthly = data.networkROI.aggregateRoi.delayCostPerMonth;
  const delayCostWeekly = data.networkROI.aggregateRoi.delayCostPerWeek;
  const totalAnnualROI = data.networkROI.aggregateRoi.projectedAnnualRoi;

  // Top 10 facilities
  const topFacilities = [...data.facilities]
    .sort((a, b) => b.projectedAnnualROI - a.projectedAnnualROI)
    .slice(0, 10);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Network Rollout Brief - ${data.networkName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      position: relative;
    }
    
    ${shouldWatermark ? `
    body::before {
      content: "DIRECTIONAL ESTIMATE — VALIDATE INPUTS";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 72px;
      font-weight: bold;
      color: rgba(220, 38, 38, 0.1);
      z-index: 9999;
      pointer-events: none;
      white-space: nowrap;
    }
    ` : ''}
    
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
      padding: 2rem;
    }
    
    .hero-line {
      font-size: 48px;
      font-weight: bold;
      color: #dc2626;
      margin-bottom: 1.5rem;
      line-height: 1.2;
    }
    
    .hero-amount {
      font-size: 72px;
      color: #991b1b;
    }
    
    .subline {
      font-size: 24px;
      color: #4b5563;
      margin-bottom: 3rem;
    }
    
    .badges {
      display: flex;
      gap: 2rem;
      justify-content: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    
    .badge {
      background: #f3f4f6;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      text-align: center;
      min-width: 200px;
    }
    
    .badge-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
    
    .badge-value {
      font-size: 20px;
      font-weight: bold;
      color: #1a1a1a;
    }
    
    .badge-score {
      font-size: 16px;
      color: #6b7280;
    }
    
    .metadata {
      margin-top: 3rem;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }
    
    .page {
      padding: 2rem;
      page-break-after: always;
    }
    
    h1 {
      font-size: 32px;
      margin-bottom: 1.5rem;
      color: #1a1a1a;
    }
    
    h2 {
      font-size: 24px;
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: #374151;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 14px;
      color: #374151;
    }
    
    td {
      font-size: 14px;
    }
    
    .status-verified {
      color: #059669;
      font-weight: 600;
    }
    
    .status-needs-review {
      color: #d97706;
      font-weight: 600;
    }
    
    .status-unverified {
      color: #dc2626;
      font-weight: 600;
    }
    
    .metric-box {
      background: #f9fafb;
      padding: 1.5rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    
    .metric-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .metric-row:last-child {
      border-bottom: none;
    }
    
    .metric-label {
      font-weight: 600;
      color: #374151;
    }
    
    .metric-value {
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="hero-line">
      You are burning<br>
      <span class="hero-amount">~$${delayCostMonthly.toLocaleString()}/month</span><br>
      by waiting.
    </div>
    
    <div class="subline">
      Delay tax: ~$${delayCostWeekly.toLocaleString()}/week • Annual opportunity: ~$${totalAnnualROI.toLocaleString()}/year
    </div>
    
    <div class="badges">
      <div class="badge">
        <div class="badge-label">ROI Confidence</div>
        <div class="badge-value">${roiConfidenceLevel}</div>
        <div class="badge-score">${data.avgROIConfidence}/100</div>
      </div>
      
      <div class="badge">
        <div class="badge-label">Data Readiness</div>
        <div class="badge-value">${completenessLevel}</div>
        <div class="badge-score">${data.avgDataCompleteness}/100</div>
      </div>
      
      <div class="badge">
        <div class="badge-label">Verified Facilities</div>
        <div class="badge-value">${data.verifiedCount}/${data.facilityCoun}</div>
        <div class="badge-score">${verifiedPercent}%</div>
      </div>
    </div>
    
    <div class="metadata">
      <div><strong>Network:</strong> ${data.networkName}</div>
      <div><strong>Assumptions version:</strong> ${data.assumptionsVersion}</div>
      <div><strong>Scoring model version:</strong> ${data.scoringVersion}</div>
      <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
    </div>
  </div>
  
  <!-- EXECUTIVE SUMMARY -->
  <div class="page">
    <h1>Executive Summary</h1>
    
    <div class="metric-box">
      <div class="metric-row">
        <span class="metric-label">Total Network Facilities</span>
        <span class="metric-value">${data.facilityCoun}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Total Annual ROI</span>
        <span class="metric-value">$${totalAnnualROI.toLocaleString()}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Projected Monthly Savings</span>
        <span class="metric-value">$${data.networkROI.aggregateRoi.projectedMonthlyRoi.toLocaleString()}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Payback Period</span>
        <span class="metric-value">${data.networkROI.aggregateRoi.paybackPeriodMonths || 6} months</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Confidence Level</span>
        <span class="metric-value">${data.networkROI.confidence.roiConfidenceLevel}</span>
      </div>
    </div>
    
    <h2>Top 10 Facilities by ROI</h2>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Facility</th>
          <th>Location</th>
          <th>Status</th>
          <th>Annual ROI</th>
          <th>Data Score</th>
        </tr>
      </thead>
      <tbody>
        ${topFacilities.map((f, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${f.name}</td>
          <td>${f.city}, ${f.state}</td>
          <td class="status-${f.verificationStatus.toLowerCase().replace('_', '-')}">${f.verificationStatus}</td>
          <td>$${f.projectedAnnualROI.toLocaleString()}</td>
          <td>${f.dataCompletenessScore}/100</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- ROI BREAKDOWN -->
  <div class="page">
    <h1>ROI Breakdown</h1>
    <p>Total annual savings: <strong>$${totalAnnualROI.toLocaleString()}</strong></p>
    <p>Average ROI confidence: <strong>${data.avgROIConfidence}/100 (${roiConfidenceLevel})</strong></p>
    
    ${shouldWatermark ? `
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 1rem; margin: 1rem 0;">
      <strong>⚠️ Confidence Warning</strong><br>
      This estimate is marked as <strong>DIRECTIONAL</strong> because:
      <ul style="margin-left: 1.5rem; margin-top: 0.5rem;">
        ${data.avgROIConfidence < 70 ? '<li>ROI confidence is below 70%</li>' : ''}
        ${verifiedPercent < 70 ? '<li>Less than 70% of facilities have verified geometry</li>' : ''}
      </ul>
      <p style="margin-top: 0.5rem;"><strong>Action:</strong> Verify facility locations and update operational metrics to increase confidence.</p>
    </div>
    ` : ''}
    
    <h2>Key Assumptions</h2>
    <div class="metric-box">
      <div class="metric-row">
        <span class="metric-label">Detention Cost per Hour</span>
        <span class="metric-value">$75</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Labor Cost per Hour</span>
        <span class="metric-value">$28</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Target Turn Time</span>
        <span class="metric-value">18 minutes</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Target Detention</span>
        <span class="metric-value">5 minutes/truck</span>
      </div>
    </div>
  </div>
  
  <!-- DATA HEALTH -->
  <div class="page">
    <h1>Data Health</h1>
    <p>Average data completeness: <strong>${data.avgDataCompleteness}/100 (${completenessLevel})</strong></p>
    
    <h2>Facility Verification Status</h2>
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="status-verified">VERIFIED</td>
          <td>${data.verifiedCount}</td>
          <td>${verifiedPercent}%</td>
        </tr>
        <tr>
          <td>Needs Review + Unverified</td>
          <td>${data.facilityCoun - data.verifiedCount}</td>
          <td>${100 - verifiedPercent}%</td>
        </tr>
      </tbody>
    </table>
    
    <h2>Recommendations</h2>
    <ol style="margin-left: 1.5rem;">
      <li>Verify geometry for ${data.facilityCoun - data.verifiedCount} unverified facilities</li>
      <li>Update operational metrics (trucks/day, turn times, detention)</li>
      <li>Add evidence links to increase metric confidence</li>
      <li>Identify and document facility bottlenecks</li>
    </ol>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate HTML for Facility One-Pager
 */
function generateFacilityReportHTML(data: FacilityReportData): string {
  const shouldWatermark = 
    data.roiConfidence.score < 70 || 
    data.verificationStatus !== 'VERIFIED';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Facility Report - ${data.facilityName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      padding: 2rem;
      position: relative;
    }
    
    ${shouldWatermark ? `
    body::before {
      content: "UNVERIFIED GEOMETRY";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 72px;
      font-weight: bold;
      color: rgba(220, 38, 38, 0.1);
      z-index: 9999;
      pointer-events: none;
      white-space: nowrap;
    }
    ` : ''}
    
    h1 {
      font-size: 32px;
      margin-bottom: 0.5rem;
    }
    
    .subtitle {
      color: #6b7280;
      font-size: 18px;
      margin-bottom: 2rem;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin: 2rem 0;
    }
    
    .metric-card {
      background: #f9fafb;
      padding: 1.5rem;
      border-radius: 8px;
    }
    
    .metric-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }
    
    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      background: #f9fafb;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>${data.facilityName}</h1>
  <div class="subtitle">${data.address}</div>
  
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Annual ROI</div>
      <div class="metric-value">$${data.projectedAnnualROI.toLocaleString()}</div>
    </div>
    
    <div class="metric-card">
      <div class="metric-label">Monthly Delay Cost</div>
      <div class="metric-value">$${data.delayCostPerMonth.toLocaleString()}</div>
    </div>
    
    <div class="metric-card">
      <div class="metric-label">ROI Confidence</div>
      <div class="metric-value">${data.roiConfidence.score}/100</div>
    </div>
    
    <div class="metric-card">
      <div class="metric-label">Data Completeness</div>
      <div class="metric-value">${data.dataCompleteness.score}/100</div>
    </div>
  </div>
  
  <h2>ROI Components</h2>
  <table>
    <thead>
      <tr>
        <th>Component</th>
        <th>Annual Savings</th>
        <th>Confidence</th>
      </tr>
    </thead>
    <tbody>
      ${data.roiComponents.filter(c => c.enabled).map(c => `
      <tr>
        <td>${c.name}</td>
        <td>$${c.annualSavings.toLocaleString()}</td>
        <td>${c.confidence}/100</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
  `.trim();
}

function getConfidenceLevel(score: number): string {
  if (score >= 85) return 'Boardroom-Ready';
  if (score >= 70) return 'Defensible';
  if (score >= 40) return 'Directional';
  return 'Speculative';
}

function getCompletenessLevel(score: number): string {
  if (score >= 85) return 'Exec-Ready';
  if (score >= 70) return 'Rollout-Ready';
  if (score >= 40) return 'Planning';
  return 'Discovery';
}
