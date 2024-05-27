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

// Function to click the "Show Transcript" button
function clickShowTranscriptButton(page) {
    const transcriptButtonSelector = 'button[aria-label="Show transcript"]';
    try {
        if (await page.$(transcriptButtonSelector) !== null) {
            console.log('Found the "Show transcript" button by aria-label, clicking...');
            await page.click(transcriptButtonSelector);
            return;
        }

        const buttons = await page.$$('ytd-menu-renderer yt-icon-button button');
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const text = await page.evaluate(element => element.textContent, button).trim();
            const ariaLabel = await button.evaluate(el => el.getAttribute('aria-label'));

            console.log(`Examining button ${i}: text="${text}", aria-label="${ariaLabel}"`);

            if (text.includes("Show transcript") || ariaLabel === "Show transcript") {
                await button.click();
                console.log('Clicked the "Show transcript" button based on dynamic search.');
                return;
            }
        }

        console.log('Fallback: Clicking the third button based on position as a last resort.');
        if (buttons.length >= 3) {
            await buttons[2].click();
            console.log('Clicked the 3rd button by index.');
        } else {
            console.log('Failed to find the "Show transcript" button by any method.');
        }
    } catch (error) {
        console.error('Error clicking on the Show Transcript button:', error);
    }
}

// Function to save the gathered data into a file
const saveData = (data, title, timestamp) => {
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}.${timestamp}.txt`;
    const directoryPath = 'transcripts';

    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }

    const filePath = path.join(directoryPath, filename);
    fs.writeFileSync(filePath, data, 'utf8');
    console.log(`File saved as ${filePath}`);
};

// Main scraping function
async function scrape() {
    const browser = await puppeteer.launch({ headless: false }); // Set headless to false for debugging
    const page = await browser.newPage();
    await page.goto('https://www.youtube.com/watch?v=LEbAxsYRMcQ', { waitUntil: 'networkidle2' });

    await wait(2500);
    await clickShowTranscriptButton(page); // Ensure the "Show Transcript" button is clicked

    const titleSelector = 'head > meta[name="title"][content]';
    let videoTitle = 'Default Video Title'; // Default value if title not found
    const titleElement = await page.$(titleSelector);
    if (titleElement) {
        videoTitle = await page.evaluate(element => element.content, titleElement);
        console.log('Video Title:', videoTitle);
    } else {
        console.log('Video title meta tag not found.');
    }

    console.log('Video Title Grabbed...');
    await wait(2000);

    const linkSelector = 'head > link[rel="alternate"][media="handheld"][href]';
    const linkElement = await page.$(linkSelector);
    let href = 'No link found'; // Default value if link not found
    if (linkElement) {
        href = await page.evaluate(element => element.href, linkElement);
        console.log('Link:', href);
    } else {
        console.log('Handheld link element not found.');
    }

    console.log('Title href Grabbed...');
    await wait(2000);

    console.log('Getting transcript...');
    const transcriptSelector = '#segments-container ytd-transcript-segment-renderer div yt-formatted-string';
    const transcriptTexts = await page.$$eval(transcriptSelector, elements =>
        elements.map(element => element.textContent.trim())
    );

    await wait(1000);

    console.log('Transcripts gathered...');
    const textsJoined = transcriptTexts.join('\n');

    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '-');

    const bodyText = videoTitle + '\n' + href + '\n' + textsJoined;

    console.log(bodyText);

    saveData(bodyText, videoTitle, timestamp);

    await browser.close();
}

// Start the scraping process
(async () => {
    await scrape();
})(); // Corrected this line
