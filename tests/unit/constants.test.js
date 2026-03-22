import { describe, it, expect } from 'vitest';
import { PLAN_CONFIG, PLAN_LIMITS, PLAN_MODELS, getModel, getPlanConfig, getCurrentMonth } from '../../src/utils/constants.js';

describe('PLAN_CONFIG', () => {
  it('has 5 plans', () => {
    expect(Object.keys(PLAN_CONFIG)).toEqual(['free', 'light', 'pro', 'max', 'ultra']);
  });

  it('free has daily_limit 20', () => {
    expect(PLAN_CONFIG.free.daily_limit).toBe(20);
  });

  it('ultra has per_turn 0 (unlimited)', () => {
    expect(PLAN_CONFIG.ultra.per_turn).toBe(0);
  });

  it('ultra has context_multiplier 2.0', () => {
    expect(PLAN_CONFIG.ultra.context_multiplier).toBe(2.0);
  });

  it('pro has GPT-5 model', () => {
    expect(PLAN_CONFIG.pro.models.openai).toBe('gpt-5');
  });
});

describe('PLAN_LIMITS (derived)', () => {
  it('auto-derives from PLAN_CONFIG', () => {
    expect(PLAN_LIMITS.free.chat).toBe(20);
    expect(PLAN_LIMITS.light.chat).toBe(9999);
    expect(PLAN_LIMITS.max.deep).toBe(99999);
  });
});

describe('getModel', () => {
  it('returns correct model for plan', () => {
    expect(getModel('free', 'claude')).toBe('claude-sonnet-4-20250514');
    expect(getModel('max', 'claude')).toBe('claude-opus-4-20250514');
    expect(getModel('pro', 'openai')).toBe('gpt-5');
  });

  it('returns default for unknown plan', () => {
    expect(getModel('nonexistent', 'claude')).toBe('claude-sonnet-4-20250514');
  });

  it('supports overrideModels', () => {
    const override = { claude: 'claude-haiku-4-5-20251001', openai: 'gpt-5-nano' };
    expect(getModel('pro', 'claude', override)).toBe('claude-haiku-4-5-20251001');
    expect(getModel('pro', 'openai', override)).toBe('gpt-5-nano');
  });
});

describe('getPlanConfig', () => {
  it('returns config for valid plan', () => {
    expect(getPlanConfig('pro').display_name).toBe('Pro');
  });

  it('returns free config for unknown plan', () => {
    expect(getPlanConfig('invalid').display_name).toBe('Free');
  });
});

describe('getCurrentMonth', () => {
  it('returns YYYY-MM format', () => {
    const month = getCurrentMonth();
    expect(month).toMatch(/^\d{4}-\d{2}$/);
  });
});
