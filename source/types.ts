export type WorkflowStep = 
  | 'START_SCRAPE'
  | 'FILE_SEARCH_HOME'
  | 'FILE_SEARCH_RESULTS'
  | 'OPEN_FILE_LINKS'
  | 'CLICK_PROBATE_PETITION';

export interface WorkflowStatus {
  isActive: boolean;
  currentStep: WorkflowStep | null;
  metadata: Record<string, unknown>;
}

// Message types for communication between components
export interface PopupToBackgroundMessage {
  type: 'POPUP_TO_BACKGROUND';
  action?: 'GET_STATUS';
  metadata?: Record<string, unknown>;
}

export interface ContentToBackgroundMessage {
  type: 'CONTENT_TO_BACKGROUND';
  action: 'GET_STATUS' | 'STEP_COMPLETE';
  result?: unknown;
}

export interface BackgroundToContentMessage {
  type: 'BACKGROUND_TO_CONTENT';
  step: WorkflowStep | 'CHECK_STATUS';
}

export interface BackgroundToPopupMessage {
  type: 'BACKGROUND_TO_POPUP';
  isActive: boolean;
}

// Union type for all possible messages
export type ExtensionMessage =
  | PopupToBackgroundMessage 
  | ContentToBackgroundMessage 
  | BackgroundToContentMessage 
  | BackgroundToPopupMessage; 