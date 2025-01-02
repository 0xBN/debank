import puppeteer from 'puppeteer';
import type { NextApiRequest, NextApiResponse } from 'next';

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

  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();

    // Set a user agent to mimic a real browser
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Navigate to the page
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the balance element to appear
    await page.waitForSelector(balanceSelector, {
      visible: true,
      timeout: 15000,
    });

    // Check for a balance update or confirm $0
    const usdBalance = await page.evaluate(
      async (selector, timeout) => {
        const element = document.querySelector(selector);
        if (!element) return '$0';

        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
          const balanceText =
            element.textContent?.match(/\$[\d,]+/)?.[0] || '$0';
          if (balanceText !== '$0') return balanceText; // Return updated balance if found
          await new Promise((r) => setTimeout(r, 100)); // Wait briefly before checking again
        }
        return '$0'; // Timeout reached, assume real $0 balance
      },
      balanceSelector,
      30000 // Timeout in milliseconds
    );

    // Extract the percentage change with a fail-safe
    let percentageChange: string | null = null;
    try {
      percentageChange = await page.$eval(
        percentageSelector,
        (element) => element.textContent?.trim() || '0%'
      );
    } catch {
      percentageChange = null;
    }

    // Close the browser
    await browser.close();

    res.status(200).json({ balance: usdBalance, percentageChange });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
