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
    await page.type('input[name="username"]', 'david@talkable.com');
    await page.type('input[name="password"]', '100730351');

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

    while (currentIndex < 1074) {
      try {
        // Wait for the participant details to be visible
        await page.waitForSelector(`[data-item-index="${currentIndex}"] .selection_card_participantDetails a`);
    
        const participantDetailsDivs = await page.$$(`[data-item-index="${currentIndex}"] .selection_card_participantDetails`);
    
        for (const div of participantDetailsDivs) {
          const anchor = await div.$('a');
    
          if (anchor) {
            const label = await anchor.evaluate(node => node.getAttribute('data-label'));
            const url = await anchor.evaluate(node => node.getAttribute('data-url'));
    
            const orgTypeSelector = `[data-item-index="${currentIndex}"] .selection_card_dataRow:nth-child(2) .selection_card_dataWrapper_displayVal ul li`;
            const orgTypeElement = await page.$(orgTypeSelector);
            const orgType = await (await orgTypeElement.getProperty('textContent')).jsonValue();
    
            const orgDescSelector = `[data-item-index="${currentIndex}"] .selection_card_dataRow:nth-child(1) .selection_card_dataWrapper_displayVal abbr`;
            const orgDescElement = await page.$(orgDescSelector);
            const orgDesc = await (await orgDescElement.getProperty('textContent')).jsonValue();
    
            const participant = { label, url, orgType, orgDesc };
    
            if (!Array.from(results).some(p => p.url === participant.url)) {
              results.add(participant);
    
              if (results.size > previousResultsLength) {
                previousResultsLength = results.size;
                console.log(Array.from(results));
                //console.log(`Scraping participant ${currentIndex}...`);
              }
            }
          }
        }
    
        currentIndex++;
    
        await page.evaluate(async (currentIndex) => {
          const scroller = document.querySelector('[data-test-id="virtuoso-scroller"]');
          let scrollTop = scroller.scrollTop;
          let scrollSpeed = 200;
          console.log(`Scroll speed: ${scrollSpeed}px per 500ms`);
        
          function scroll() {
            scrollTop += scrollSpeed;
            scroller.scrollTop = scrollTop;
            if (scrollTop + scroller.clientHeight >= scroller.scrollHeight || currentIndex >= 1074) {
              console.log("Scrolling finished");
              return;
            }
            setTimeout(scroll, 500);
          }
        
          setTimeout(scroll, 500);
        }, currentIndex);
    
        // Wait for new items to be loaded
        await page.waitForFunction(`document.querySelectorAll('[data-item-index="${currentIndex}"] .selection_card_participantDetails a').length > 0`);
      } catch (error) {
        console.error('An error occurred:', error);
    
        if (error instanceof puppeteer.errors.TimeoutError) {
          console.log(`Resuming scraping from participant ${currentIndex + 1}`);
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
    const fields = ['label', 'url', 'orgType', 'orgDesc'];
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
