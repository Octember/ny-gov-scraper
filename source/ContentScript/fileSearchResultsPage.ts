export interface FileSearchResultRow {
  fileNumber: string;
  fileDate: string;
  fileName: string;
  proceeding: string;
  dod: string;
}

export function scrapeFileSearchResults(): FileSearchResultRow[] {
  const table = document.querySelector<HTMLTableElement>('#NameResultsTable');
  if (!table) {
    console.warn('No results table found');
    return [];
  }
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const results: FileSearchResultRow[] = rows.map(row => {
    const cells = row.querySelectorAll('td');
    return {
      fileNumber: cells[0]?.innerText.trim() || '',
      fileDate: cells[1]?.innerText.trim() || '',
      fileName: cells[2]?.innerText.trim() || '',
      proceeding: cells[3]?.innerText.trim() || '',
      dod: cells[4]?.innerText.trim() || '',
    };
  });
  console.log('File Search Results:', results);
  return results;
} 