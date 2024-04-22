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
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    console.log('Navigating to the page...');
    await page.goto('https://www.youtube.com/watch?v=BOTBypRSMf0');

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
    console.log('Attempting to click the first matching transcript button...');
    const transcriptSelectors  = '#primary-button  button > yt-touch-feedback-shape > div > div.yt-spec-touch-feedback-shape__fill';
    if (transcriptSelectors .length > 0) {
        await page.click(transcriptSelectors[0]);;
        console.log('Clicked the transcript button.');
    } else {
        console.log('No transcript buttons found with the specified selector.');
    }
   // const transcriptSelector = '#segments-container ytd-transcript-segment-renderer div yt-formatted-string';
    console.log('Attempting to click the transcript button...');
    await wait(1500);
    await page.click(transcriptSelectors);
    console.log('Clicked the transcript button.');
    await wait(2000); // Custom wait after clicking the transcript button
   const scrapeTranscript = async (page) => {
    const transcriptSelector = '#segments-container ytd-transcript-segment-renderer div yt-formatted-string';
    const transcriptTexts = await page.$$eval(transcriptSelector, elements => 
        elements.map(element => element.textContent.trim())
    );

    console.log('Transcript texts:', transcriptTexts);
    return transcriptTexts;
};
     const transcriptTexts = await scrapeTranscript(page);
    console.log('Complete Transcript:', transcriptTexts.join('\n'));

    // Optionally, save the transcript to a file
    fs.writeFileSync('transcript1.txt', transcriptTexts.join('\n'));

    // Consider closing the browser after scraping
    // Consider closing the browser after scraping
    // await browser.close();
};

(async () => {
    await scrape();
})();
