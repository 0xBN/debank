import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { NextApiRequest, NextApiResponse } from 'next';

const WAIT_TIMEOUT = 3000;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address } = req.query;

  // Validate the 0x address
  if (
    !address ||
    typeof address !== 'string' ||
    !/^0x[a-fA-F0-9]{40}$/.test(address)
  ) {
    res.status(400).json({ error: 'Invalid 0x address parameter' });
    return;
  }

  const url = `https://debank.com/profile/${address}`;
  const balanceSelector = '[class^="HeaderInfo_totalAssetInner"]';
  const percentageSelector = '[class^="HeaderInfo_changePercent"]';

  let browser = null;

  try {
    // Determine executable path dynamically for local or production
    const executablePath =
      process.env.NODE_ENV === 'production'
        ? await chromium.executablePath()
        : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

    console.log('Using Chromium executable path:', executablePath);

    // Launch Puppeteer with the appropriate Chromium configuration
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: WAIT_TIMEOUT,
    });

    // Wait for the balance element to appear and update its content
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;

        const balanceText = el.textContent?.match(/\$[\d,]+/)?.[0] || '$0';
        return balanceText !== '$0'; // Resolve only when balance is non-zero
      },
      { timeout: WAIT_TIMEOUT },
      balanceSelector
    );

    // Extract the balance value
    const usdBalance = await page.$eval(balanceSelector, (el) => {
      const balanceText = el.textContent?.match(/\$[\d,]+/)?.[0] || '$0';
      return balanceText;
    });

    // Extract the percentage change with a fallback
    let percentageChange: string | null = null;
    try {
      percentageChange = await page.$eval(percentageSelector, (el) => {
        return el.textContent?.trim() || '0%';
      });
    } catch {
      percentageChange = null;
    }

    res.status(200).json({ balance: usdBalance, percentageChange });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
