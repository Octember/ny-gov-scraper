import { browser, Runtime } from 'webextension-polyfill-ts';
import { WorkflowStep, WorkflowStatus } from '../types';
import { fileSearchHome } from './fileSearchHome';
import { scrapeFileSearchResults } from './fileSearchResultsPage';
import { openFileLinksOnResultsPage } from './file-links';
import { waitForPageLoad } from './page-load';

// Track execution state for this content script instance
let currentStep: WorkflowStep | null = null;
let isExecuting = false;

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
}

async function executeStep(step: WorkflowStep, _metadata: Record<string, unknown>): Promise<unknown> {
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
    case 'CLICK_PROBATE_PETITION':
      const buttons = document.querySelectorAll<HTMLButtonElement>('button');
      const probateButton = Array.from(buttons).find(btn => btn.textContent?.includes('PROBATE PETITION'));
      if (probateButton) {
        probateButton.click();
        await waitForPageLoad();
      }
      return null;
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

export { checkAndExecuteStep }; 