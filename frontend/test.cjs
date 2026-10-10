const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173', {waitUntil: 'networkidle0'});
  console.log('Loaded step 1');
  
  // Attempt to find and click Next
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Configure'));
    if(btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Click run
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Run'));
    if(btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
