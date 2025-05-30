// This file expects to run in the context of the File Search page.

import { waitForPageLoad } from './page-load';

export const COURT_SELECT_MAP: Record<string, string> = {
  "Albany County Surrogate's Court": '1',
  "Allegany County Surrogate's Court": '2',
  "Bronx County Surrogate's Court": '3',
  "Broome County Surrogate's Court": '4',
  "Cattaraugus County Surrogate's Court": '5',
  "Cayuga County Surrogate's Court": '6',
  "Chautauqua County Surrogate's Court": '7',
  "Chenango County Surrogate's Court": '9',
  "Clinton County Surrogate's Court": '10',
  "Columbia County Surrogate's Court": '11',
  "Cortland County Surrogate's Court": '12',
  "Delaware County Surrogate's Court": '13',
  "Dutchess County Surrogate's Court": '14',
  "Erie County Surrogate's Court": '15',
  "Essex County Surrogate's Court": '16',
  "Franklin County Surrogate's Court": '17',
  "Fulton County Surrogate's Court": '18',
  "Genesee County Surrogate's Court": '19',
  "Greene County Surrogate's Court": '20',
  "Herkimer County Surrogate's Court": '22',
  "Jefferson County Surrogate's Court": '23',
  "Kings County Surrogate's Court": '24',
  "Lewis County Surrogate's Court": '25',
  "Livingston County Surrogate's Court": '26',
  "Madison County Surrogate's Court": '27',
  "Monroe County Surrogate's Court": '28',
  "Montgomery County Surrogate's Court": '29',
  "Nassau County Surrogate's Court": '30',
  "New York County Surrogate's Court": '31',
  "Niagara County Surrogate's Court": '32',
  "Oneida County Surrogate's Court": '33',
  "Onondaga County Surrogate's Court": '34',
  "Ontario County Surrogate's Court": '35',
  "Orange County Surrogate's Court": '36',
  "Orleans County Surrogate's Court": '37',
  "Oswego County Surrogate's Court": '38',
  "Otsego County Surrogate's Court": '39',
  "Putnam County Surrogate's Court": '40',
  "Queens County Surrogate's Court": '41',
  "Rensselaer County Surrogate's Court": '42',
  "Richmond County Surrogate's Court": '43',
  "Rockland County Surrogate's Court": '44',
  "Saratoga County Surrogate's Court": '45',
  "Schenectady County Surrogate's Court": '46',
  "Schoharie County Surrogate's Court": '47',
  "Schuyler County Surrogate's Court": '48',
  "Seneca County Surrogate's Court": '49',
  "St Lawrence County Surrogate's Court": '50',
  "Steuben County Surrogate's Court": '51',
  "Suffolk County Surrogate's Court": '52',
  "Sullivan County Surrogate's Court": '53',
  "Tioga County Surrogate's Court": '54',
  "Tompkins County Surrogate's Court": '55',
  "Ulster County Surrogate's Court": '56',
  "Warren County Surrogate's Court": '57',
  "Washington County Surrogate's Court": '58',
  "Wayne County Surrogate's Court": '59',
  "Westchester County Surrogate's Court": '60',
  "Wyoming County Surrogate's Court": '61',
  "Yates County Surrogate's Court": '62',
};

export async function fileSearchHome(): Promise<void> {
  // Set CourtSelect to Kings County Surrogate's Court
  const kingsId = COURT_SELECT_MAP["Kings County Surrogate's Court"];
  const courtSelect = document.querySelector<HTMLSelectElement>('#CourtSelect');
  if (courtSelect && kingsId) {
    courtSelect.value = kingsId;
    courtSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Set SelectedProceeding
  const proceedingSelect = document.querySelector<HTMLSelectElement>('#SelectedProceeding');
  if (proceedingSelect) {
    proceedingSelect.value = 'PROBATE PETITION';
    proceedingSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Set Filing Date From
  const dateFrom = document.querySelector<HTMLInputElement>('#txtFilingDateFrom');
  if (dateFrom) {
    dateFrom.value = '05/01/2025';
    dateFrom.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Set Filing Date To
  const dateTo = document.querySelector<HTMLInputElement>('#txtFilingDateTo');
  if (dateTo) {
    dateTo.value = '05/29/2025';
    dateTo.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Click Submit
  const submitBtn = document.querySelector<HTMLButtonElement>('#FileSearchSubmit2');
  if (submitBtn) {
    submitBtn.click();
    await waitForPageLoad();
  }
}

export function fileSearchResultsPage(): void {
  // TODO: implement scraping logic for results page
} 