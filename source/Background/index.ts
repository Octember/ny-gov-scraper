import { browser, Runtime } from 'webextension-polyfill-ts';
import { WorkflowStep, WorkflowStatus } from '../types';

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

const STEP_ORDER: WorkflowStep[] = [
  'START_SCRAPE',
  'FILE_SEARCH_HOME',
  'FILE_SEARCH_RESULTS',
  'OPEN_FILE_LINKS',
  'CLICK_PROBATE_PETITION',
];

// Initialize workflow state
const workflowState: WorkflowStatus = {
  isActive: false,
  currentStep: null,
  metadata: {},
};

browser.runtime.onMessage.addListener(
  async (
    message: { type: string; action: string; result?: unknown },
    sender: Runtime.MessageSender
  ) => {
    if (message.type === 'POPUP_TO_BACKGROUND') {
      // Start the workflow
      workflowState.isActive = true;
      workflowState.currentStep = STEP_ORDER[0];
      
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
      switch (message.action) {
        case 'GET_STATUS':
          return workflowState;
        case 'STEP_COMPLETE':
          if (workflowState.currentStep) {
            const currentIndex = STEP_ORDER.indexOf(workflowState.currentStep);
            if (currentIndex < STEP_ORDER.length - 1) {
              workflowState.currentStep = STEP_ORDER[currentIndex + 1];
            } else {
              workflowState.isActive = false;
              workflowState.currentStep = null;
            }
          }
          return true;
        default:
          return false;
      }
    }

    return false;
  }
);
