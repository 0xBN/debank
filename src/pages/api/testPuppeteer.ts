import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let browser = null;

  try {
    // Determine executable path dynamically based on environment
    const executablePath =
      process.env.NODE_ENV === 'production'
        ? await chromium.executablePath() // Use Sparticuz Chromium in production
        : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; // Local Chrome path for development

    // Launch Puppeteer with the appropriate Chromium configuration
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Navigate to a test website (you can replace this with any site)
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });

    // Extract the page title for testing
    const pageTitle = await page.title();

    await browser.close();

    res.status(200).json({
      success: true,
      message: 'Puppeteer and Chromium are working!',
      pageTitle,
    });
  } catch (error) {
    console.error('Error launching Puppeteer:', error);

    if (browser) {
      await browser.close();
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
