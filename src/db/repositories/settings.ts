import { query, queryOne } from '../index';

export const DEFAULT_PR_REVIEW_ALERT_HOURS_KEY = 'pr_review_alert_hours';

export interface Setting {
  key: string;
  value: unknown;
  updated_at: Date;
}

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const result = await queryOne<Setting>('SELECT * FROM settings WHERE key = $1', [key]);
  return result ? (result.value as T) : null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await query(
    `INSERT INTO settings (key, value) 
     VALUES ($1, $2)
     ON CONFLICT (key) 
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

export async function getPRReviewAlertHours(): Promise<number> {
  const hours = await getSetting<number>('pr_review_alert_hours');
  return hours ?? 24; // Default to 24 hours
}

export async function setPRReviewAlertHours(hours: number): Promise<void> {
  await setSetting('pr_review_alert_hours', hours);
}
