const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    try {
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        console.log('Page loaded, attempting to log in...');
        await page.type('input[placeholder="여기에 이름 입력..."]', '가나다라');
        await page.click('button[type="submit"]');
        await new Promise(r => setTimeout(r, 5000)); // give it time to crash
    } catch (err) {
        console.error('Puppeteer Script Error:', err);
    } finally {
        await browser.close();
    }
})();
