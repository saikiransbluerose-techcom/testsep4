// ===== TOP OF FILE (before any tests) =====
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { test, expect } from '@playwright/test';
import { getSheetMap, getSheetRows } from '../utils/excel.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load .env from SiemensApplication/.env (this file lives in SiemensApplication/tests)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// load non-secret config
const CONFIG_PATH = path.resolve(__dirname, '../config/app.config.json');
if (!fs.existsSync(CONFIG_PATH)) throw new Error(`Missing config at ${CONFIG_PATH}`);
const APP = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));




// resolve Excel + sheets
const EXCEL_PATH = path.resolve(__dirname, APP.excel.path);
const SHEET_SW = APP.excel.sheets.startWorkflow;
const SHEET_ASSIGNEES = APP.excel.sheets.assignees;
const SHEET_APPROVALS = APP.excel.sheets.approvals;
const COLS = APP.excel.assigneesColumns;
const URLS = { ...APP.urls };

// optional env override for the very first login URL
if (process.env.APP_URL?.trim()) URLS.loginStart = process.env.APP_URL.trim();

// secrets from env (supports old names too)
const LOGIN_USER = process.env.LOGIN_USER;
const LOGIN_PASS = process.env.LOGIN_PASS;
const TOTP_SECRET = process.env.TOTP_SECRET;
const APPROVER_DEFAULT_PASS = process.env.APPROVER_DEFAULT_PASS || '';
if (!LOGIN_USER || !LOGIN_PASS || !TOTP_SECRET) {
  throw new Error('Missing env: set LOGIN_USER/LOGIN_EMAIL, LOGIN_PASS/LOGIN_PASSWORD, and TOTP_SECRET');
}


// approver password resolver
function approverPass(index, row) {
  const perIdx = (process.env[`APPROVER_${index}_PASS`] || '').trim();
  if (perIdx) return perIdx;
  const fromSheet = (row?.[COLS.password] ?? '').toString().trim();
  if (fromSheet) return fromSheet;
  const fallback = (process.env.APPROVER_DEFAULT_PASS || '').trim();
  if (fallback) return fallback;
  throw new Error(`No password for approver[${index}]`);
}


