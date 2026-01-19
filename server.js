import express from 'express';
import cors from 'cors';
import chromium from 'chrome-aws-lambda';
import puppeteer from 'puppeteer'; // <-- full puppeteer
import { jsPDF } from 'jspdf';

const app = express();
app.use(cors({
    origin: 'https://dev.kingseducation.com'
}));
app.use(express.json());

app.post('/download-pdf', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) throw new Error('No URL provided');

    const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });

    const screenshot = await page.screenshot({ fullPage: true });
    const { width, height } = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    }));

    await browser.close();

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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ PDF API running on port ${PORT}`));
