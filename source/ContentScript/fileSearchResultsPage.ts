import { waitForPageLoad } from './page-load';

export async function scrapeFileSearchResults(): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  const table = document.querySelector<HTMLTableElement>('#NameResultsTable');
  
  if (!table) {
    return results;
  }

  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length > 0) {
      const result: Record<string, unknown> = {};
      cells.forEach((cell, index) => {
        result[`column${index}`] = cell.textContent?.trim() || '';
      });
      results.push(result);
    }
  });

  await waitForPageLoad();
  return results;
} 