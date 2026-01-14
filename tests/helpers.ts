import { createHmac } from 'crypto';

export function generateWebhookSignature(
  payload: string | object,
  secret: string
): string {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = createHmac('sha256', secret);
  const digest = hmac.update(payloadString).digest('hex');
  return `sha256=${digest}`;
}

export function createWebhookHeaders(
  eventType: string,
  deliveryId: string,
  signature: string
): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-github-event': eventType,
    'x-github-delivery': deliveryId,
    'x-hub-signature-256': signature,
  };
}

export function createTestDate(daysAgo: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function createDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mockTelegramBot() {
  return {
    sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
    onText: jest.fn(),
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
    on: jest.fn(),
  };
}
