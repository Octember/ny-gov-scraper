import { browser } from 'webextension-polyfill-ts';

browser.runtime.onInstalled.addListener((): void => {
  console.log('🦄', 'extension installed');
});

// Step order for the workflow
type STEP = 'START_SCRAPE' | 'FILE_SEARCH_HOME' | 'FILE_SEARCH_RESULTS' | 'OPEN_FILE_LINKS';
const STEP_ORDER: STEP[] = ['START_SCRAPE', 'FILE_SEARCH_HOME', 'FILE_SEARCH_RESULTS', 'OPEN_FILE_LINKS'];
let currentStepIndex = 0;
let currentMetadata: Record<string, unknown> = {};

const AllResults = [];

async function sendStepToContent(step: STEP, metadata: Record<string, unknown>): Promise<any> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) {
    const result = await browser.tabs.sendMessage(tabs[0].id, {
      type: 'BACKGROUND_TO_CONTENT',
      step,
      metadata,
    });
    return result;
  }
  return null;
}


// Coordination layer: listen for step messages from popup and forward to content script
browser.runtime.onMessage.addListener(async (message, _sender) => {
  if (message && message.type === 'POPUP_TO_BACKGROUND') {
    // Start the workflow from the first step
    currentStepIndex = 0;
    currentMetadata = message.metadata || {};

    while (currentStepIndex < STEP_ORDER.length) {
      const step = STEP_ORDER[currentStepIndex];

      const result = await sendStepToContent(step, currentMetadata);

      if (step === 'FILE_SEARCH_RESULTS') {
        console.log('Table scraped:', result);
        AllResults.push(result);
      }

      currentStepIndex += 1;
    }

    console.log('All steps complete');
    return true;
  }

  return true;
});
