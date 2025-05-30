import { browser, Runtime } from 'webextension-polyfill-ts';
import { fileSearchHome } from './fileSearchHome';

console.log('helloworld from content script');

const TARGET_URL = 'https://websurrogates.nycourts.gov/';

function isValidDomain(url: string): boolean {
  return url.startsWith(TARGET_URL);
}

function handleStartScrape(): void {
  console.log('handleStartScrape');
  if (!isValidDomain(window.location.href)) {
    // eslint-disable-next-line no-alert
    alert(
      `Error: This action can only be run on ${TARGET_URL}`
    );
    window.location.href = TARGET_URL;
    return;
  }

  if (window.location.href !== 'https://websurrogates.nycourts.gov/File/FileSearch') {
    // eslint-disable-next-line no-alert
    alert('Error: Click through the captcha first and select "File Search"');
    // window.location.href = 'https://websurrogates.nycourts.gov/File/FileSearch';
    return;
  }
  fileSearchHome();
}

browser.runtime.onMessage.addListener(
  (message: { type: string }, _sender: Runtime.MessageSender) => {
    if (message.type === 'START_SCRAPE') {
      handleStartScrape();
    }
  }
);

export { };
