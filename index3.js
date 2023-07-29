const puppeteer = require('puppeteer');
const { Parser } = require('json2csv');
const fs = require('fs');

async function getParticipantDetails() {
    const baseUrl = 'https://ste23-myexperience.personatech.com/selection/a0283fc1-af86-49ca-86ed-b71f46d12f3e';

  const results = new Set();
  let previousResultsLength = 0;
  let currentIndex = 0;

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36');

  try {
    await page.goto(baseUrl);

    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', 'kevin@talkable.com');
    await page.type('input[name="password"]', '100814083');

    await page.keyboard.press('Enter');

    // Wait for the page navigation to complete after submitting the form
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Click the "Go" button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const goButton = buttons.find(button => button.innerText === 'Update');
      if (goButton) {
        goButton.click();
      }
    });

    await page.waitForSelector('.topNote--expanded', { visible: true });

    // Wait for a moment before clicking the button (adjust the duration if needed)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Listen for console messages from the page
    await page.click('.topNote_toggle');

    await page.evaluate(() => {
        const scroller = document.querySelector('[data-test-id="virtuoso-scroller"]');
        if (scroller) {
          scroller.style.height = '100000%';
        }
      });      

      await new Promise(resolve => setTimeout(resolve, 1000));


      while (currentIndex <= 23) {

        try {
          /**
          // Click the "Show" button
          await page.evaluate(async (currentIndex) => {
            const showButton = document.querySelector(`[data-item-index="${currentIndex}"] .selection_card_showParticipants button`);
            if (showButton && showButton.innerText.startsWith("Show")) {
              showButton.click();
            }
          }, currentIndex);
           

              // Check if the "selection_cardslist selection_cardslist_opened" class is present
    const hasOpenedClass = await page.evaluate((currentIndex) => {
        return !!document.querySelector(`[data-item-index="${currentIndex}"] .selection_cardslist.selection_cardslist_opened`);
      }, currentIndex);
  
      if (hasOpenedClass) {
        console.log(`Skipping index ${currentIndex} due to "selection_cardslist selection_cardslist_opened"`);
        currentIndex++;
        continue;
      }
      
          // Wait for the slideDownAnimation element to appear
          await page.waitForSelector(`[data-item-index="${currentIndex}"] .selection_card_body.slideDownAnimation`, { visible: true });
      */
          // Scrape person data
          const personDivs = await page.$$(`[data-item-index="${currentIndex}"] .selection_card_participant`);
      
          for (const div of personDivs) {
            const nameButton = await div.$('.btn.smooth.btn--md.btn--link');
            const name = await nameButton.evaluate(node => node.innerText);
      
            const titleElement = await div.$('.selection_card_participantDetails_jobTitle');
            const title = await titleElement.evaluate(node => node.innerText);
      
            const companyElement = await div.$('.selection_card_participantDetails_orgName');
            const company = await companyElement.evaluate(node => node.innerText);
      
            const person = { name, title, company };
            results.add(person);
          }
/**
              // Click the "Hide" button
    await page.evaluate(async (currentIndex) => {
        const hideButton = document.querySelector(`[data-item-index="${currentIndex}"] .selection_card_showParticipants button`);
        if (hideButton && hideButton.innerText.startsWith("Hide")) {
          hideButton.click();
        }
      }, currentIndex);
       */
      
          function customLog(resultsArray) {
            resultsArray.forEach((result, index) => {
              console.log(`Item ${index}:`, JSON.stringify(result, null, 2));
            });
          }

          customLog(Array.from(results));
          
          currentIndex++;
        } catch (error) {
          console.error('An error occurred:', error);
      
          if (error instanceof puppeteer.errors.TimeoutError) {
            console.log(`Resuming scraping from index ${currentIndex + 1}`);
            await page.waitForSelector(`[data-item-index="${currentIndex + 1}"]`, { visible: true });
          }
        }
      }      
    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await new Promise(resolve => setTimeout(resolve, 120000));
    await browser.close().catch(error => {
      console.error('An error occurred while closing the browser:', error);
    });
    const fields = ['name', 'title', 'company'];
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

getParticipantDetails();

