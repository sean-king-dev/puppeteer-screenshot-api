import express from 'express';
import cors from 'cors';
// import puppeteer from 'puppeteer-core';
import puppeteer from 'puppeteer';
import chromium from 'chrome-aws-lambda';
import { jsPDF } from 'jspdf';

const app = express();

app.use(cors());
app.use(express.json());

// Optional: sanity check
app.get('/', (req, res) => {
  res.send('PDF API is running. POST /download-pdf with JSON { url: "https://example.com" }');
});

app.post('/download-pdf', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) throw new Error('No URL provided');

    // Launch headless Chromium from chrome-aws-lambda
    const browser = await puppeteer.launch({
    //   args: chromium.args,
    //   defaultViewport: chromium.defaultViewport,
    //   executablePath: await chromium.executablePath,
    //   headless: chromium.headless,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Take full-page screenshot
    const screenshot = await page.screenshot({ fullPage: true });

    const { width, height } = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    }));

    await browser.close();

    // Create PDF with jsPDF
    const pdf = new jsPDF({
      orientation: height > width ? 'portrait' : 'landscape',
      unit: 'px',
      format: [width, height]
    });

    pdf.addImage(screenshot.toString('base64'), 'PNG', 0, 0, width, height);

    const pdfOutput = pdf.output('datauristring');
    const buffer = Buffer.from(pdfOutput.split(',')[1], 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="page.pdf"');
    res.send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).send('PDF generation failed: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ PDF API running on port ${PORT}`);
});
