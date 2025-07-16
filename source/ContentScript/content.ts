import { browser } from 'webextension-polyfill-ts';
import { injectPopup } from './page-popup';
import { ExtensionMessage } from '../types';

// Inject the popup when the page loads
injectPopup();

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message: ExtensionMessage) => {
  console.log('[Content] Message received:', message);
  // Handle messages here
}); 