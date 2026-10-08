const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function processCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

async function analyze() {
  const dir = '/home/gabriel/Documentos/UNIFEI/COMISSÃO/sistema-rifas';
  const files = [
    'sale_statement_20261008125237_42ad.csv',
    'sale_statement_20261008125311_b67a.csv',
    'sale_statement_20261008125406_ac22.csv'
  ];
  
  let allRows = [];
  for (const f of files) {
     const rows = await processCSV(path.join(dir, f));
     allRows = allRows.concat(rows);
  }
  
  // Need to inspect the columns first to see what fields exist
  if (allRows.length > 0) {
     console.log("Columns:", Object.keys(allRows[0]));
     console.log("First row:", allRows[0]);
  }
}

analyze();
