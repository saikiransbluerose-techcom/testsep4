import { test, expect, chromium as defaultChromium } from '@playwright/test';
import { authenticator } from 'otplib';

const TOTP_SECRET = process.env.TOTP_SECRET || 'MNAEAQDLMV2USSTDJFCWYTZTEUWDKMKW';

// Default Chromium from Playwright
let chromium = defaultChromium;

test('login flow', async ({ page }) => {
  test.setTimeout(90_000);

  // Only load stealth plugin in CI/Jenkins
  if (process.env.CI || process.env.JENKINS_URL) {
    try {
      const { chromium: chromiumExtra } = await import('playwright-extra');
      const { default: StealthPlugin } = await import('puppeteer-extra-plugin-stealth');
      chromiumExtra.use(StealthPlugin());
      chromium = chromiumExtra;
      console.log('🥷 Using stealth browser in CI');
    } catch (e) {
      console.warn('⚠️ Could not load stealth plugin, falling back to normal browser', e);
    }
  }

  // Launch browser (direct stealth if CI, else Playwright runner will handle browserless `page`)
  let browser, context;
  if (chromium !== defaultChromium) {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });
    context = await browser.newContext();
    page = await context.newPage();
  }

  // === Siemens Login Flow ===
  await page.goto(
    'https://siemens-dev1.pegacloud.com/prweb/PRAuth/app/GWSS/WufOMs17lxZjy1fI-RH7kXW6DtwPXjuN*/!STANDARD?pzuiactionrrr=CXtpbn1yblhJcEYzRHZaSUFPUGUvcE5ZV2xqTS9rSHJKSTQreE9CL1Zaa3FPZDI2MFZ6dUY2MzVJek5OdklKYWZ4S3hXc082OHRHVVg3VGZmRE8rYnkxM2xvZz09*'
  );
  await page.getByRole('link', { name: 'Login with SiemensID' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('vineeti_hemdani@bluerose-tech.com');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Debugging: Screenshot + partial page dump after Continue
  await page.screenshot({ path: 'after-continue.png', fullPage: true });
  const html = await page.content();
  console.log('=== PAGE CONTENT (first 2000 chars) ===');
  console.log(html.substring(0, 2000));

  // Wait until password input is visible
  await page.getByLabel('Password').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByLabel('Password').fill('Vani@44112011');
  await page.getByRole('button', { name: 'Log in' }).click();

  // Handle MFA
  await page.getByRole('textbox', { name: 'Enter your one-time code' }).waitFor();
  authenticator.options = { step: 30, digits: 6, window: 1 };
  const code = authenticator.generate(TOTP_SECRET);
  console.log('🔐 TOTP generated:', code);
  await page.getByRole('textbox', { name: 'Enter your one-time code' }).fill(code);
  await page.getByRole('button', { name: 'Continue' }).click();

  // === Navigation & Workflow ===
  await page.waitForTimeout(5000);
  await page.locator('[data-test-id="202107280807300617678"]').click();
  await page.getByRole('button', { name: 'Toggle Left Navigation' }).click();
  await page.getByRole('menuitem', { name: ' New' }).click();
  await page.getByRole('menuitem', { name: 'Start Workflow' }).click();
  await page.waitForTimeout(5000);

  const frame = await page.frameLocator('iframe[name="PegaGadget1Ifr"]');
  await frame.locator('[data-test-id="20150901090134014230100"]').selectOption('SIE-GWSS-Work-IDT-Flow');
  await frame.locator('[data-test-id="20150901090134014631857"]').selectOption('Automation Pilot Workflow');
  await page.waitForTimeout(5000);

  await frame.getByRole('button', { name: 'Start Workflow' }).click();
  await page.waitForTimeout(5000);

  await frame.getByRole('combobox', { name: 'Item No. / Index' }).fill('1');
  await frame.getByRole('combobox', { name: 'Article title' }).fill('2');
  await frame.getByRole('textbox', { name: 'Specification / Target state' }).fill('NA');
  await frame.getByRole('textbox', { name: 'Description of the deviation' }).fill('NA1');
  await frame.getByRole('textbox', { name: 'Number of parts checked' }).fill('123');
  await frame.getByRole('textbox', { name: 'Failure rate' }).fill('30');

  if (browser) {
    await browser.close();
  }
});
