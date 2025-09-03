import path from 'path';
import { test, expect } from '@playwright/test';
import { authenticator } from 'otplib';
import { console } from 'inspector';
const TOTP_SECRET = process.env.TOTP_SECRET || 'MNAEAQDLMV2USSTDJFCWYTZTEUWDKMKW';


// --- single-parameter helper ---
// Waits for the element, highlights it briefly, logs its text, then restores styles.
// Returns the captured text so you can add extra context to your logs.
async function highlightAndReport(locator) {
  try {
    await expect.soft(locator).toBeVisible({ timeout: 15_000 });
  } catch {
    console.warn(`Error element not visible: ${locator.toString()}`);
    return '';
  }

  await locator.scrollIntoViewIfNeeded();

  // highlight
  await locator.evaluate(el => {
    el.dataset._oldOutline = el.style.outline;
    el.dataset._oldBg = el.style.backgroundColor;
    el.style.outline = '3px solid #ff3b30';
    el.style.outlineOffset = '2px';
    el.style.backgroundColor = 'rgba(255,235,59,0.2)';
  });

  // capture & log app message text
  const text = (await locator.textContent())?.trim() ?? '';
  console.log(`UI validation error: ${text}`);

  // keep highlight briefly, then revert so it doesn't affect later steps
  await locator.evaluate(() => new Promise(r => setTimeout(r, 500)));
  await locator.evaluate(el => {
    el.style.outline = el.dataset._oldOutline || '';
    el.style.backgroundColor = el.dataset._oldBg || '';
    delete el.dataset._oldOutline;
    delete el.dataset._oldBg;
  });

  return text;
}

