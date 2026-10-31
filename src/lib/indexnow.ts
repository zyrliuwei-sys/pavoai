export const INDEXNOW_KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;
export const MAX_INDEXNOW_URLS = 10_000;

export interface IndexNowStatus {
  key: string | null;
  keyFileUrl: string | null;
  origin: string;
  publicSite: boolean;
}

export interface IndexNowSubmitResult {
  submitted: number;
  results: {
    ok: boolean;
    count: number;
    attempts: { endpoint: string; status: number; meaning: string }[];
  }[];
}
