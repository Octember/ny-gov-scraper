import { browser } from 'webextension-polyfill-ts';
import { injectPopup } from './page-popup';
import { ExtensionMessage } from '../types';
import { checkAndExecuteStep } from './workflow-executor';

console.log('helloworld from content script');

// Inject the popup when the page loads
injectPopup();

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
  console.log('[Content] Message received:', message);
  // Handle messages here
});

// Listen for messages from the background script
browser.runtime.onMessage.addListener(
  async (
    message: ExtensionMessage,
    _sender: Runtime.MessageSender
  ): Promise<unknown> => {
    console.log('Content script received message:', message);

    if (message.type === 'BACKGROUND_TO_CONTENT') {
      if (message.step === 'CHECK_STATUS') {
        await checkAndExecuteStep();
      }
      return true;
    }

    return false;
  }
);

export { };