test('test', async ({ page }) => {

    // 1) Pipe browser console → stdout in the report
  page.on('console', msg => console.log(`[browser:${msg.type()}] ${msg.text()}`));


  await page.goto('https://siemens-dev1.pegacloud.com/prweb/PRAuth/app/GWSS/WufOMs17lxZjy1fI-RH7kXW6DtwPXjuN*/!STANDARD?pzuiactionrrr=CXtpbn1yblhJcEYzRHZaSUFPUGUvcE5ZV2xqTS9rSHJKSTQreE9CL1Zaa3FPZDI2MFZ6dUY2MzVJek5OdklKYWZ4S3hXc082OHRHVVg3VGZmRE8rYnkxM2xvZz09*');
  await page.getByRole('link', { name: 'Login with SiemensID' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('vineeti_hemdani@bluerose-tech.com');
  await page.getByRole('button', { name: 'Continue' }).click();

  // (optional) console.log for debugging
 console.log('User Looged in:', 'vineeti_hemdani@bluerose-tech.com');

  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('Vani@44112011');
  
 
  await page.getByRole('button', { name: 'Log in' }).click();

  // wait for mfa input to appear
  await page.getByRole('textbox', { name: 'Enter your one-time code' }).waitFor(); 
  
  // small skew tolerance helps if clocks drift a bit
authenticator.options = { step: 30, digits: 6, window: 1 };

// generate fresh TOTP
const code = authenticator.generate(TOTP_SECRET);

// (optional) console.log for debugging
console.log('TOTP:', code);

// fill the generated code (use the variable, not the string)
await page.getByRole('textbox', { name: 'Enter your one-time code' }).fill(code);

await page.getByRole('button', { name: 'Continue' }).click();




await page.waitForTimeout(5000);
await page.locator('[data-test-id="202107280807300617678"]').click();
  await page.getByRole('button', { name: 'Toggle Left Navigation' }).click();
  await page.getByRole('menuitem', { name: ' New' }).click();
  await page.getByRole('menuitem', { name: 'Start Workflow' }).click();

   const gadget = page.frameLocator('iframe[name="PegaGadget1Ifr"]');

  await gadget.getByTestId('20150901090134014230100').selectOption('SIE-GWSS-Work-IDT-Flow');
  await gadget.getByTestId('20150901090134014631857').selectOption('Automation Pilot Workflow');
  await gadget.getByRole('button', { name: 'Start Workflow' }).click();

  //await page.pause();
  await gadget.getByRole('combobox', { name: 'Article title' }).click();
  await gadget.getByRole('combobox', { name: 'Article title' }).fill('test');
  await gadget.getByRole('combobox', { name: 'Article title' }).press('Tab');
  await gadget.getByRole('textbox', { name: 'Specification / Target state' }).fill('VA');
  await gadget.getByRole('textbox', { name: 'Specification / Target state' }).press('Tab');
  await gadget.getByRole('textbox', { name: 'Description of the deviation' }).fill('11');
  await gadget.getByRole('textbox', { name: 'Description of the deviation' }).press('Tab');
  await gadget.getByRole('textbox', { name: 'Number of parts checked' }).fill('5');
  await gadget.getByRole('textbox', { name: 'Number of parts checked' }).press('Tab');
  await gadget.getByRole('textbox', { name: 'Failure rate' }).fill('1');
  await gadget.getByRole('textbox', { name: 'Failure rate' }).press('Tab');
  await gadget.getByLabel('Is the cause known?').selectOption('No');
  await gadget.getByLabel('Corrective action defined?').selectOption('Yes');
  await gadget.getByRole('textbox', { name: 'Quantity' }).click();
  await gadget.getByRole('textbox', { name: 'Date' }).click();
  await gadget.getByRole('textbox', { name: 'Date' }).click();
  await gadget.getByTestId('20200701144756084279306-DatePicker').click();
  await gadget.getByRole('button', { name: 'Aug 27,' }).click();
  await gadget.getByRole('textbox', { name: 'Change number' }).click();
  await gadget.getByRole('textbox', { name: 'Change number' }).fill('1');
  await gadget.getByRole('textbox', { name: '3D - Corrective measures' }).click();
  await gadget.getByRole('textbox', { name: '3D - Corrective measures' }).fill('Test');
  await gadget.getByRole('textbox', { name: '3D - Corrective measures' }).press('Tab');
  await gadget.getByRole('textbox', { name: 'Affected customer and / or' }).fill('1');
  await gadget.getByLabel('Causing process').selectOption('Design');
  await gadget.getByLabel('Requirements for special').selectOption('No');
  await gadget.getByLabel('Is there a need for changes').selectOption('No');
  await gadget.getByLabel('Does the delivery to the').selectOption('No');
  await gadget.getByRole('textbox', { name: 'Corrective action' }).click();
  await gadget.getByRole('textbox', { name: 'Corrective action' }).fill('Test');
  await gadget.getByTestId('20150908171228012736690').click();
  
//   await expect(gadget.getByText('ErrorMessage: Cause of')).toBeVisible();
//   await expect(gadget.getByText('Item No. / Index: This field')).toBeVisible();
//   await expect(gadget.getByText('Perform Root Cause Analysis:')).toBeVisible();

  // --- ERROR #1: "Cause of" missing ---
  const causeText = await highlightAndReport(gadget.getByText(/ErrorMessage:\s*Cause of/i));
  console.log('Extra: error when "Cause of" is not filled in ->', causeText);

  // --- ERROR #2: "Item No./Index" required ---
  const itemText = await highlightAndReport(gadget.getByText(/Item No\. \/ Index:\s*This field/i));
  console.log('Extra: Item No./Index required ->', itemText);

  // --- ERROR #3: Perform Root Cause Analysis prompt ---
  const rcaText = await highlightAndReport(gadget.getByText(/Perform Root Cause Analysis:/i));
  console.log('Extra: Perform Root Cause Analysis prompt ->', rcaText);



  await gadget.getByRole('combobox', { name: 'Item No. / Index' }).click();
  await gadget.getByRole('combobox', { name: 'Item No. / Index' }).fill('10');
  await gadget.getByRole('textbox', { name: 'Lastname, Firstname,' }).click();
  await gadget.getByRole('textbox', { name: 'Lastname, Firstname,' }).click();
  await gadget.getByRole('textbox', { name: 'Lastname, Firstname,' }).fill('Hemdani');
  await gadget.getByText('Hemdani Vineeti / IT APS LCW').click();
  await gadget.getByRole('textbox', { name: 'Root cause analysis' }).click();
  await gadget.getByRole('textbox', { name: 'Root cause analysis' }).fill('Test');
  await gadget.getByTestId('20150908171228012736690').click();
  await gadget.getByRole('combobox', { name: 'Article title' }).click();
  await gadget.getByRole('combobox', { name: 'Article title' }).fill('Test');
  await gadget.locator('.content-item.content-field.item-3 > .content-inner > .field-item').first().click();
  await gadget.getByTestId('20150908171228012736690').click();
  await gadget.getByTestId('20150908171228012736690').click();
  await gadget.getByTestId('20150908171228012736690').click();
  await gadget.getByRole('button', { name: 'Submit workflow' }).click();

//   await expect(gadget.getByText('ErrorMessage: Please add at')).toBeVisible();
//   console.log('Error Message when attachment is not added:', gadget.getByText('ErrorMessage: Please add at').getByText);


 // --- ERROR #4: attachment missing ---
  const attachText = await highlightAndReport(gadget.getByText(/ErrorMessage:\s*Please add at/i));
  console.log('Extra: error when attachment is not added ->', attachText);
  
    await gadget.getByTestId('2015111614330806168211').click();
  //await gadget.getByLabel('Select file(s)').click();
  
  const filePath = 'C:/Vineeti/Project/Upload Documents/FOLDER TO UPLOAD/1  - Copy.pdf';  
  await gadget.getByLabel('Select file(s)').setInputFiles(filePath);

  await gadget.getByRole('button', { name: 'Attach' }).click();
   await gadget.getByRole('button', { name: 'Submit workflow' }).click();
  await expect(gadget.getByTestId('20141009112850013217103')).toBeVisible();
  await expect(gadget.getByTestId('2016083016191602341167946').nth(3)).toBeVisible();
  await gadget.getByTestId('201801251600250686412485').click();
  await page.getByTestId('202203110911550900696').click();

});