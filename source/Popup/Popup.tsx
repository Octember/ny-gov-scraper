import * as React from 'react';
import { browser, Tabs } from 'webextension-polyfill-ts';
import { useState, useEffect } from 'react';

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

const stopWorkflow = async (): Promise<void> => {
  await browser.runtime.sendMessage({
    type: 'POPUP_TO_BACKGROUND',
    action: 'STOP_WORKFLOW',
  });
};

const Popup: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const response = await browser.runtime.sendMessage({
        type: 'POPUP_TO_BACKGROUND',
        action: 'GET_STATUS',
      });
      setIsActive(response.isActive);
      setError(response.error || null);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="popup">
      <h2>Noah&apos;s scraper</h2>
      <div
        id="alert__button"
        style={{
          width: '50%',
          background: isActive ? '#ff6b6b' : 'green',
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
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #ef4444',
          color: '#b91c1c',
          padding: '12px',
          margin: '10px 0',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      <div className="links__holder">
        <ul>
          <li>
            {!isActive ? (
              <button
                type="button"
                onClick={() => sendStepToBackground()}
              >
                Start Scraping
              </button>
            ) : (
              <button
                type="button"
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  cursor: 'pointer'
                }}
                onClick={stopWorkflow}
              >
                Stop Scraping
              </button>
            )}
          </li>
        </ul>
      </div>
    </section>
  );
};

export default Popup;
