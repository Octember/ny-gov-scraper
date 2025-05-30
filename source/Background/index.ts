import { browser, Runtime } from 'webextension-polyfill-ts';
import { WorkflowStep, WorkflowStatus, ExtensionMessage, PopupToBackgroundMessage, ContentToBackgroundMessage } from '../types';

browser.runtime.onInstalled.addListener((): void => {
  console.log('🦄', 'extension installed');
});

// Step order for the workflow
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
    message: ExtensionMessage,
    sender: Runtime.MessageSender
  ): Promise<unknown> => {
    console.log('Background received message:', message);

    if (message.type === 'POPUP_TO_BACKGROUND') {
      if (message.action === 'GET_STATUS') {
        console.log('Returning workflow state:', workflowState);
        return workflowState;
      }

      console.log('Starting workflow');
      // Start the workflow
      workflowState.isActive = true;
      const step = STEP_ORDER[0];
      workflowState.currentStep = step;
      workflowState.metadata = {
        step,
      };
      
      // Notify popup of state change
      if (sender.tab?.id) {
        await browser.runtime.sendMessage({
          type: 'BACKGROUND_TO_POPUP',
          isActive: true,
        });
      }

      // Notify content script to start processing
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        console.log('Notifying content script to start workflow');
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
          console.log('Content script requesting status:', workflowState);
          return workflowState;
        case 'STEP_COMPLETE':
          console.log('Step complete:', workflowState.currentStep);
          if (workflowState.currentStep) {
            const currentIndex = STEP_ORDER.indexOf(workflowState.currentStep);
            if (currentIndex < STEP_ORDER.length - 1) {
              workflowState.currentStep = STEP_ORDER[currentIndex + 1];
              console.log('Moving to next step:', workflowState.currentStep);

              // Notify content script of new step
              const tabs = await browser.tabs.query({ active: true, currentWindow: true });
              if (tabs[0]?.id) {
                await browser.tabs.sendMessage(tabs[0].id, {
                  type: 'BACKGROUND_TO_CONTENT',
                  step: 'CHECK_STATUS',
                });
              }
            } else {
              console.log('Workflow complete');
              workflowState.isActive = false;
              workflowState.currentStep = null;
              workflowState.metadata = {};
              
              // Notify popup of completion
              if (sender.tab?.id) {
                await browser.runtime.sendMessage({
                  type: 'BACKGROUND_TO_POPUP',
                  isActive: false,
                });
              }
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
