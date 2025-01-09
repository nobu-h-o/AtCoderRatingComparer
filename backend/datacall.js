import puppeteer from 'puppeteer';

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
      headless: "new"
    });
    const page = await browser.newPage();
    // headless browser visits website
    await page.goto(`https://atcoder.jp/users/${user1}?graph=rating`, {
      waitUntil: 'networkidle0'
    });
    // headless browser retrieves the data of the graph through xpath
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
    // same thing for user2
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
    //closes browser after retrieving wanted data
    await browser.close();

    // returns the retrieved data
    return {
      rating_history1: rating_history1 || [],
      rating_history2: rating_history2 || []
    };
  } catch (error) {
    console.error('An error occurred:', error);
    // return empty arrays on error
    return { rating_history1: [], rating_history2: [] };
  }
}