test('test', async ({ page }) => {
  test.slow();
  test.setTimeout(5 * 60 * 1000);

  // --- Excel path (relative to this spec) ---
  const dataPath = path.resolve(__dirname, '../test-data/playwright-data-driven-template.xlsx');
  // --- Read sheets ---
if (!fs.existsSync(EXCEL_PATH)) throw new Error(`Excel not found at: ${EXCEL_PATH}`);
const SW = getSheetMap(EXCEL_PATH, SHEET_SW);
const ASSIGNEES = getSheetRows(EXCEL_PATH, SHEET_ASSIGNEES);
const APPROVALS = getSheetRows(EXCEL_PATH, SHEET_APPROVALS);

  // --- Tiny helpers (no fallbacks) ---
  const getSW = (k) => {
    const v = String(SW[k] ?? '').trim();
    if (!v) throw new Error(`StartWorkflow["${k}"] is empty in Excel`);
    return v;
  };
  const getAssigneeId    = (i) => String(ASSIGNEES[i]?.searchText ?? '').trim();
  const getAssigneeName  = (i) => String(ASSIGNEES[i]?.displayText ?? '').trim();
  const getAssigneeEmail = (i) => String(ASSIGNEES[i]?.emailIfAny ?? '').trim();

  // strict accessor for Approvals: use *exact* Excel header names
  const mustApproval = (rowIndex, columnHeader) => {
    const row = APPROVALS[rowIndex];
    if (!row) throw new Error(`Approvals sheet missing row ${rowIndex + 1}`);
    const has = Object.prototype.hasOwnProperty.call(row, columnHeader);
    if (!has) throw new Error(`Approvals sheet missing column "${columnHeader}"`);
    const v = String(row[columnHeader] ?? '').trim();
    if (!v) throw new Error(`Approvals[${rowIndex + 1}]["${columnHeader}"] is empty`);
    return v;
  };

  // ESM-safe import for CJS lib
  const { authenticator } = await import('otplib');

  // Excel date -> datepicker button label (e.g., "Aug 23,")
  function toCalendarBtnLabel(value) {
    let d = null;
    if (value instanceof Date) d = value;
    else if (typeof value === 'number') {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      d = new Date(epoch.getTime() + value * 86400000);
    } else if (typeof value === 'string' && value.trim()) {
      const ts = Date.parse(value);
      if (!Number.isNaN(ts)) d = new Date(ts);
    }
    if (!d || Number.isNaN(d.getTime())) throw new Error(`Could not parse date: ${value}`);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    return `${month} ${day},`;
  }

  // --- App login (SiemensID + MFA) ---
  await page.goto(URLS.loginStart);
  await page.getByRole('link', { name: 'Login with SiemensID' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(LOGIN_USER);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill(LOGIN_PASS);
  await page.getByRole('button', { name: 'Log in' }).click();

  await page.getByRole('textbox', { name: 'Enter your one-time code' }).waitFor();
  authenticator.options = { step: 30, digits: 6, window: 1 };
  const code = authenticator.generate(TOTP_SECRET);
  await page.getByRole('textbox', { name: 'Enter your one-time code' }).fill(code);
  await page.getByRole('button', { name: 'Continue' }).click();

  // --- Start Workflow ---
    await page.waitForTimeout(5000);
  await page.locator('[data-test-id="202107280807300617678"]').click();
  await page.getByRole('button', { name: 'Toggle Left Navigation' }).waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: 'Toggle Left Navigation' }).click();
  await page.getByRole('menuitem', { name: ' New' }).click();
  await page.getByRole('menuitem', { name: 'Start Workflow' }).click();

  const u0 = await getGadgets(page);

  await u0.gadget1.getByTestId('20150901090134014230100').selectOption(getSW('flowClassId'));
  await u0.gadget1.getByTestId('20150901090134014631857').selectOption(getSW('workflowId'));
  await u0.gadget1.getByRole('button', { name: 'Start Workflow' }).click();

  // Core fields (all from StartWorkflow sheet)
  await u0.gadget1.getByRole('combobox', { name: 'Item No. / Index' }).fill(getSW('itemIndex'));
  await u0.gadget1.getByRole('combobox', { name: 'Item No. / Index' }).press('Tab');
  await u0.gadget1.getByRole('combobox', { name: 'Article title' }).click();
  await u0.gadget1.getByRole('combobox', { name: 'Article title' }).fill(getSW('articleTitle'));
  await u0.gadget1.getByRole('combobox', { name: 'Article title' }).press('Tab');
  await u0.gadget1.getByRole('textbox', { name: 'Specification / Target state' }).fill(getSW('specTarget'));
  await u0.gadget1.getByRole('textbox', { name: 'Specification / Target state' }).press('Tab');
  await u0.gadget1.getByRole('textbox', { name: 'Description of the deviation' }).fill(getSW('deviationDesc'));
  await u0.gadget1.getByRole('textbox', { name: 'Description of the deviation' }).press('Tab');
  await u0.gadget1.getByRole('textbox', { name: 'Number of parts checked' }).fill(getSW('partsChecked'));
  await u0.gadget1.getByRole('textbox', { name: 'Number of parts checked' }).press('Tab');
  await u0.gadget1.getByRole('textbox', { name: 'Failure rate' }).fill(getSW('failureRate'));
  await u0.gadget1.getByRole('textbox', { name: 'Failure rate' }).press('Tab');
  await u0.gadget1.getByLabel('Is the cause known?').selectOption(getSW('causeKnown'));
  await u0.gadget1.getByLabel('Corrective action defined?').selectOption(getSW('correctiveDefined'));
  await u0.gadget1.getByRole('textbox', { name: 'Quantity' }).fill(getSW('quantity'));
  await u0.gadget1.getByRole('textbox', { name: 'Quantity' }).press('Tab');

  await u0.gadget1.getByTestId('20200701144756084279306-DatePicker').click();
  await u0.gadget1.getByRole('button', { name: toCalendarBtnLabel(getSW('dateISO')) }).click();

  await u0.gadget1.getByRole('textbox', { name: 'Change number' }).fill(getSW('changeNumber'));

  await u0.gadget1.getByTestId('20160721092326035219972').click();
  await u0.gadget1.getByTestId('2016072109335505834280').click();
  await u0.gadget1.getByTestId('2016072109335505834280').fill(getSW('superOrdinateArticleNo'));

  await u0.gadget1.getByRole('textbox', { name: '3D - Corrective measures' }).fill(getSW('measures3D'));
  await u0.gadget1.getByRole('textbox', { name: 'Affected customer and / or' }).fill(getSW('affectedCustomer'));
  await u0.gadget1.getByLabel('Causing process').selectOption(getSW('causingProcess'));
  await u0.gadget1.getByLabel('Requirements for special').selectOption(getSW('reqSpecial'));
  await u0.gadget1.getByLabel('Is there a need for changes').selectOption(getSW('needChanges'));
  await u0.gadget1.getByLabel('Does the delivery to the').selectOption(getSW('deliveryImpact'));
  await u0.gadget1.getByRole('textbox', { name: 'Corrective action' }).fill(getSW('correctiveAction'));

  // Upload
  const uploadPath = getSW('uploadFilePath');
  await u0.gadget1.getByTestId('2015111614330806168211').click();
  await u0.gadget1.getByLabel('Select file(s)').setInputFiles(uploadPath);
  await u0.gadget1.getByRole('button', { name: 'Attach' }).click();

  await u0.gadget1.getByTestId('20150908171228012736690').click();

  // --- Assignees from Assignees sheet ---
  // Row 1 → approver from row 0
  await u0.gadget1.getByTestId('201909111935010721260-R1-L1R1').getByTestId('20151130155332032025152').click();
  await u0.gadget1.getByTestId('201909111935010721260-R1-L1R1').locator('i').nth(1).click();
  await u0.gadget1.getByRole('textbox', { name: 'Lastname, Firstname,' }).fill(getAssigneeId(0));
  await u0.gadget1.getByText(getAssigneeName(0)).click();

  // Row 2 L1 → row 1
  await u0.gadget1.getByTestId('201909111935010721260-R2-L1R1').getByTestId('20151130155332032025152').click();
  await u0.gadget1.getByTestId('201909111935010721260-R2-L1R1').locator('i').nth(1).click();
  await u0.gadget1.getByRole('textbox', { name: 'Lastname, Firstname,' }).fill(getAssigneeId(1));
  await u0.gadget1.getByText(getAssigneeName(1)).click();

  // Row 2 L2 → row 2
  await u0.gadget1.getByTestId('201909111935010721260-R2-L1R2').getByTestId('20151130155332032025152').click();
  await u0.gadget1.getByTestId('201909111935010721260-R2-L1R2').locator('i').nth(1).click();
  await u0.gadget1.getByRole('textbox', { name: 'Lastname, Firstname,' }).fill(getAssigneeId(2));
  await u0.gadget1.getByText(getAssigneeName(2)).click();



  //new code
  await u0.gadget1.getByTestId('20150908171228012736690').click();
  await u0.gadget1.getByRole('link', { name: 'Add user', exact: true }).click();
  await u0.gadget1.getByRole('textbox', { name: 'Lastname, Firstname,' }).fill(getAssigneeId(3));
  await u0.gadget1.getByText(getAssigneeName(3)).click();
  await u0.gadget1.getByTestId('201609080744500837333').click();
  await u0.gadget1.getByTestId('20160908075844034240762').click();
  await u0.gadget1.getByTestId('20160908075844034240762').fill(getAssigneeName(4));

  // Submit
  await u0.gadget1.getByTestId('20150908171228012736690').click();
  await u0.gadget1.getByRole('button', { name: 'Submit workflow' }).click();

  // Capture Case ID
  const caseIdSpan = u0.gadget1.getByTestId('20141009112850013217103');
  await expect(caseIdSpan).toBeVisible();
  const raw = (await caseIdSpan.textContent())?.trim() ?? '';
  const match = raw.match(/\(([^)]+)\)/);
  const caseId = match ? match[1] : raw.replace(/[()]/g, '');
  await expect(caseIdSpan).toHaveText(/\(APW-\d+\)/);
  console.log('Captured Case ID:', caseId);

  // ===== u1 approval (Approvals row 0) =====
  await page.goto(URLS.portalRoot);
  await page.getByRole('textbox', { name: 'User name *' }).fill(getAssigneeId(0));
  await page.getByRole('textbox', { name: 'Password *' }).fill(APPROVER_DEFAULT_PASS);
  await page.getByRole('button', { name: 'Log in' }).click();

  const u1 = await getGadgets(page);
  await u1.gadget0.getByTestId('20141008144226093346187').getByRole('link', { name: 'Click to filter' }).click();
  await u1.gadget0.getByTestId('201411181100280377101613').fill(caseId);
  await u1.gadget0.getByTestId('filterPopupOkButton').click();
  await u1.gadget0.getByTestId('20141008144226093953391').click();


  await u1.gadget1.getByRole('button', { name: 'Edit Fields' }).click();
  await u1.gadget1.locator('select[name="$PInitialFormTemp$pTaskPriorityRatingsPageList$l3$pTask_ImpactProductPlant"]')
    .selectOption({ label: mustApproval(0, 'Impact Product/Plant') });
  await u1.gadget1.locator('select[name="$PInitialFormTemp$pTaskPriorityRatingsPageList$l3$pTask_PredictionOfOccurrence"]')
    .selectOption({ label: mustApproval(0, 'Prediction Of Occurrence') });
  await u1.gadget1.locator('select[name="$PInitialFormTemp$pTaskPriorityRatingsPageList$l3$pTask_DiscoveryAbility"]')
    .selectOption({ label: mustApproval(0, 'Discovery Ability') });
  await u1.gadget1.locator('#bcf73433')
    .fill(mustApproval(0, 'optionalDescription')); // if you have a "Remarks" column

   await u1.gadget1
    .locator('[data-test-id="202001221218350042646"] [data-test-id="202406271456180413143-R3"]')
    .getByRole('cell', { name: 'Please Select...' })
    .locator('[data-test-id="2016072109335505834280"]').selectOption({ label: mustApproval(0, 'releaseRecommendation') });

  await u1.gadget1.locator('input[name="$PInitialFormTemp$pTaskPriorityRatingsPageList$l3$pTask_Remarks"]').fill(mustApproval(0, 'remarks')); 

  await u1.gadget1.getByTestId('20150908171228012330958').click();
  await u1.gadget1.getByTestId('20151221093021020184414').fill(mustApproval(0, 'Approval Note')); // optional column
  await u1.gadget1.getByTestId('2015090805444404955925').click();
  await u1.gadget1.getByTestId('201801251600250687413552').click();
  await page.getByTestId('202203110911550900696').click();

  // ===== u2 approval (Approvals row 1) =====
  await page.goto(URLS.portalRoot);
  await page.getByRole('textbox', { name: 'User name *' }).fill(getAssigneeId(1));
  await page.getByRole('textbox', { name: 'Password *' }).fill(APPROVER_DEFAULT_PASS);
  await page.getByRole('button', { name: 'Log in' }).click();

  const u2 = await getGadgets(page);
  await u2.gadget0.getByTestId('20141008144226093346187').getByRole('link', { name: 'Click to filter' }).click();
  await u2.gadget0.getByTestId('201411181100280377101613').fill(caseId);
  await u2.gadget0.getByTestId('filterPopupOkButton').click();
  await u2.gadget0.getByTestId('20141008144226093953391').click();

  await u2.gadget1.getByRole('button', { name: 'Edit Fields' }).click();
  await u2.gadget1.locator('select[name="$PInitialFormTemp$pImpactProductPlant"]')
    .selectOption({ label: mustApproval(1, 'Impact Product/Plant') });
  await u2.gadget1.locator('select[name="$PInitialFormTemp$pPredictionOfOccurrence"]')
    .selectOption({ label: mustApproval(1, 'Prediction Of Occurrence') });
  await u2.gadget1.locator('select[name="$PInitialFormTemp$pDiscoveryAbility"]')
    .selectOption({ label: mustApproval(1, 'Discovery Ability') });
  await u2.gadget1.getByLabel('Define action priority by AP-')
    .selectOption({ label: mustApproval(1, 'actionPriority') });
  await u2.gadget1.getByLabel('Is customer approval required?')
    .selectOption({ label: mustApproval(1, 'approvalRequired') });
  await u2.gadget1.locator('select[name="$PInitialFormTemp$pReleaseRecommendation"]')
    .selectOption({ label: mustApproval(1, 'releaseRecommendation') });
  await u2.gadget1.getByTestId('20150908171228012330958').click();
  await u2.gadget1.getByTestId('20151221093021020184414').fill(mustApproval(1, 'Approval Note'));
  await u2.gadget1.getByTestId('2015090805444404955925').click();
  await u2.gadget1.getByTestId('201801251600250687413552').click();
  await page.getByTestId('202203110911550900696').click();

  // ===== u3 approval (Approvals row 2) =====
  await page.goto(URLS.portalRoot);
  await page.getByRole('textbox', { name: 'User name *' }).fill(getAssigneeId(2));
  await page.getByRole('textbox', { name: 'Password *' }).fill(APPROVER_DEFAULT_PASS);
  await page.getByRole('button', { name: 'Log in' }).click();

  await page.pause();

  const u3 = await getGadgets(page);
  await u3.gadget0.getByTestId('20141008144226093346187').getByRole('link', { name: 'Click to filter' }).click();
  await u3.gadget0.getByTestId('201411181100280377101613').fill(caseId);
  await u3.gadget0.getByTestId('filterPopupOkButton').click();
  await u3.gadget0.getByTestId('20141008144226093953391').click();

  await u3.gadget1.getByRole('button', { name: 'Edit Fields' }).click();
  await u3.gadget1.locator('select[name="$PInitialFormTemp$pImpactProductPlant"]')
    .selectOption({ label: mustApproval(2, 'Impact Product/Plant') });
  await u3.gadget1.locator('select[name="$PInitialFormTemp$pPredictionOfOccurrence"]')
    .selectOption({ label: mustApproval(2, 'Prediction Of Occurrence') });
  await u3.gadget1.locator('select[name="$PInitialFormTemp$pDiscoveryAbility"]')
    .selectOption({ label: mustApproval(2, 'Discovery Ability') });
  await u3.gadget1.getByLabel('Define action priority by AP-')
    .selectOption({ label: mustApproval(2, 'actionPriority') });

  await u3.gadget1.getByLabel('Is customer approval required?').selectOption({ label: mustApproval(2, 'approvalRequired') });  
  await u3.gadget1.locator('select[name="$PInitialFormTemp$pReleaseRecommendation"]')
    .selectOption({ label: mustApproval(2, 'releaseRecommendation') });
  await u3.gadget1.getByTestId('20150908171228012330958').click();

  await page.waitForTimeout(500);
  await u3.gadget1.getByTestId('20151221093021020184414').fill(mustApproval(2, 'Approval Note'));
  await u3.gadget1.getByTestId('2015090805444404955925').click();
  await u3.gadget1.getByTestId('201801251600250687413552').click();

  //await page.pause();

  // Overview / Audit
  await u3.gadget2.getByText('Overview').click();
  await u3.gadget2.locator('[data-test-id="202105050818560080933_header"]').getByText('Case details').click();
  await u3.gadget2.getByText('Audit').click();
  await page.getByTestId('202203110911550900696').click();
});

// --- helper ---
/** @param {import('@playwright/test').Page} page */
async function getGadgets(page) {
  await page.waitForLoadState('domcontentloaded');
  return {
    gadget0: page.frameLocator('iframe[name="PegaGadget0Ifr"]'),
    gadget1: page.frameLocator('iframe[name="PegaGadget1Ifr"]'),
    gadget2: page.frameLocator('iframe[name="PegaGadget2Ifr"]'),
  };
}
