require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// Custom promise-based timeout function
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  const scrape = async () => {
      const browser = await puppeteer.launch({
          headless: false,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
  
      console.log('Navigating to the page...');
      await page.goto('https://www.youtube.com/watch?v=_El9riy9Zjw');
  
      console.log('Scrolling to reveal the moreSelector...');
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await wait(1000); // Wait for 1 second to ensure the page has scrolled and content is loaded
  
      const moreSelector = '#expand'; // Corrected selector for the "More" button
      await page.waitForSelector(moreSelector, {visible: true});
      await page.click(moreSelector);
      console.log('Clicked the "expand" button to reveal more content.');
      await wait(3000); // Custom wait after clicking the expand button
    const transcriptButtonSelector = '#primary-button > ytd-button-renderer > yt-button-shape > button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill';
    const buttons = await page.$$(transcriptButtonSelector);
    if (buttons.length > 0) {
        await buttons[0].click(); // Click the first button that matches the selector
        console.log('Clicked the first transcript button.');
    } else {
        console.log('No transcript buttons found with the specified selector.');
    }
    await wait(1500); // Custom wait after clicking the transcript button

    // Proceed to scrape the transcript text
    const transcriptTexts = await scrapeTranscript(page);
    console.log('Complete Transcript:', transcriptTexts.join('\n'));

    // Optionally, save the transcript to a file
    fs.writeFileSync('transcript1.txt', transcriptTexts.join('\n'));

    // Consider closing the browser after scraping
    await browser.close();
};

const scrapeTranscript = async (page) => {
    const transcriptSelector = '#segments-container ytd-transcript-segment-renderer div yt-formatted-string';
    const transcriptTexts = await page.$$eval(transcriptSelector, elements => 
        elements.map(element => element.textContent.trim())
    );

    console.log('Transcript texts:', transcriptTexts);
    return transcriptTexts;
};

(async () => {
    await scrape();
})();
