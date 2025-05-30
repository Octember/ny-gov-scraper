import { browser, Runtime } from 'webextension-polyfill-ts';
import { fileSearchHome } from './fileSearchHome';
import { scrapeFileSearchResults } from './fileSearchResultsPage';

console.log('helloworld from content script');

const TARGET_URL = 'https://websurrogates.nycourts.gov/';

function isValidDomain(url: string): boolean {
  return url.startsWith(TARGET_URL);
}

async function handleStartScrape(): Promise<void> {
  console.log('handleStartScrape');
  if (!isValidDomain(window.location.href)) {
    // eslint-disable-next-line no-alert
    alert(`Error: This action can only be run on ${TARGET_URL}`);
    window.location.href = TARGET_URL;
    return;
  }

  if (window.location.href === 'https://websurrogates.nycourts.gov/Home/HomePage') {
    // eslint-disable-next-line no-alert
    alert('Error: Click through the captcha first and select "File Search"');
    // window.location.href = 'https://websurrogates.nycourts.gov/File/FileSearch';
    return;
  }

  if (window.location.href === 'https://websurrogates.nycourts.gov/File/FileSearch') {
    console.log('fileSearchHome');
    await fileSearchHome();
    return;
  }

  if (window.location.href === 'https://websurrogates.nycourts.gov/File/FileSearchResults') {
    console.log('fileSearchResultsPage');
    scrapeFileSearchResults();
    return;
  }

  // If we get here, just signal done for the start step
}

browser.runtime.onMessage.addListener(
  async (message: { type: string; step?: string; metadata?: any }, _sender: Runtime.MessageSender) => {
    if (message.type === 'BACKGROUND_TO_CONTENT') {
      console.log('BACKGROUND_TO_CONTENT', message.step);
      if (message.step === 'START_SCRAPE') {
        await handleStartScrape();
        return true;
      } 
      
      if (message.step === 'FILE_SEARCH_HOME') {
        await fileSearchHome();
        return true;
      }

      if (message.step === 'FILE_SEARCH_RESULTS') {
        const results = scrapeFileSearchResults();
        return results;
      }
      return true;
    }
    return true;
  }
);

export { };
