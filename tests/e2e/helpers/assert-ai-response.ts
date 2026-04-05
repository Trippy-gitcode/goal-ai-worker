/**
 * GOAL AI — AI Response Assertion Helper
 * AC-AI-1: No error text in response
 * AC-AI-2: Response length > 20 chars
 * AC-AI-3: Input is re-editable after response
 */

import { Page, expect } from '@playwright/test';

export async function assertValidAIResponse(page: Page) {
  const aiMsg = page.locator('.msg.ai').last();
  await expect(aiMsg).toBeVisible({ timeout: 90000 });
  const text = await aiMsg.textContent() || '';

  // AC-AI-1: No error text
  expect(text, 'AI response should not contain error text').not.toContain('エラー');
  expect(text.toLowerCase(), 'AI response should not contain "error"').not.toContain('error');
  expect(text, 'AI response should not contain failure text').not.toContain('失敗');

  // AC-AI-2: Meaningful length
  expect(text.length, `AI response too short: "${text.slice(0, 30)}"`).toBeGreaterThan(20);

  // AC-AI-3: Input is re-editable
  const input = page.locator('#home-msg-in');
  if (await input.count() > 0) {
    await expect(input).toBeEditable({ timeout: 10000 });
  }
}
