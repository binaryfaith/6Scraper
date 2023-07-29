const puppeteer = require('puppeteer');
const { Parser } = require('json2csv');
const fs = require('fs');

async function extractData(page) {
  return await page.$$eval('[data-index]', async (elements) => {
    const data = [];
    let hideButtonClicked = false;

    for (const element of elements) {
      const showButton = element.querySelector('button');
      const numberOfPeople = parseInt(showButton.innerText.split(' ')[1]);

      if (numberOfPeople > 0) {
        showButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));

        const peopleCards = Array.from(element.querySelectorAll('.selection_card_participant'));

        peopleCards.forEach(person => {
          const name = person.querySelector('.selection_card_participantDetails button').innerText.trim();
          const title = person.querySelector('.selection_card_participantDetails_jobTitle').innerText.trim();
          const orgName = person.querySelector('.selection_card_participantDetails_orgName').innerText.trim();
          console.log('Person data:', { name, title, orgName });

          data.push({
            name,
            title,
            orgName
          });
        });

        const hideButton = Array.from(document.querySelectorAll('button')).find(button => button.innerText.includes('Hide'));
        if (hideButton) {
          hideButton.click();
          hideButtonClicked = true;

          // Scroll immediately after the hide button click
          const scroller = document.querySelector('[data-test-id="virtuoso-scroller"]');
          scroller.scrollTop += 250;
          await new Promise(resolve => setTimeout(resolve, 1000));

        }
      }
    }

    return { data };
  });
}




async function getParticipantDetails() {
  const baseUrl = 'https://ste23-myexperience.personatech.com/selection/a0283fc1-af86-49ca-86ed-b71f46d12f3e';

  const results = new Set();
  let currentIndex = 0;
  let highestIndex = 0;

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36',
  );

  try {
    await page.goto(baseUrl);

    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', 'veronica@talkable.com');
    await page.type('input[name="password"]', '109539685');

    await page.keyboard.press('Enter');

    // Wait for the page navigation to complete after submitting the form
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Click the "Update" button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const updateButton = buttons.find(button => button.innerText === 'Update');
      if (updateButton) {
        updateButton.click();
      }
    });

    await page.waitForSelector('.topNote--expanded', { visible: true });

    // Wait for a moment before clicking the button (adjust the duration if needed)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Listen for console messages from the page
    await page.click('.topNote_toggle');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wait for the "Show" button to appear
    await page.waitForSelector('button', { visible: true });

    while (currentIndex <= highestIndex) {

      const { data } = await extractData(page);
console.log('People:', data);

      

      // Add the data to the results Set
      data.forEach(item => {
        results.add(item);
      });

      // Wait for the page to update
      await page.waitForNavigation({ waitUntil: 'networkidle0' });

      //currentIndex = highestIndex + 1;

      // Click the "Show" button
      await page.evaluate(() => {
        const showButton = Array.from(document.querySelectorAll('button')).find(button => button.innerText.startsWith('Show'));
        if (showButton) {
          showButton.click();
        }
      });
    }
      } catch (error) {
        console.error('An error occurred:', error);
      } finally {
        await new Promise(resolve => setTimeout(resolve, 120000));
        await browser.close().catch(error => {
          console.error('An error occurred while closing the browser:', error);
        });
        const fields = ['name', 'title', 'orgName'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(Array.from(results));
    
        fs.writeFile('results.csv', csv, function(err) {
          if (err) {
            console.error('An error occurred while writing the results to CSV:', err);
          } else {
            console.log('The results have been saved to results.csv');
          }
        });
      }
    }
 
  getParticipantDetails()
