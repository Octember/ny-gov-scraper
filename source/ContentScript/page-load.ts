export async function waitForPageLoad(): Promise<void> {
  console.log('Waiting for navigation to complete...');
  
  // If we're already on a stable page, return immediately
  if (document.readyState === 'complete') {
    console.log('Page already loaded');
    return;
  }

  // Wait for the page to be fully loaded
  await new Promise<void>((resolve) => {
    const checkReadyState = () => {
      if (document.readyState === 'complete') {
        console.log('Navigation complete');
        resolve();
      } else {
        setTimeout(checkReadyState, 100);
      }
    };
    checkReadyState();
  });

  // Additional wait for dynamic content
  await new Promise((resolve) => setTimeout(resolve, 1000));
} 