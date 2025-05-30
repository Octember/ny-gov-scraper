import { browser, Runtime } from 'webextension-polyfill-ts';
import { WorkflowStep } from '../types';
import { checkAndExecuteStep } from './workflow-executor';

console.log('helloworld from content script');

// Handle messages from background script
browser.runtime.onMessage.addListener(
  async (
    message: { type: string; step?: WorkflowStep; metadata?: Record<string, unknown> },
    _sender: Runtime.MessageSender
  ) => {
    if (message.type === 'BACKGROUND_TO_CONTENT') {
      console.log('BACKGROUND_TO_CONTENT', message.step);
      if (message.step === 'CHECK_STATUS') {
        await checkAndExecuteStep();
      }
      return true;
    }
    return true;
  }
);

export { };
