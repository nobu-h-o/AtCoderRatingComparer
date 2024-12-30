// datacall.js
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

export async function fetchRatingData(user1, user2) {
  try {
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--no-zygote',
      ],
      executablePath: 
        process.env.NODE_ENV === 'production'
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
      headless: true
    });
    const page = await browser.newPage();

    await page.goto(`https://atcoder.jp/users/${user1}?graph=rating`, {
      waitUntil: 'networkidle0'
    });

    const rating_history1 = await page.evaluate(() => {
      const xpath = '//*[@id="main-container"]/div[1]/div[3]/div/script[2]/text()';
      const result = document.evaluate(xpath, document, null, XPathResult.STRING_TYPE, null);
      if (!result) return null;

      const content = result.stringValue;
      const match = content.match(/rating_history\s*=\s*(\[.*?\]);/s);
      if (match) {
        return JSON.parse(match[1]);
      }
      return null;
    });

    await page.goto(`https://atcoder.jp/users/${user2}?graph=rating`, {
      waitUntil: 'networkidle0'
    });

    const rating_history2 = await page.evaluate(() => {
      const xpath = '//*[@id="main-container"]/div[1]/div[3]/div/script[2]/text()';
      const result = document.evaluate(xpath, document, null, XPathResult.STRING_TYPE, null);
      if (!result) return null;

      const content = result.stringValue;
      const match = content.match(/rating_history\s*=\s*(\[.*?\]);/s);
      if (match) {
        return JSON.parse(match[1]);
      }
      return null;
    });

    await browser.close();

    // Important: return the scraped data
    return {
      rating_history1: rating_history1 || [],
      rating_history2: rating_history2 || []
    };
  } catch (error) {
    console.error('An error occurred:', error);
    // Return empty arrays on error
    return { rating_history1: [], rating_history2: [] };
  }
}