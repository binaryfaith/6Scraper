const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const fetch = require('node-fetch');
require('dotenv').config(); // Ensure you have the dotenv library installed
const { HSTOKEN } = process.env;




async function processCSVs() {
  const csvDir = path.join(__dirname, 'CSV'); // path to your CSV folder
  const files = fs.readdirSync(csvDir);

  let results = [];

  for (let file of files) {
    if (path.extname(file) !== '.csv') continue; // Skip non-CSV files

    const csvContent = fs.readFileSync(path.join(csvDir, file), 'utf8');
    
    // Parse CSV content using PapaParse
    const parsedData = Papa.parse(csvContent, {
      header: true, // CSV has a header row
      skipEmptyLines: true
    });

    if (parsedData.data.length > 0) {
      const firstRow = parsedData.data[0];
      const companyName = firstRow.companyName;
      const [country, website] = firstRow.countryWebsite.split(' - ');
      results.push([companyName, country, website]);
    }
  }

 fetchHubspotData(results)
}

// Test the function
processCSVs().then(data => {
  console.log(data);
});

async function fetchHubspotData(companies) {

    const searchEndpoint = 'https://api.hubapi.com/crm/v3/objects/companies/search';
    const headers = {
        'authorization': `Bearer ${HSTOKEN}`,
        'content-type': 'application/json'
    };

    let allResults = [];

    for (let company of companies) {
        console.log(company[2])
        const PublicObjectSearchRequest = {
            filterGroups: [
                {
                    filters: [


                        {
                            propertyName: "domain",
                            operator: "EQ",
                            value: company[2]
                        }
                    ]
                }
            ],
            properties: ["name", "country", "domain", "salesforceaccountid", "x6sense_account_segment__c"],
            limit: 100
        };
//console.log(JSON.stringify(PublicObjectSearchRequest))
        const response = await fetch(searchEndpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(PublicObjectSearchRequest)
        });

        if (response.ok) {
            const apiResponse = await response.json();
            console.log('Response:', JSON.stringify(apiResponse, null, 2));

            allResults.push(...apiResponse.results);
        } else {
            console.error('Failed to fetch data for company:', company[0]);
            const errorResponse = await response.json();  // parse the response to get the error message
            console.error('Error response:', JSON.stringify(errorResponse, null, 2));  // log the error response
        }
    }

    // Convert to CSV using papaparse
    const csvContent = Papa.unparse(allResults, {
        columns: ['name', 'country', 'domain', 'salesforceaccountid', 'x6sense_account_segment__c']
    });

    // Write to a file using fs
    fs.writeFileSync('HS_Response.csv', csvContent);
    console.log('Data written to HS_Response.csv');
}