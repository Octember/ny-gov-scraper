import { browser } from 'webextension-polyfill-ts';
import { WorkflowStep } from '../types';
import { fileSearchHome } from './fileSearchHome';
import { scrapeFileSearchResults } from './fileSearchResultsPage';
import { openFileLinksOnResultsPage } from './file-links';
import { waitForPageLoad } from './page-load';

const TARGET_URL = 'https://websurrogates.nycourts.gov/';
const TIMEOUT_MS = 30_000;
const INITIAL_INTERVAL = 1_000;
const MAX_INTERVAL = 5_000;
const MIN_INTERVAL = 1_000;

type PageHandler = {
  match: (url: string) => boolean;
  handler: () => Promise<unknown>;
};

const PAGE_HANDLERS: Record<WorkflowStep, PageHandler> = {
  START_SCRAPE: {
    match: url => url.startsWith(TARGET_URL),
    handler: async () => {
      if (window.location.pathname === '/Home/HomePage') {
        throw new Error('Complete the captcha and select "File Search"');
      }
    },
  },
  FILE_SEARCH_HOME: {
    match: url => url.includes('/File/FileSearch'),
    handler: async () => {
      await fileSearchHome();
      await waitForPageLoad();
    },
  },
  FILE_SEARCH_RESULTS: {
    match: url => url.includes('/File/FileSearchResults'),
    handler: async () => {
      const results = await scrapeFileSearchResults();
      await waitForPageLoad();
      return results;
    },
  },
  OPEN_FILE_LINKS: {
    match: url => url.includes('/File/FileSearchResults'),
    handler: async () => {
      const opened = await openFileLinksOnResultsPage(0 );
      await waitForPageLoad();
      return opened;
    },
  },
  CLICK_PROBATE_PETITION: {
    match: url => url.includes('/File/FileHistory'),
    handler: async () => {
      // Navigate if needed
      if (!window.location.href.includes('/File/FileHistory')) {
        const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/File/FileHistory"]');
        if (!links.length) throw new Error('No FileHistory links found');
        links[0].click();
        await waitForPageLoad();
      }
      // Click the probate button
      await waitForPageLoad();
      const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(btn =>
        btn.textContent?.includes('PROBATE PETITION') ||
        btn.id?.toLowerCase().includes('probate') ||
        btn.className.toLowerCase().includes('probate'),
      );
      if (!button) throw new Error('Probate petition button not found');
      button.click();
      await waitForPageLoad();
    },
  },
  CLOSE_FILE: {
    match: url => url.includes('/File/FileHistory'),
    handler: async () => {
      const closeButton = document.querySelector<HTMLButtonElement>('#FileHistoryClose');
      if (!closeButton) throw new Error('Close button not found');
      closeButton.click();
      await waitForPageLoad();
    },
  },
};

let isExecuting = false;
let interval = INITIAL_INTERVAL;

function log(...args: unknown[]) {
  console.debug('[WorkflowExecutor]', ...args);
}

// Fetch current workflow status from background script
async function getStatus() {
  return browser.runtime.sendMessage({
    type: 'CONTENT_TO_BACKGROUND',
    action: 'GET_STATUS',
  });
}

// Execute the handler for a given step with timeout
async function runStep(step: WorkflowStep): Promise<unknown> {
  const pageHandler = PAGE_HANDLERS[step];
  if (!pageHandler) {
    throw new Error(`No handler defined for step: ${step}`);
  }

  return Promise.race([
    pageHandler.handler(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Step timeout')), TIMEOUT_MS)),
  ]);
}

// Main loop: check status and execute step
async function checkAndExecuteStep(): Promise<void> {
  if (isExecuting) return;
  isExecuting = true;

  try {
    const status = await getStatus();
    log('Workflow status:', status);
    if (!status.isActive || !status.currentStep) {
      return;
    }

    const step: WorkflowStep = status.currentStep;
    const result = await runStep(step);

    await browser.runtime.sendMessage({
      type: 'CONTENT_TO_BACKGROUND',
      action: 'STEP_COMPLETE',
      result,
    });
    log(`Step ${step} completed`);
  } catch (error: any) {
    log('Error during execution:', error);
    await browser.runtime.sendMessage({
      type: 'CONTENT_TO_BACKGROUND',
      action: 'STEP_FAILED',
      error: error.message ?? 'Unknown error',
    });
  } finally {
    isExecuting = false;
  }
}

// Exponential backoff scheduler
function scheduleNext(): void {
  setTimeout(async () => {
    await checkAndExecuteStep();
    interval = isExecuting
      ? Math.max(MIN_INTERVAL, interval / 2)
      : Math.min(MAX_INTERVAL, interval * 1.5);
    scheduleNext();
  }, interval);
}

// Kick off the loop
scheduleNext();

// Export for manual triggers or tests
export { checkAndExecuteStep };