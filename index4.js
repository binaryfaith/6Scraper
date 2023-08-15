const puppeteer = require('puppeteer');
const { parse } = require('json2csv');
const fs = require('fs');
require('dotenv').config();


// Function to retry an operation
async function retry(operation, retryCount) {
  for(let i = 0; i < retryCount; i++) {
    try {
      return await operation();
    } catch(error) {
      console.log(`Attempt ${i + 1} failed. Retrying...`);
    }
  }
  throw new Error(`Operation failed after ${retryCount} attempts`);
}


async function getParticipantDetails() {
  const baseUrl = 'https://login.6sense.com/';
  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

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
    await page.type(emailInputSelector, email);

    await page.waitForSelector(passwordInputSelector);
    await page.type(passwordInputSelector, password);  // Replace with your actual password

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
for (let i = 1; i <= lastPage; i++) {
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
// This is within your getParticipantDetails function...

let testing = false; // Set this to false when you want to process all accounts

// Create an array to hold all the extracted data
let allExtractedData = [];

if (testing) {
  // If testing, only process the first account
  let extractedData = await visitAndClickTimeline(browser, allData[0]);
  allExtractedData.push(extractedData);
} else {
  // If not testing, process all accounts
  for (let index = 112; index < allData.length; index++) {
    try {
        // Wrap the visitAndClickTimeline call in a retry function
        await retry(async () => {
          let extractedData = await visitAndClickTimeline(browser, allData[index]);
          allExtractedData.push(extractedData);

          // Generate a filename for each account based on the company name
          let companyName = allData[index].companyName;
          const filename = `${companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
          writeToCSV(extractedData, filename);
        }, 3);  // Retry 3 times
    } catch (error) {
        console.error(`Error processing URL at index ${index}: ${allData[index].url}`);
        console.error(`Associated cardData: ${JSON.stringify(allData[index])}`);
        console.error(`Error message: ${error.message}`);
        break;
    }
  }
}

// At this point, allExtractedData contains the data extracted from all the visited URLs
// You can now call the writeToCSV function with allExtractedData as its argument

// Write extracted data to CSV
await browser.close();

// Continue your scraping logic here...
} catch (error) {
console.error('An error occurred:', error);
}
}

async function visitAndClickTimeline(browser, cardData) {
    const page = await browser.newPage();
    const cardURL = cardData.cardURL
    
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
    
    const timelineData = await extractTimelineData(page,cardData);
    // Continue your data extraction here...

    console.log(JSON.stringify(timelineData[0], null, 2));

    await page.close();

    return timelineData
    //writeToCSV(timelineData, 'output.csv')

  }

  const extractTimelineData = async (page, cardData) => {
    return await page.evaluate((cardData) => {
        const timelineItems = Array.from(document.querySelectorAll('.timeline--1DYS0 > .timelineItem--Au13W'));

        return timelineItems.map(item => {
            const dateNode = item.querySelector('.timelineDateFormatted--DUS0D span');
            const date = dateNode ? dateNode.innerText : null;

            const activityItems = Array.from(item.querySelectorAll('.timeline--1DYS0 > .timelineItem--Au13W'));
            const activities = activityItems.map(li => {
                const descriptionNode = li.querySelector('.title--3sI-u span span');
                const description = descriptionNode ? descriptionNode.innerText : null;

                const detailLinkNodes = Array.from(li.querySelectorAll('.link--1qTbM a'));
                const detailLinks = detailLinkNodes.map(a => a.href).join(', ');

                const detailSpanNodes = Array.from(li.querySelectorAll('.title--3sI-u span span:not(:first-child)'));
                const detailSpans = detailSpanNodes.map(span => span.innerText).join(', ');

                const keywordNodes = Array.from(li.querySelectorAll('.pill--2Rph2 .keywordText--1jpwR'));
                const keywords = keywordNodes.map(span => span.innerText).join(', ');

                let detail = null;
                if (detailLinks.length > 0) {
                    detail = detailLinks;
                } else if (detailSpans.length > 0) {
                    detail = detailSpans;
                } else if (keywords.length > 0) {
                    detail = keywords;
                }

                const regexFirstNum = /\d+/;
                const regexNumAfterOf = /of (\d+)/;
                const regexNumAfterBy = /by (\d+)/;
                const regexNumAfterIn = /in (\d+)/; // new regex for finding number after "in"

                let pagesViewed, timesViewed, numberOfPeople, impressions, campaigns;

                numberOfPeople = description && description.match(regexNumAfterBy) ? parseInt(description.match(regexNumAfterBy)[1], 10) : null;

                // new condition for description includes "Media"
                if (description && description.includes("Media")) {
                    impressions = description && description.match(regexFirstNum) ? parseInt(description.match(regexFirstNum)[0], 10) : null;
                    campaigns = description && description.match(regexNumAfterIn) ? parseInt(description.match(regexNumAfterIn)[1], 10) : null;
                    return { ...cardData, description, detail, impressions, campaigns };
                }

                if (description && description.includes("clicked")) {
                    pagesViewed = description && description.match(regexFirstNum) ? parseInt(description.match(regexFirstNum)[0], 10) : null;
                    timesViewed = description && description.match(regexNumAfterOf) ? parseInt(description.match(regexNumAfterOf)[1], 10) : null;
                    let timesClicked = timesViewed;
                    return { ...cardData, description, detail, pagesViewed, timesClicked, numberOfPeople };
                } else if (description && description.includes("researched")) {
                    pagesViewed = description && description.match(regexFirstNum) ? parseInt(description.match(regexFirstNum)[0], 10) : null;
                    timesViewed = description && description.match(regexNumAfterOf) ? parseInt(description.match(regexNumAfterOf)[1], 10) : null;
                    let keywordsResearched = pagesViewed;
                    let timesResearched = timesViewed;
                    return { ...cardData, description, detail, keywordsResearched, timesResearched, numberOfPeople };
                } else {
                    pagesViewed = description && description.match(regexFirstNum) ? parseInt(description.match(regexFirstNum)[0], 10) : null;
                    timesViewed = description && description.match(regexNumAfterOf) ? parseInt(description.match(regexNumAfterOf)[1], 10) : null;
                }

                return { ...cardData, description, detail, pagesViewed, timesViewed, numberOfPeople };
            });

            return {
                date,
                activities
            };
        }).filter(item => item.date !== null || item.activities.length !== 0); // remove empty objects
    }, cardData);
};



function writeToCSV(data, filename) {
  const flatData = data.reduce((acc, dayData) => {
    const { date, activities } = dayData;
    if (!activities) {
      console.log('Warning: no activities for this entry:', dayData);
      return acc;
    }
    const dayActivities = activities.map(activity => {
      const flatActivity = { ...activity, date };
      if (activity.cardData) {
        flatActivity.cardURL = activity.cardData.cardURL;
        flatActivity.companyName = activity.cardData.companyName;
        flatActivity.countryWebsite = activity.cardData.countryWebsite;
        delete flatActivity.cardData;
      }
      return flatActivity;
    });
    return [...acc, ...dayActivities];
  }, []);
  const csv = parse(flatData);
  fs.writeFileSync(filename, csv);
}




getParticipantDetails();
