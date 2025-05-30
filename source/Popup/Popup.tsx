import React, { useEffect, useState } from 'react';
import { browser } from 'webextension-polyfill-ts';
import { WorkflowStatus } from '../types';

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

export function Popup() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await browser.runtime.sendMessage({
          type: 'POPUP_TO_BACKGROUND',
          action: 'GET_STATUS',
        });
        setStatus(response);
        setError(null);
      } catch (err) {
        setError('Failed to get status');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    try {
      await browser.runtime.sendMessage({
        type: 'POPUP_TO_BACKGROUND',
        action: 'START_WORKFLOW',
      });
    } catch (err) {
      setError('Failed to start workflow');
    }
  };

  const handleStop = async () => {
    try {
      await browser.runtime.sendMessage({
        type: 'POPUP_TO_BACKGROUND',
        action: 'STOP_WORKFLOW',
      });
    } catch (err) {
      setError('Failed to stop workflow');
    }
  };

  const handleClose = () => {
    window.close();
  };

  return (
    <div className="popup">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Noah's scraper</h2>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            padding: '4px 8px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        Status:{' '}
        <span
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: status?.isActive ? '#ff6b6b' : '#22c55e',
            marginRight: '8px',
          }}
        />
        {status?.isActive ? 'Running' : 'Idle'}
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>
      )}

      {status?.isActive ? (
        <button
          onClick={handleStop}
          style={{
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Stop Scraping
        </button>
      ) : (
        <button
          onClick={handleStart}
          style={{
            backgroundColor: '#22c55e',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Start Scraping
        </button>
      )}
    </div>
  );
}

export default Popup;
