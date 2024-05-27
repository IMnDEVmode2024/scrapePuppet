require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// Custom promise-based timeout function
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// Main scraping function
async function scrape() {
    const browser = await puppeteer.launch({ headless: false }); // Set headless to false for debugging
    const page = await browser.newPage();
    await page.goto('https://www.youtube.com/watch?v=hRGXiddKNlQ', { waitUntil: 'networkidle2' });
    const expandButtonSelector = '#expand'; 
    const expandButton = await page.$(expandButtonSelector);
        if (expandButton !== null) {
            console.log('Found the "Expand" button, clicking...');
            await page.click('#expand');
            await wait(2000); // Wait for animations to complete

      const elements = await page.$$('button[aria-label="Show transcript"]'); // Use 'example' as your actual selector
    
      // Check if there are at least 3 elements
      if (elements.length >= 3) {
          // Click the third element (index starts from 0, so index 2 is the third element)
          await elements[2].click();
          await wait(2000);
      } else {
          console.error('There are less than 3 elements matching the selector');
      }

  
  


    const transcriptSelector = '#segments-container ytd-transcript-segment-renderer div yt-formatted-string';
    const transcriptTexts = await page.$$eval(transcriptSelector, elements =>
        elements.map(element => element.textContent.trim())
    );

    console.log('Transcripts gathered...');
    const textsJoined = transcriptTexts.join('\n');

    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-');

    const videoTitleSelector = '#title > h1 > yt-formatted-string';
    await page.waitForSelector(videoTitleSelector); // Ensure the title element is loaded
    const videoTitle = await page.$eval(videoTitleSelector, el => el.textContent.trim());
    console.log('Video Title:', videoTitle);


    const linkSelector = 'link[rel="canonical"]';
    let href = await page.$eval(linkSelector, el => el.href);

    const bodyText = videoTitle + '\n' + href + '\n' + textsJoined;

    console.log(bodyText);

    saveData(bodyText, videoTitle, timestamp);

    //` await browser.close();
}}

// Function to save the gathered data into a file
function saveData(data, videoTitle, timestamp) {
    const safeTitle = videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${timestamp}.${safeTitle}.txt`;
    const directoryPath = 'transcripts';

    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }

    const filePath = path.join(directoryPath, filename);
    fs.writeFileSync(filePath, data, 'utf8');
    console.log(`File saved as ${filePath}`);
}

// Start the scraping process
(async () => {
    await scrape();
})();
