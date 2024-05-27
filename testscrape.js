require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AnonymizeUA = require('puppeteer-extra-plugin-anonymize-ua');
const UserAgent = require('user-agents');

puppeteer.use(StealthPlugin());
puppeteer.use(AnonymizeUA());

const { GOOGLE_EMAIL, GOOGLE_PASSWORD, TARGET_PHONE_NUMBER } = process.env;

async function testScrape(url, messageContent) {
    try {
        const browser = await puppeteer.launch({
            headless: false,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
                '--user-agent=' + new UserAgent().toString()
            ]
        });
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });

        console.log('Navigating to URL...');
        await page.goto(url, { waitUntil: 'networkidle2' });

        console.log('Waiting for sign-in button...');
        await page.waitForSelector('a.signUpLink[href]', { visible: true });
        console.log('Clicking sign-in button...');
        await page.click('a.signUpLink[href]');

        console.log('Waiting for email input...');
        await page.waitForSelector('input[type="email"]', { visible: true });
        console.log('Typing email...');
        await page.type('input[type="email"]', GOOGLE_EMAIL);
        await page.keyboard.press('Enter');

        console.log('Waiting for password input...');
        await page.waitForSelector('input[type="password"]', { visible: true });
        console.log('Typing password...');
        await page.type('input[type="password"]', GOOGLE_PASSWORD);
        await page.keyboard.press('Enter');

        console.log('Waiting for navigation to complete login...');
        await page.waitForNavigation();

        console.log('Logged in successfully');

        console.log('Waiting for send message button...');
        await page.waitForSelector('button[aria-label="Send a message"]', { visible: true });
        console.log('Clicking send message button...');
        await page.click('button[aria-label="Send a message"]');

        console.log('Waiting for phone number input...');
        await page.waitForSelector('input[aria-label="Phone number"]', { visible: true });
        console.log('Typing phone number...');
        await page.type('input[aria-label="Phone number"]', TARGET_PHONE_NUMBER);

        console.log('Waiting for message input...');
        await page.waitForSelector('textarea[aria-label="Text message"]', { visible: true });
        console.log('Typing message...');
        await page.type('textarea[aria-label="Text message"]', messageContent);

        console.log('Sending message...');
        await page.keyboard.press('Enter');

        console.log('Message sent successfully');

        console.log('Closing browser...');
      //  await browser.close();
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

(async () => {
    console.log('Test Case 1: Successful Login and Message Sending');
    await testScrape('https://voice.google.com/', 'Hello from Puppeteer!');

    console.log('Test Case 2: Incorrect Email');
    process.env.GOOGLE_EMAIL = 'incorrect@example.com';
    await testScrape('https://voice.google.com/', 'Test message');

    console.log('Test Case 3: Incorrect Password');
    process.env.GOOGLE_PASSWORD = 'incorrectpassword';
    await testScrape('https://voice.google.com/', 'Test message');

    console.log('Test Case 4: Missing Phone Number');
    process.env.TARGET_PHONE_NUMBER = '';
    await testScrape('https://voice.google.com/', 'Test message');

    console.log('Test Case 5: Message Sending Failure');
    process.env.TARGET_PHONE_NUMBER = 'invalidphonenumber';
    await testScrape('https://voice.google.com/', 'Test message');
})();
