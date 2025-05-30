import { browser, Runtime } from 'webextension-polyfill-ts';
import { ExtensionMessage,  } from '../types';
import { checkAndExecuteStep } from './workflow-executor';

console.log('helloworld from content script');

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
