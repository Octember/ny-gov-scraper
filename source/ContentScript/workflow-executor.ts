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

  try {
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

    isExecuting = true;
    currentStep = status.currentStep;
    console.log('Starting execution of step:', currentStep);
    
    // Add timeout to step execution
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Step execution timed out')), 30000); // 30 second timeout
    });

    const result = await Promise.race([
      executeStep(currentStep, status.metadata),
      timeoutPromise,
    ]);

    console.log('Step execution complete:', currentStep, 'Result:', result);
    
    await browser.runtime.sendMessage({
      type: 'CONTENT_TO_BACKGROUND',
      action: 'STEP_COMPLETE',
      result,
    });
  } catch (error) {
    console.error('Error in workflow execution:', error);
    // Notify background script of failure
    await browser.runtime.sendMessage({
      type: 'CONTENT_TO_BACKGROUND',
      action: 'STEP_FAILED',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    isExecuting = false;
    currentStep = null; // Reset current step to allow retry
  }
}

// Set up periodic status check with exponential backoff
let checkInterval = 1000; // Start with 1 second
const maxInterval = 5000; // Max 5 seconds
const minInterval = 1000; // Min 1 second

function scheduleNextCheck(): void {
  setTimeout(() => {
    checkAndExecuteStep().finally(() => {
      // Adjust interval based on success/failure
      if (isExecuting) {
        // If still executing, decrease interval to check more frequently
        checkInterval = Math.max(minInterval, checkInterval / 2);
      } else {
        // If not executing, increase interval up to max
        checkInterval = Math.min(maxInterval, checkInterval * 1.5);
      }
      scheduleNextCheck();
    });
  }, checkInterval);
}

// Start the first check
scheduleNextCheck();

export { checkAndExecuteStep }; 