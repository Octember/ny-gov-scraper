import { browser } from 'webextension-polyfill-ts';
import {
  WorkflowStep,
  WorkflowStatus,
  ExtensionMessage,
  PopupToBackgroundMessage,
  ContentToBackgroundMessage,
} from '../types';

const CONFIG = {
  STEP_ORDER: [
    'START_SCRAPE',
    'FILE_SEARCH_HOME',
    'FILE_SEARCH_RESULTS',
    'OPEN_FILE_LINKS',
    'CLICK_PROBATE_PETITION',
    'CLOSE_FILE',
  ] as WorkflowStep[],
  MAX_RETRIES: 3,
  MAX_INDEX: 100,
};

// Workflow state singleton
const workflowState: WorkflowStatus = {
  isActive: false,
  currentStep: null,
  metadata: {},
  retryCount: 0,
};

const crawledFileIds = new Set<string>();

function log(...args: unknown[]) {
  console.log('[Background]', ...args);
}

async function notifyPopup(payload: Partial<PopupToBackgroundMessage>) {
  await browser.runtime.sendMessage({ type: 'BACKGROUND_TO_POPUP', ...payload });
}

async function notifyContent(step: 'CHECK_STATUS') {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await browser.tabs.sendMessage(tab.id, { type: 'BACKGROUND_TO_CONTENT', step });
  }
}

async function startWorkflow() {
  workflowState.isActive = true;
  workflowState.currentStep = CONFIG.STEP_ORDER[0];
  workflowState.metadata = { step: workflowState.currentStep, currentIndex: 0 };
  workflowState.retryCount = 0;
  crawledFileIds.clear();

  log('Workflow started:', workflowState.currentStep);
  await notifyPopup({ isActive: true });
  await notifyContent('CHECK_STATUS');
}

async function completeStep(): Promise<void> {
  workflowState.retryCount = 0;
  const currentIndex = CONFIG.STEP_ORDER.indexOf(workflowState.currentStep!);

  if (workflowState.metadata.currentIndex !== undefined) {
    workflowState.metadata.currentIndex += 1;
  }

  if (currentIndex < CONFIG.STEP_ORDER.length - 1) {
    const nextStep = CONFIG.STEP_ORDER[currentIndex + 1];
    workflowState.currentStep = nextStep;
    log('Advancing to step:', nextStep);
    
    // For CLOSE_FILE, notify popup first and wait before notifying content
    if (nextStep === 'CLOSE_FILE') {
      await notifyPopup({ isActive: true });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    await notifyContent('CHECK_STATUS');
  } else {
    // For workflow completion, notify popup first
    await notifyPopup({ isActive: false });
    log('Workflow complete');
    workflowState.isActive = false;
    workflowState.currentStep = null;
    workflowState.metadata = {};
  }
}

async function failStep(errorMsg: string) {
  log('Step failed:', errorMsg);

  if (workflowState.retryCount < CONFIG.MAX_RETRIES) {
    workflowState.retryCount += 1;
    log(`Retrying (${workflowState.retryCount}/${CONFIG.MAX_RETRIES})`);
    await notifyContent('CHECK_STATUS');
  } else {
    log('Max retries reached, aborting workflow');
    workflowState.isActive = false;
    workflowState.currentStep = null;
    workflowState.metadata = {};
    await notifyPopup({ isActive: false, error: errorMsg });
  }
}

browser.runtime.onInstalled.addListener(() => {
  log('Extension installed');
});


browser.runtime.onMessage.addListener(
  async (message: ExtensionMessage, sender): Promise<unknown> => {
    log('Message received:', message);

    if (message.type === 'POPUP_TO_BACKGROUND') {
      const pm = message as PopupToBackgroundMessage;
      if (pm.action === 'GET_STATUS') {
        log('Popup requested status');
        return workflowState;
      }
      if (pm.action === 'START_WORKFLOW') {
        await startWorkflow();
        return true;
      }
    }

    if (message.type === 'CONTENT_TO_BACKGROUND') {
      const cm = message as ContentToBackgroundMessage;
      if (cm.action === 'GET_STATUS') {
        log('Content requested status');
        return workflowState;
      }
      if (cm.action === 'STEP_COMPLETE') {
        await completeStep();
        return true;
      }
      if (cm.action === 'STEP_FAILED') {
        await failStep(cm.error || 'Unknown error');
        return true;
      }
    }

    return false;
  }
);

export { crawledFileIds };
