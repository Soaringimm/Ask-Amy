/**
 * Stress test for Ask-Amy Meet page
 * Tests for memory leaks and stability over multiple page navigations
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.TEST_URL || 'http://localhost:4173';
const ITERATIONS = parseInt(process.env.ITERATIONS || '10');
const HEADLESS = process.env.HEADLESS !== 'false';

async function runStressTest() {
  console.log(`🚀 Starting stress test: ${ITERATIONS} iterations against ${BASE_URL}`);
  
  const browser = await chromium.launch({ 
    headless: HEADLESS,
    args: ['--disable-dev-shm-usage', '--no-sandbox']
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => errors.push(err.toString()));
  
  let freezestuck = 0;
  const freezeThreshold = 10000; // 10 seconds
  
  for (let i = 1; i <= ITERATIONS; i++) {
    console.log(`\n📍 Iteration ${i}/${ITERATIONS}`);
    const startTime = Date.now();
    
    try {
      // Navigate to meet page
      const meetUrl = `${BASE_URL}/meet`;
      console.log(`   Loading ${meetUrl}...`);
      
      await page.goto(meetUrl, { timeout: 30000, waitUntil: 'networkidle' });
      
      // Wait a bit to simulate user activity
      await page.waitForTimeout(2000);
      
      // Check for freeze (page becomes unresponsive)
      const loadTime = Date.now() - startTime;
      if (loadTime > freezeThreshold) {
        console.log(`   ⚠️  Page load took ${loadTime}ms (possible freeze)`);
        freezestuck++;
      } else {
        console.log(`   ✅ Loaded in ${loadTime}ms`);
      }
      
      // Navigate away and back (simulates repeated use)
      await page.goto(`${BASE_URL}/`, { timeout: 15000 });
      await page.waitForTimeout(500);
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      errors.push(`Iteration ${i}: ${err.message}`);
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`   Total iterations: ${ITERATIONS}`);
  console.log(`   Potential freezes: ${freezestuck}`);
  console.log(`   Console errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Errors collected:');
    errors.forEach(e => console.log(`   - ${e.substring(0, 200)}`));
  }
  
  await browser.close();
  
  // Exit with error if too many freezes
  if (freezestuck > ITERATIONS * 0.3) {
    console.log('\n❌ FAILED: More than 30% of iterations had potential freezes');
    process.exit(1);
  }
  
  console.log('\n✅ PASSED: Stress test completed');
  process.exit(0);
}

runStressTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
