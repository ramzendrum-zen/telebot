import puppeteer from 'puppeteer';
import fs from 'fs';

const urls = [
  "https://www.msajce-edu.in/",
  "https://www.msajce-edu.in/about.php",
  "https://www.msajce-edu.in/visionmission.php",
  "https://www.msajce-edu.in/ourhistory.php",
  "https://www.msajce-edu.in/groupofinstitutions.php",
  "https://www.msajce-edu.in/principal.php",
  "https://www.msajce-edu.in/admission.php",
  "https://www.msajce-edu.in/curriculm.php",
  "https://www.msajce-edu.in/departments.php",
  "https://www.msajce-edu.in/research.php",
  "https://www.msajce-edu.in/technologycentre.php",
  "https://www.msajce-edu.in/library.php",
  "https://www.msajce-edu.in/hostel.php",
  "https://www.msajce-edu.in/transport.php",
  "https://www.msajce-edu.in/sports.php",
  "https://www.msajce-edu.in/socialservices.php",
  "https://www.msajce-edu.in/clubssocieties.php",
  "https://www.msajce-edu.in/professionalsocities.php",
  "https://www.msajce-edu.in/alumni.php",
  "https://www.msajce-edu.in/Incubation&Startup.php"
];

async function scrape() {
  const browser = await puppeteer.launch({ headless: "new" });
  const results = [];

  for (const url of urls) {
    console.log(`Scraping: ${url}`);
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      const data = await page.evaluate(() => {
        // Remove scripts, styles, nav, footer, ads to clean the text
        const selectorsToRemove = ['script', 'style', 'nav', 'footer', 'header', '.ads', '#sidebar', '.menu'];
        selectorsToRemove.forEach(s => {
          document.querySelectorAll(s).forEach(el => el.remove());
        });

        const title = document.title;
        const mainContent = document.body.innerText;
        
        return {
          title,
          content: mainContent.trim().replace(/\s+/g, ' ')
        };
      });

      results.push({ url, ...data });
    } catch (e) {
      console.error(`Error scraping ${url}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  fs.writeFileSync('scraped_data.json', JSON.stringify(results, null, 2));
  console.log('Scraping complete. Results saved to scraped_data.json');
}

scrape();
