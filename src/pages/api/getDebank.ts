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

  // Construct the full URL
  const url = `https://debank.com/profile/${address}`;

  // Using "starts with" selector for more robust targeting
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

    // Wait for the balance element to appear and update
    await page.waitForSelector(balanceSelector, {
      visible: true,
      timeout: 15000,
    });

    // Wait for the balance to become non-zero
    await page.waitForFunction(
      (balanceSelector) => {
        const element = document.querySelector(balanceSelector);
        if (!element) return false;

        // Extract only the balance part (ignore percentage)
        const balanceText = element.textContent?.match(/\$[\d,]+/)?.[0] || '$0';
        return balanceText !== '$0'; // Return true when the balance is non-zero
      },
      { timeout: 30000 }, // Wait up to 30 seconds for the balance to update
      balanceSelector // Pass the selector as an argument
    );

    // Extract the balance
    const usdBalance = await page.$eval(balanceSelector, (element) => {
      const balanceText = element.textContent?.match(/\$[\d,]+/)?.[0] || '$0';
      return balanceText; // Return the cleaned balance
    });

    // Extract the percentage change with fail-safe
    let percentageChange: string | null = null;
    try {
      percentageChange = await page.$eval(percentageSelector, (element) => {
        return element.textContent?.trim() || '0%'; // Default to "0%" if not found
      });
    } catch (err) {
      console.warn('Failed to fetch percentage change:', err);
      percentageChange = null; // Set to null if not found
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
