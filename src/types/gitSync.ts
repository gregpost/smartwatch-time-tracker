export type PushStatus = 'success' | 'conflict' | 'auth_required' | 'error' | 'pending' | 'idle';

export interface SuggestedAction {
  id: string;
  label: string;
  description: string;
}

export interface GitSyncHistoryItem {
  version: string;
  timestamp: string;
  message: string;
  hash: string;
  status: PushStatus;
}

export interface GitSyncState {
  repoUrl: string;
  branch: string;
  version: string;
  baseVersion: string;
  versionPostfix: string;
  lastCommitMessage: string;
  lastPushTime: string;
  lastPushStatus: PushStatus;
  lastCommitHash: string;
  conflictDetails: string | null;
  suggestedActions: SuggestedAction[];
  history: GitSyncHistoryItem[];
  hasTokenConfigured?: boolean;
  uncommittedCount?: number;
}
