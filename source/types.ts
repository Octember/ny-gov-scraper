export type WorkflowStep = 
  | 'START_SCRAPE'
  | 'FILE_SEARCH_HOME'
  | 'FILE_SEARCH_RESULTS'
  | 'OPEN_FILE_LINKS'
  | 'CLICK_PROBATE_PETITION'
  | 'CLOSE_FILE';

export interface WorkflowStatus {
  isActive: boolean;
  currentStep: WorkflowStep | null;
  retryCount: number;
  metadata: {
    step: WorkflowStep;
    currentIndex: number;
    lastSuccessfulIndex?: number;
    countyId?: string;
  };
  stalledCount: number;
}

// Message types for communication between components
export interface PopupToBackgroundMessage {
  type: 'POPUP_TO_BACKGROUND';
  action?: 'GET_STATUS' | 'START_WORKFLOW' | 'STOP_WORKFLOW';
  metadata?: Record<string, unknown>;
  error?: string;
  isActive?: boolean;
}

export interface ContentToBackgroundMessage {
  type: 'CONTENT_TO_BACKGROUND';
  action: 'GET_STATUS' | 'STEP_COMPLETE' | 'STEP_FAILED';
  result?: unknown;
  error?: string;
}

export interface BackgroundToContentMessage {
  type: 'BACKGROUND_TO_CONTENT';
  step: WorkflowStep | 'CHECK_STATUS';
}

export interface BackgroundToPopupMessage {
  type: 'BACKGROUND_TO_POPUP';
  isActive: boolean;
  error?: string;
}

// Union type for all possible messages
export type ExtensionMessage =
  | PopupToBackgroundMessage 
  | ContentToBackgroundMessage 
  | BackgroundToContentMessage 
  | BackgroundToPopupMessage; 