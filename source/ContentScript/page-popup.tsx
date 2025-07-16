import * as React from 'react';
import { render } from 'react-dom';
import { browser } from 'webextension-polyfill-ts';
import { useState, useEffect } from 'react';
import { COURT_SELECT_MAP } from './fileSearchHome';

const sendStepToBackground = async (metadata: Record<string, unknown> = {}): Promise<void> => {
  // Send message to background script to start workflow
  await browser.runtime.sendMessage({
    type: 'POPUP_TO_BACKGROUND',
    action: 'START_WORKFLOW',
    metadata,
  });

  // Notify content script to check status
  await browser.runtime.sendMessage({
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

const PagePopup: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [crawledCount, setCrawledCount] = useState(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>('24'); // Default to Kings County

  useEffect(() => {
    const checkStatus = async () => {
      const response = await browser.runtime.sendMessage({
        type: 'POPUP_TO_BACKGROUND',
        action: 'GET_STATUS',
      });
      setIsActive(response.isActive);
      setError(response.error || null);
      setCurrentIndex(response.metadata?.currentIndex || 0);
      setCrawledCount(response.crawledFileIds?.size || 0);
      setCurrentStep(response.currentStep);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    sendStepToBackground({ countyId: selectedCounty });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '300px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        padding: '16px',
        zIndex: 9999,
        border: '1px solid #e5e7eb',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 500 }}>
        WS Scraper
      </h3>

      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            width: '100%',
            background: isActive ? '#ff6b6b' : 'green',
            color: 'white',
            fontWeight: 500,
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        >
          {isActive ? 'Status: Scraping' : 'Status: Idle'}
        </div>

        <div style={{ fontSize: '14px', color: '#666' }}>
          <div>Current Step: {currentStep}</div>
          <div>Current Index: {currentIndex}</div>
          <div>Documents Crawled: {crawledCount}</div>
          <div>Remaining: ?</div>
        </div>
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

      <div style={{ marginBottom: '16px' }}>
        <select
          value={selectedCounty}
          onChange={(e) => setSelectedCounty(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            marginBottom: '8px'
          }}
        >
          {Object.entries(COURT_SELECT_MAP).map(([name, id]) => (
            <option key={id} value={id}>
              {name.replace("'s Court", '')}
            </option>
          ))}
        </select>
      </div>

      <div>
        {!isActive ? (
          <button
            type="button"
            onClick={handleStart}
            style={{
              background: '#22c55e',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%'
            }}
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
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%'
            }}
            onClick={stopWorkflow}
          >
            Stop Scraping
          </button>
        )}
      </div>
    </div>
  );
};

// Function to inject the popup into the page
export function injectPopup(): void {
  // Create container for the popup
  const container = document.createElement('div');
  container.id = 'ws-scraper-popup';
  document.body.appendChild(container);

  // Render the popup using React 17's render method
  render(<PagePopup />, container);
}

export default PagePopup; 