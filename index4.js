const puppeteer = require('puppeteer');

async function getParticipantDetails() {
  const baseUrl = 'https://login.6sense.com/';

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await page.goto(baseUrl);

    const orgNameInputSelector = 'input[placeholder="Enter your organization name"]';
    const continueButtonSelector = 'button#button_searchOrganization';

    await page.waitForSelector(orgNameInputSelector);
    await page.type(orgNameInputSelector, 'Tenovos');

    await page.waitForSelector(continueButtonSelector);
    await page.click(continueButtonSelector);

    // Wait for the page navigation to complete after clicking the button
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Now enter email and password on the next page
    const emailInputSelector = 'input[placeholder="user@email.com"]';
    const passwordInputSelector = 'input[type="password"]';
    const loginButtonSelector = 'button[type="submit"]';  // Assuming the login button is of type submit

    await page.waitForSelector(emailInputSelector);
    await page.type(emailInputSelector, 'binaryfaith@gmail.com');

    await page.waitForSelector(passwordInputSelector);
    await page.type(passwordInputSelector, 'Pacifica1!');  // Replace with your actual password

    await page.waitForSelector(loginButtonSelector);
    await page.click(loginButtonSelector);

    // Wait for the page navigation to complete after clicking the login button
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

     // Navigate to the analytics page
     const analyticsPageUrl = 'https://tenovos.abm.6sense.com/segments/segment/494087/analytics/';
     await page.goto(analyticsPageUrl, { waitUntil: 'networkidle0' });
 
    // Extract the number of accounts
    const accountsSelector = 'div.label--2KULH';
    await page.waitForSelector(accountsSelector);
    let divs = await page.$$(accountsSelector);

    let numAccounts;
    for (let div of divs) {
      let text = await page.evaluate(element => element.textContent, div);
      if (text.includes('Accounts')) {
        numAccounts = text.match(/\((\d+)\)/)[1];
        break;
      }
    }

    console.log(numAccounts);  // Print out the number of accounts

// Get all paginators
let paginators = await page.$$('.paginateOuter--3zCOh');
let lastPaginator = paginators[paginators.length - 1]; // Get the last paginator

// Extract the last page number from the paginator
const paginatorSelector = 'li';
await lastPaginator.waitForSelector(paginatorSelector);
let pages = await lastPaginator.$$eval(paginatorSelector, lis => lis.map(li => li.getAttribute('title')));
let lastPage = parseInt(pages[pages.length - 2], 10);  // Get the second to last li's title and convert it to a number

console.log(lastPage);  // Print out the last page number

// Select all the cards
const cardSelector = '.ant-card.card--30xg8.accountCard--1n7Bb.undefined';
await page.waitForSelector(cardSelector);
let cards = await page.$$(cardSelector);

let allData = [];

// Loop through each page in the paginator
for (let i = 1; i <= 1/*lastPage*/; i++) {
    // Wait for the cards to load
    await page.waitForSelector(cardSelector);
    
    // Perform the data extraction as before
    let cards = await page.$$(cardSelector);
    for (let card of cards) {
      let cardURL = await card.$eval('a', a => a.getAttribute('href'));
      let companyName = await card.$eval('a > span', span => span.innerText);
      let countryWebsite = await card.$eval('a + span', span => span.innerText);
      allData.push({ cardURL, companyName, countryWebsite });
    }

    // Click the link to go to the next page
    await page.evaluate(async (i) => {
        const paginators = Array.from(document.querySelectorAll('.paginateOuter--3zCOh'));
        const lastPaginator = paginators[paginators.length - 1];
        const nextPageLink = lastPaginator.querySelector(`li[title="${i + 1}"] a`);
        if (nextPageLink) {
          nextPageLink.click();
        }
      }, i);
      

    // Clear cards array
    cards = [];
}
console.log(`Total accounts: ${allData.length}`);
// After you've collected all the URLs in allData...

// Visit each URL and click the "Timeline" link
/** 
for (let data of allData) {
    await visitAndClickTimeline(browser, data.cardURL);
}
*/
// Simply call the function with the first URL
await visitAndClickTimeline(browser, allData[0].cardURL);

  

    // Continue your scraping logic here...
  } catch (error) {
    console.error('An error occurred:', error);
  } 
}

async function visitAndClickTimeline(browser, cardURL) {
    const page = await browser.newPage();
    
    const fullURL = 'https://tenovos.abm.6sense.com' + cardURL;  
    await page.goto(fullURL, { waitUntil: 'networkidle0' });
    
    // Click the Timeline button
    await page.evaluate(() => {
      const timelineButton = Array.from(document.querySelectorAll('span')).find(el => el.innerText.trim() === "Timeline");
      if (timelineButton) {
        timelineButton.click();
      }
    });
  
    await page.waitForTimeout(2000); // wait for some time for the dropdown to be clickable
  
    // Open the dropdown
    await page.evaluate(() => {
      const dropdown = document.querySelector('.rc-select-selection');
      if (dropdown) {
        dropdown.click();
      }
    });
  
    await page.waitForTimeout(2000); // wait for some time for the options to appear
  
    // Select "Last 180 Days" from the dropdown
    await page.evaluate(() => {
      const option = Array.from(document.querySelectorAll('.rc-select-dropdown li')).find(el => el.innerText.trim() === "Last 180 Days");
      if (option) {
        option.click();
      }
    });

    await page.waitForTimeout(2000); // wait for some time for the options to appear
  
      // Click the Load More button until it's not present
  let loadMoreButtonExists = true;
  while (loadMoreButtonExists) {
    loadMoreButtonExists = await page.evaluate(() => {
      const loadMoreButton = document.querySelector('button.loadMoreBtn--QwqI7');
      if (loadMoreButton) {
        loadMoreButton.click();
        return true;
      } else {
        return false;
      }
    });
    // Pause to allow page to update content
    await page.waitForTimeout(2000); 
  }
  
  await page.waitForTimeout(2000); // wait for some time for the options to appear

    // Extract and store the timeline card data
    const timelineData = await page.$$eval('div.timelineCard--2JA72 li', lis => lis.map(li => {
        const spans = Array.from(li.querySelectorAll('span'));
        const spanTexts = spans.map(span => span.innerText);
        return spanTexts;
      }));
      
      console.log(timelineData); 
    // Continue your data extraction here...
  }
  
  
  

getParticipantDetails();
