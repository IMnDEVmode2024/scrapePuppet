require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { TextQueryHandler } = require('puppeteer-core');

puppeteer.use(StealthPlugin());

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrape(url) {
    let browser;
    let errorOccurred = false;

    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        try {
            await page.goto(url, { waitUntil: 'networkidle2' });
        } catch (error) {
            errorOccurred = true;
            throw new Error('Network error while navigating to URL: ' + error.message);
        }

        const expandButtonSelector = '#expand';
        await page.waitForSelector(expandButtonSelector, { timeout: 5000 });
        const expandButton = await page.$(expandButtonSelector);
        if (expandButton) {
            console.log('Found the "Expand" button, clicking...');
            await page.evaluate(button => button.click(), expandButton);
            await wait(2000); // Wait for animations to complete

            const elements = await page.$$('button[aria-label="Show transcript"]');
            if (elements.length > 0) {
                console.log(`Found ${elements.length} "show transcript" button(s), attempting to click each...`);
                for (let i = elements.length - 1; i >= 0; i--) {
                    try {
                        console.log(`Clicking button ${i + 1}...`);
                        //await page.evaluate(button => button.scrollIntoView(), elements[i]); // Ensure the element is in view
                        await elements[i].click();
                        await wait(2000);
                        
                        
                        const transcriptSelector = '#segments-container ytd-transcript-segment-renderer div yt-formatted-string';
                        await page.waitForSelector(transcriptSelector, { timeout: 5000 });

                        const transcriptTexts = await page.$$eval(transcriptSelector, elements =>
                            elements.map(element => element.textContent.trim())
                        );

                        console.log('Transcripts gathered...');

                        const textsJoined = transcriptTexts.join('\n');
                        const now = new Date();
                        const timestamp = now.toISOString().replace(/:/g, '-');

                        const videoTitleSelector = '#title > h1 > yt-formatted-string';
                        await page.waitForSelector(videoTitleSelector);
                        const videoTitle = await page.$eval(videoTitleSelector, el => el.textContent.trim());
                        console.log('Video Title:', videoTitle);

                        const linkSelector = 'link[rel="canonical"]';
                        const href = await page.$eval(linkSelector, el => el.href);

                        const bodyText = `${videoTitle}\n\n${href}\n\n${textsJoined}`;
                        console.log(bodyText);

                                const filePath = saveData(bodyText, videoTitle, timestamp);
                                return { videoTitle, href, transcript: transcriptTexts, filePath };
            
                    } catch (error) {
                        errorOccurred = true;
                        console.log(`Failed to click button ${i + 1}. Error: ${error}`);
                    }
                }

                console.log(`No transcripts found after clicking all "show transcript" buttons.`);
                return { videoTitle: 'N/A', href: url, transcript: 'No transcript found', filePath: '' };
            } else {
                console.log(`No "show transcript" buttons found. Please go to the following URL and inspect the button with devtools: ${url}`);
                return { videoTitle: 'N/A', href: url, transcript: 'No "show transcript" buttons found', filePath: '' };
            }
        } else {
            throw new Error('Expand button not found');
        }
    } catch (error) {
        errorOccurred = true;
        console.error('Error in scrape function:', error.message);
        throw error; // Re-throw the error to be handled in the route
    } finally {
        if (browser && !errorOccurred) {
            await browser.close();
        }
    }
}

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
    return filePath;
}

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/scrape', async (req, res) => {
    const url = req.body.url;
    try {
        const result = await scrape(url);
        res.render('results', { ...result, url });
    } catch (error) {
        console.error('Error scraping:', error.message);
        res.send('An error occurred while scraping the video: ' + error.message);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
