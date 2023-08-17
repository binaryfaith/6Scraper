const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

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

  return results;
}

// Test the function
processCSVs().then(data => {
  console.log(data);
});
