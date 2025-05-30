import { browser, Runtime } from 'webextension-polyfill-ts';
import { fileSearchHome } from './fileSearchHome';
import { scrapeFileSearchResults } from './fileSearchResultsPage';

console.log('helloworld from content script');

const TARGET_URL = 'https://websurrogates.nycourts.gov/';
const PAGE_LOAD_WAIT_MS = 10000; // 10 seconds

// Track execution state for this content script instance
let currentStep: string | null = null;
let isExecuting = false;

function isValidDomain(url: string): boolean {
  return url.startsWith(TARGET_URL);
}

async function waitForPageLoad(): Promise<void> {
  console.log('Waiting for page load...');
  await new Promise((resolve) => setTimeout(resolve, PAGE_LOAD_WAIT_MS));
  console.log('Page load wait complete');
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
    await waitForPageLoad();
    return;
  }

  if (window.location.href === 'https://websurrogates.nycourts.gov/File/FileSearchResults') {
    console.log('fileSearchResultsPage');
    await scrapeFileSearchResults();
    await waitForPageLoad();
    return;
  }

  // If we get here, just signal done for the start step
}

async function clickFileButton(btn: HTMLButtonElement): Promise<void> {
  btn.click();
  await waitForPageLoad();
}

async function clickFileLinksSequentially(buttons: NodeListOf<HTMLButtonElement>): Promise<void> {
  for (let i = 0; i < buttons.length; i += 1) {
    await clickFileButton(buttons[i]);
  }
}

async function openFileLinksOnResultsPage(): Promise<string[]> {
  const links: string[] = [];
  const table = document.querySelector<HTMLTableElement>('#NameResultsTable');
  console.log('table', table);
  if (!table) return links;

  const buttons = table.querySelectorAll<HTMLButtonElement>('button.ButtonAsLink[type="submit"]');
  await clickFileLinksSequentially(buttons);
  return links;
}

async function executeStep(step: string, _metadata: Record<string, unknown>): Promise<unknown> {
  switch (step) {
    case 'START_SCRAPE':
      await handleStartScrape();
      return null;
    case 'FILE_SEARCH_HOME':
      await fileSearchHome();
      await waitForPageLoad();
      return null;
    case 'FILE_SEARCH_RESULTS':
      const results = await scrapeFileSearchResults();
      await waitForPageLoad();
      return results;
    case 'OPEN_FILE_LINKS':
      const opened = await openFileLinksOnResultsPage();
      await waitForPageLoad();
      return opened;
    default:
      return null;
  }
}

// Check status and execute next step if active
async function checkAndExecuteStep(): Promise<void> {
  // Skip if we're already executing a step
  if (isExecuting) {
    return;
  }

  const status = await browser.runtime.sendMessage({
    type: 'CONTENT_TO_BACKGROUND',
    action: 'GET_STATUS',
  });

  // Skip if no step or if we're already on this step
  if (!status.isActive || !status.currentStep || status.currentStep === currentStep) {
    return;
  }

  try {
    isExecuting = true;
    currentStep = status.currentStep;
    console.log('Executing step:', currentStep);
    
    const result = await executeStep(currentStep, status.metadata);
    
    await browser.runtime.sendMessage({
      type: 'CONTENT_TO_BACKGROUND',
      action: 'STEP_COMPLETE',
      result,
    });
  } finally {
    isExecuting = false;
  }
}

// Set up periodic status check
setInterval(checkAndExecuteStep, 1000);

browser.runtime.onMessage.addListener(
  async (message: { type: string; step?: string; metadata?: Record<string, unknown> }, _sender: Runtime.MessageSender) => {
    if (message.type === 'BACKGROUND_TO_CONTENT') {
      console.log('BACKGROUND_TO_CONTENT', message.step);
      if (message.step === 'CHECK_STATUS') {
        await checkAndExecuteStep();
      }
      return true;
    }
    return true;
  }
);

export { };
