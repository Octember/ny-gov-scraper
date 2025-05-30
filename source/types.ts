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