import { browser, Runtime } from 'webextension-polyfill-ts';
import { WorkflowStep, WorkflowStatus } from '../types';
import { fileSearchHome } from './fileSearchHome';
import { scrapeFileSearchResults } from './fileSearchResultsPage';
import { openFileLinksOnResultsPage } from './file-links';
import { waitForPageLoad } from './page-load';

const TARGET_URL = 'https://websurrogates.nycourts.gov/';

// Track execution state for this content script instance
let currentStep: WorkflowStep | null = null;
let isExecuting = false;

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

  // If we're not on any of the expected pages, redirect to the target URL
  window.location.href = TARGET_URL;
}

async function executeStep(step: WorkflowStep, _metadata: Record<string, unknown>): Promise<unknown> {
  console.log('Executing step:', step);
  switch (step) {
    case 'START_SCRAPE':
      await handleStartScrape();
      return null;
    case 'FILE_SEARCH_HOME':
      console.log('Executing FILE_SEARCH_HOME');
      await fileSearchHome();
      await waitForPageLoad();
      return null;
    case 'FILE_SEARCH_RESULTS':
      console.log('Executing FILE_SEARCH_RESULTS');
      const results = await scrapeFileSearchResults();
      await waitForPageLoad();
      return results;
    case 'OPEN_FILE_LINKS':
      console.log('Executing OPEN_FILE_LINKS');
      const opened = await openFileLinksOnResultsPage();
      await waitForPageLoad();
      return opened;
    case 'CLICK_PROBATE_PETITION':
      console.log('Executing CLICK_PROBATE_PETITION');
      const buttons = document.querySelectorAll<HTMLButtonElement>('button');
      const probateButton = Array.from(buttons).find(btn => btn.textContent?.includes('PROBATE PETITION'));
      if (probateButton) {
        probateButton.click();
        await waitForPageLoad();
      }
      return null;
    default:
      console.log('Unknown step:', step);
      return null;
  }
}

// Check status and execute next step if active
async function checkAndExecuteStep(): Promise<void> {
  // Skip if we're already executing a step
  if (isExecuting) {
    console.log('Already executing a step, skipping');
    return;
  }

  const status = await browser.runtime.sendMessage({
    type: 'CONTENT_TO_BACKGROUND',
    action: 'GET_STATUS',
  });

  console.log('Current workflow status:', status);

  // Skip if no step or if we're already on this step
  if (!status.isActive) {
    console.log('Workflow not active, skipping');
    return;
  }

  if (!status.currentStep) {
    console.log('No current step, skipping');
    return;
  }

  if (status.currentStep === currentStep) {
    console.log('Already on current step, skipping');
    return;
  }

  try {
    isExecuting = true;
    currentStep = status.currentStep;
    console.log('Starting execution of step:', currentStep);
    
    const result = await executeStep(currentStep, status.metadata);
    console.log('Step execution complete:', currentStep, 'Result:', result);
    
    await browser.runtime.sendMessage({
      type: 'CONTENT_TO_BACKGROUND',
      action: 'STEP_COMPLETE',
      result,
    });
  } catch (error) {
    console.error('Error executing step:', error);
  } finally {
    isExecuting = false;
  }
}

// Set up periodic status check
setInterval(checkAndExecuteStep, 5000);

export { checkAndExecuteStep }; 