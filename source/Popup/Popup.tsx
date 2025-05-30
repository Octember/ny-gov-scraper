import * as React from 'react';
import { browser, Tabs } from 'webextension-polyfill-ts';

import './styles.scss';

function openWebPage(url: string): Promise<Tabs.Tab> {
  return browser.tabs.create({ url });
}

const sendStepToBackground = async (metadata: Record<string, unknown> = {}): Promise<void> => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]?.id) {
    console.error('No active tab found');
    return;
  }

  // Send message to background script to start workflow
  await browser.runtime.sendMessage({
    type: 'POPUP_TO_BACKGROUND',
    action: 'START_WORKFLOW',
    metadata,
  });

  // Notify content script to check status
  await browser.tabs.sendMessage(tabs[0].id, {
    type: 'BACKGROUND_TO_CONTENT',
    step: 'CHECK_STATUS',
  });
};

const Popup: React.FC = () => {
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    // Check initial status
    browser.runtime.sendMessage({
      type: 'POPUP_TO_BACKGROUND',
      action: 'GET_STATUS',
    }).then((status) => {
      console.log('Initial status:', status);
      setIsActive(status.isActive);
    });

    // Listen for status changes
    const listener = (message: { type: string; isActive?: boolean }) => {
      console.log('Received message:', message);
      if (message.type === 'BACKGROUND_TO_POPUP' && typeof message.isActive === 'boolean') {
        setIsActive(message.isActive);
      }
    };

    browser.runtime.onMessage.addListener(listener);
    return () => {
      browser.runtime.onMessage.removeListener(listener);
    };
  }, []);

  return (
    <section id="popup">
      <h2>Noah&apos;s scraper</h2>
      <div
        id="alert__button"
        style={{
          width: '50%',
          background: isActive ? 'yellow' : 'green',
          color: 'white',
          fontWeight: 500,
          padding: '5px 10px',
          justifyContent: 'center',
          margin: '20px auto',
          display: 'flex',
        }}
      >
        {isActive ? 'Status: Scraping' : 'Status: Idle'}
      </div>
      <div className="links__holder">
        <ul>
          <li>
            <button
              type="button"
              onClick={() => sendStepToBackground()}
            >
              Start Scraping
            </button>
          </li>
          {/* <li>
            <button
              type="button"
              onClick={(): Promise<Tabs.Tab> => {
                return openWebPage(
                  'https://www.buymeacoffee.com/abhijithvijayan'
                );
              }}
            >
              Buy Me A Coffee
            </button>
          </li> */}
        </ul>
      </div>
    </section>
  );
};

export default Popup;
