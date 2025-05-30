import { browser } from 'webextension-polyfill-ts';

browser.runtime.onInstalled.addListener((): void => {
  console.log('🦄', 'extension installed');
});

// Step order for the workflow
type STEP = 
  | 'START_SCRAPE'
  | 'FILE_SEARCH_HOME'
  | 'FILE_SEARCH_RESULTS'
  | 'OPEN_FILE_LINKS'
  | 'CLICK_PROBATE_PETITION';

const STEP_ORDER: STEP[] = [
  'START_SCRAPE',
  'FILE_SEARCH_HOME',
  'FILE_SEARCH_RESULTS',
  'OPEN_FILE_LINKS',
  'CLICK_PROBATE_PETITION',
];

interface WorkflowState {
  isActive: boolean;
  currentStepIndex: number;
  metadata: Record<string, unknown>;
  results: unknown[];
  isWaiting: boolean;
}

let workflowState: WorkflowState = {
  isActive: false,
  currentStepIndex: 0,
  metadata: {},
  results: [],
  isWaiting: false,
};

async function sendStepToContent(
  step: STEP,
  metadata: Record<string, unknown>
): Promise<unknown> {
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

// Handle messages from popup and content script
browser.runtime.onMessage.addListener(async (message, _sender) => {
  if (message.type === 'POPUP_TO_BACKGROUND') {
    // Start the workflow
    workflowState = {
      isActive: true,
      currentStepIndex: 0,
      metadata: message.metadata || {},
      results: [],
      isWaiting: false,
    };
    
    // Notify content script to start processing
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      await browser.tabs.sendMessage(tabs[0].id, {
        type: 'BACKGROUND_TO_CONTENT',
        step: 'CHECK_STATUS',
      });
    }
    return true;
  }

  if (message.type === 'CONTENT_TO_BACKGROUND') {
    if (message.action === 'STEP_COMPLETE') {
      const { result } = message;
      if (result) {
        workflowState.results.push(result);
      }
      
      workflowState.currentStepIndex += 1;
      
      if (workflowState.currentStepIndex >= STEP_ORDER.length) {
        // Workflow complete
        workflowState.isActive = false;
        workflowState.isWaiting = false;
        console.log('All steps complete', workflowState.results);
        return true;
      }
      
      // Send next step to content script
      const nextStep = STEP_ORDER[workflowState.currentStepIndex];
      workflowState.isWaiting = true;
      await sendStepToContent(nextStep, workflowState.metadata);
    }
    
    if (message.action === 'GET_STATUS') {
      return {
        isActive: workflowState.isActive,
        currentStep: workflowState.isActive 
          ? STEP_ORDER[workflowState.currentStepIndex] 
          : null,
        metadata: workflowState.metadata,
        isWaiting: workflowState.isWaiting,
      };
    }
  }

  return true;
});
