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
  metadata: {
    step: 'START_SCRAPE',
    currentIndex: 0,
  },
  retryCount: 0,
  stalledCount: 0,
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
  workflowState.metadata = { step: workflowState.currentStep, currentIndex: 5 };
  workflowState.retryCount = 0;
  workflowState.stalledCount = 0;
  crawledFileIds.clear();

  log('Workflow started:', workflowState.currentStep);
  await notifyPopup({ isActive: true });
  await notifyContent('CHECK_STATUS');
}

async function completeStep(): Promise<void> {
  workflowState.retryCount = 0;
  const currentStep = workflowState.currentStep!;
  const {metadata} = workflowState;

  const LOOP_STEPS: Partial<Record<WorkflowStep, WorkflowStep>> = {
    OPEN_FILE_LINKS: 'CLICK_PROBATE_PETITION',
    CLICK_PROBATE_PETITION: 'CLOSE_FILE',
    CLOSE_FILE: 'OPEN_FILE_LINKS',
  };

  const isLoopingStep = Object.hasOwn(LOOP_STEPS, currentStep);

  if (isLoopingStep) {
    if (currentStep === 'CLOSE_FILE') {
      // Add a delay after CLOSE_FILE to allow page transition
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Increment index after completing a full loop
      const currentIndex = metadata.currentIndex || 0;
      metadata.currentIndex = currentIndex + 1;
      log(`Completed loop ${currentIndex + 1}`);

      // If we looped and made no progress multiple times, end it
      if (metadata.lastSuccessfulIndex === currentIndex) {
        workflowState.stalledCount = (workflowState.stalledCount || 0) + 1;
        log(`Stalled at index ${currentIndex} (count: ${workflowState.stalledCount})`);
      } else {
        workflowState.stalledCount = 0;
        metadata.lastSuccessfulIndex = currentIndex;
        log(`Progress made at index ${currentIndex}`);
      }

      if (
        metadata.currentIndex >= CONFIG.MAX_INDEX ||
        workflowState.stalledCount >= 3
      ) {
        log('Likely reached end of file list, ending workflow');
        workflowState.isActive = false;
        workflowState.currentStep = null;
        workflowState.metadata = {
          step: 'START_SCRAPE',
          currentIndex: 0,
        };
        workflowState.stalledCount = 0;
        await notifyPopup({ isActive: false });
        return;
      }

      // Add another delay before moving to next step
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const nextStep = LOOP_STEPS[currentStep];
    workflowState.currentStep = nextStep;
    log(`Looping to step: ${nextStep} (Index: ${metadata.currentIndex})`);
    
    // Add retry mechanism for sending message
    let retries = 3;
    while (retries > 0) {
      try {
        await notifyContent('CHECK_STATUS');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          log('Failed to notify content script after retries');
          await failStep('Failed to communicate with page after navigation');
          return;
        }
        log(`Retrying content notification (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return;
  }

  const index = CONFIG.STEP_ORDER.indexOf(currentStep);
  if (index < CONFIG.STEP_ORDER.length - 1) {
    workflowState.currentStep = CONFIG.STEP_ORDER[index + 1];
    log('Advancing to step:', workflowState.currentStep);
    await notifyContent('CHECK_STATUS');
  } else {
    await notifyPopup({ isActive: false });
    log('Workflow complete');
    workflowState.isActive = false;
    workflowState.currentStep = null;
    workflowState.metadata = {
      step: 'START_SCRAPE',
      currentIndex: 0,
    };
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
    workflowState.metadata = {
      step: 'START_SCRAPE',
      currentIndex: 0,
    };
    await notifyPopup({ isActive: false, error: errorMsg });
  }
}

async function stopWorkflow(): Promise<void> {
  log('Stopping workflow');
  workflowState.isActive = false;
  workflowState.currentStep = null;
  workflowState.metadata = {
    step: 'START_SCRAPE',
    currentIndex: 0,
  };
  workflowState.stalledCount = 0;
  await notifyPopup({ isActive: false });
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
      if (pm.action === 'STOP_WORKFLOW') {
        await stopWorkflow();
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
