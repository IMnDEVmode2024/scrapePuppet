require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Custom promise-based timeout function
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main scraping function
async function scrape(url) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const expandButtonSelector = '#expand';
    const expandButton = await page.$(expandButtonSelector);
    if (expandButton !== null) {
        console.log('Found the "Expand" button, clicking...');
        await page.click('#expand');
        await wait(2000); // Wait for animations to complete

        const elements = await page.$$('button[aria-label="Show transcript"]');
        if (elements.length >= 3) {
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
        const href = await page.$eval(linkSelector, el => el.href);

        const bodyText = videoTitle + '\n' + href + '\n' + textsJoined;

        console.log(bodyText);

        const filePath = saveData(bodyText, videoTitle, timestamp);
        await browser.close();

        return { videoTitle, href, transcript: textsJoined, filePath };
    }
}

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
        console.error('Error scraping:', error);
        res.send('An error occurred while scraping the video.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

