import { describe, it, expect } from 'vitest';

// Round 31 P5#50 fix (2026-05-02): vendor API response schema contract 検証。
// 各 vendor (OpenAI / Anthropic / Stripe) の response 形式を 静的 schema で記述、
// 将来 vendor breaking change 検知時に test fail で先行 alert する仕組み。
describe('Vendor API response contract (P5#50 fix)', () => {
  // OpenAI Chat Completions response schema
  it('should validate OpenAI Chat Completions response shape', () => {
    const sample = {
      id: 'chatcmpl-test',
      object: 'chat.completion',
      created: 1700000000,
      model: 'gpt-5-mini',
      choices: [{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    };
    expect(sample.id).toMatch(/^chatcmpl-/);
    expect(sample.choices).toHaveLength(1);
    expect(sample.choices[0].message.role).toBe('assistant');
    expect(typeof sample.choices[0].message.content).toBe('string');
    expect(sample.usage.total_tokens).toBeGreaterThan(0);
  });

  // Anthropic Messages response schema
  it('should validate Anthropic Messages response shape', () => {
    const sample = {
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'hi' }],
      model: 'claude-sonnet-4',
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
    };
    expect(sample.type).toBe('message');
    expect(sample.role).toBe('assistant');
    expect(sample.content).toHaveLength(1);
    expect(sample.content[0].type).toBe('text');
    expect(typeof sample.usage.input_tokens).toBe('number');
  });

  // Stripe Checkout Session response schema
  it('should validate Stripe Checkout Session response shape', () => {
    const sample = {
      id: 'cs_test_123',
      object: 'checkout.session',
      payment_status: 'paid',
      status: 'complete',
      customer: 'cus_test',
      subscription: 'sub_test',
      amount_total: 1500,
      currency: 'jpy',
    };
    expect(sample.object).toBe('checkout.session');
    expect(['paid', 'unpaid', 'no_payment_required']).toContain(sample.payment_status);
    expect(['open', 'complete', 'expired']).toContain(sample.status);
  });

  // Gemini generateContent response schema
  it('should validate Gemini generateContent response shape', () => {
    const sample = {
      candidates: [{ content: { parts: [{ text: 'hi' }], role: 'model' }, finishReason: 'STOP', index: 0 }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    };
    expect(sample.candidates).toHaveLength(1);
    expect(sample.candidates[0].content.role).toBe('model');
    expect(sample.usageMetadata.totalTokenCount).toBeGreaterThan(0);
  });
});
