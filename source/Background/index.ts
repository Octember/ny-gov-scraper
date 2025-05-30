import { browser } from 'webextension-polyfill-ts';
import {
  WorkflowStep,
  WorkflowStatus,
  ExtensionMessage,
  PopupToBackgroundMessage,
  ContentToBackgroundMessage,
} from '../types';

const STEP_ORDER: WorkflowStep[] = [
  'START_SCRAPE',
  'FILE_SEARCH_HOME',
  'FILE_SEARCH_RESULTS',
  'OPEN_FILE_LINKS',
  'CLICK_PROBATE_PETITION',
];

const MAX_RETRIES = 3;

// Workflow state singleton
const workflowState: WorkflowStatus = {
  isActive: false,
  currentStep: null,
  metadata: {},
  retryCount: 0,
};

function log(...args: unknown[]) {
  console.debug('[Background]', ...args);
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
  workflowState.currentStep = STEP_ORDER[0];
  workflowState.metadata = { step: workflowState.currentStep };
  workflowState.retryCount = 0;

  log('Workflow started:', workflowState.currentStep);
  await notifyPopup({ isActive: true });
  await notifyContent('CHECK_STATUS');
}

async function completeStep() {
  workflowState.retryCount = 0;
  const currentIndex = STEP_ORDER.indexOf(workflowState.currentStep!);

  if (currentIndex < STEP_ORDER.length - 1) {
    workflowState.currentStep = STEP_ORDER[currentIndex + 1];
    log('Advancing to step:', workflowState.currentStep);
    await notifyContent('CHECK_STATUS');
  } else {
    log('Workflow complete');
    workflowState.isActive = false;
    workflowState.currentStep = null;
    workflowState.metadata = {};
    await notifyPopup({ isActive: false });
  }
}

async function failStep(errorMsg: string) {
  log('Step failed:', errorMsg);

  if (workflowState.retryCount < MAX_RETRIES) {
    workflowState.retryCount += 1;
    log(`Retrying (${workflowState.retryCount}/${MAX_RETRIES})`);
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
