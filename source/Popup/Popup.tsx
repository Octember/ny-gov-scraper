import * as React from 'react';
import { browser, Tabs } from 'webextension-polyfill-ts';

import './styles.scss';

function openWebPage(url: string): Promise<Tabs.Tab> {
  return browser.tabs.create({ url });
}

const sendStepToBackground = async (metadata: Record<string, unknown> = {}): Promise<void> => {
  await browser.runtime.sendMessage({
    type: 'POPUP_TO_BACKGROUND',
    metadata,
  });
};

const Popup: React.FC = () => {
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    // Check initial status
    browser.runtime.sendMessage({
      type: 'CONTENT_TO_BACKGROUND',
      action: 'GET_STATUS',
    }).then((status) => {
      setIsActive(status.isActive);
    });

    // Listen for status changes
    const listener = (message: { type: string; isActive?: boolean }) => {
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
      <button
        id="options__button"
        type="button"
        onClick={(): Promise<Tabs.Tab> => {
          return openWebPage('options.html');
        }}
      >
        Options Page
      </button>
      <button
        id="alert__button"
        type="button"
        style={{
          width: '50%',
          background: isActive ? 'red' : 'orange',
          color: 'white',
          fontWeight: 500,
          borderRadius: 15,
          padding: '5px 10px',
          justifyContent: 'center',
          margin: '20px auto',
          cursor: 'pointer',
          opacity: 0.8,
          display: 'flex',
        }}
        onClick={() => sendStepToBackground()}
      >
        {isActive ? 'Stop Scraping' : 'Start Scraping'}
      </button>
      <div className="links__holder">
        <ul>
          <li>
            <button
              type="button"
              onClick={(): Promise<Tabs.Tab> => {
                return openWebPage(
                  'https://github.com/abhijithvijayan/web-extension-starter'
                );
              }}
            >
              GitHub
            </button>
          </li>
          <li>
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
          </li>
        </ul>
      </div>
    </section>
  );
};

export default Popup;
