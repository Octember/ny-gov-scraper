import * as React from 'react';
import { browser, Tabs } from 'webextension-polyfill-ts';

import './styles.scss';

function openWebPage(url: string): Promise<Tabs.Tab> {
  return browser.tabs.create({ url });
}

const sendAlertToContentScript = async (): Promise<void> => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) {
    await browser.tabs.sendMessage(tabs[0].id, {
      type: 'START_SCRAPE',
    });
  }
};

const Popup: React.FC = () => {
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
          background: 'orange',
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
        onClick={sendAlertToContentScript}
      >
        Start Scrape in Content Script
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
