import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ 
    headless: false, // Show the browser
    slowMo: 100 // Slow down operations by 100ms so the user can see what's happening
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to browser console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => {
    console.log(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
  });

  const email = 'jackyzhang1969@gmail.com';
  const password = 'Test123456!';
  const loginUrl = 'http://localhost:5173/login';

  console.log(`Navigating to ${loginUrl}...`);
  try {
    await page.goto(loginUrl);
  } catch (e) {
    console.error(`Failed to load ${loginUrl}. Is the dev server running?`);
    console.error(e);
    await browser.close();
    process.exit(1);
  }

  const loginUrl = 'http://localhost:5173/login';  console.log('Filling credentials...');
  await page.fill('#email', email);
  await page.fill('#password', password);

  console.log('Clicking login...');
  await page.click('button[type="submit"]');

  // Wait for either success (navigation to home) or error message
  try {
    await Promise.race([
      page.waitForURL('http://localhost:5173/', { timeout: 5000 }),
      page.waitForSelector('.text-red-700', { timeout: 5000 }) // Error message class from Login.jsx
    ]);
  } catch (e) {
    // Timeout implies we stayed on the page or something else happened
  }

  const errorMsg = await page.$('.text-red-700');
  if (errorMsg) {
    const text = await errorMsg.innerText();
    console.error('Login failed with error displayed on page:', text);
    // Keep browser open for a moment for user to see
    await page.waitForTimeout(3000);
  } else if (page.url() === 'http://localhost:5173/') {
    console.log('Successfully logged in! Redirected to home page.');
    await page.waitForTimeout(2000); // Let user see success
  } else {
    console.log(`Current URL: ${page.url()}`);
    console.log('Login status uncertain. Check browser window.');
    await page.waitForTimeout(3000);
  }

  await browser.close();
})();
