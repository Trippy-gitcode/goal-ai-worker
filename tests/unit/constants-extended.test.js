import { describe, it, expect } from 'vitest';
import {
  PLAN_CONFIG,
  PLAN_LIMITS,
  PLAN_MODELS,
  FAIR_USE,
  FREE_MODEL_LIMITS,
  PROMO_CODES,
  TESTER_CODES,
  TESTER_TOTAL_LIMIT,
  TESTER_DURATION_HOURS,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  STRIPE_PRICE_IDS,
  STRIPE_SUCCESS_URL,
  STRIPE_CANCEL_URL,
  USAGE_BATCH_SIZE,
  APP_VERSION,
  COMMON_RULES,
  getModel,
  getPlanConfig,
  getCurrentMonth,
} from '../../src/utils/constants.js';

// ════════════════════════════════════════════════════════════════
// Plan invariants — every plan complete + structurally valid
// ════════════════════════════════════════════════════════════════

describe('PLAN_CONFIG completeness', () => {
  const plans = ['free', 'light', 'pro', 'max', 'ultra'];

  it('should define every plan in PLAN_CONFIG', () => {
    for (const p of plans) expect(PLAN_CONFIG[p]).toBeDefined();
  });

  it('should give each plan a display_name', () => {
    for (const p of plans) expect(typeof PLAN_CONFIG[p].display_name).toBe('string');
  });

  it('should define models for openai/claude/gemini/router on every plan', () => {
    for (const p of plans) {
      expect(PLAN_CONFIG[p].models.openai).toBeDefined();
      expect(PLAN_CONFIG[p].models.claude).toBeDefined();
      expect(PLAN_CONFIG[p].models.gemini).toBeDefined();
      expect(PLAN_CONFIG[p].models.router).toBeDefined();
    }
  });

  it('should set fair_use on every plan with h5_limit + weekly_limit', () => {
    for (const p of plans) {
      expect(PLAN_CONFIG[p].fair_use.h5_limit).toBeGreaterThan(0);
      expect(PLAN_CONFIG[p].fair_use.weekly_limit).toBeGreaterThan(0);
    }
  });

  it('should make ultra context_multiplier strictly larger than free', () => {
    expect(PLAN_CONFIG.ultra.context_multiplier).toBeGreaterThan(PLAN_CONFIG.free.context_multiplier);
  });

  it('should make max + ultra deep_monthly Infinity', () => {
    expect(PLAN_CONFIG.max.deep_monthly).toBe(Infinity);
    expect(PLAN_CONFIG.ultra.deep_monthly).toBe(Infinity);
  });
});

// ════════════════════════════════════════════════════════════════
// PLAN_LIMITS — derived correctly from PLAN_CONFIG
// ════════════════════════════════════════════════════════════════

describe('PLAN_LIMITS derivation', () => {
  it('should map every plan key', () => {
    for (const p of ['free', 'light', 'pro', 'max', 'ultra']) {
      expect(PLAN_LIMITS[p]).toBeDefined();
      expect(PLAN_LIMITS[p].chat).toBeDefined();
      expect(PLAN_LIMITS[p].deep).toBeDefined();
    }
  });

  it('should map Infinity deep to 99999', () => {
    expect(PLAN_LIMITS.max.deep).toBe(99999);
    expect(PLAN_LIMITS.ultra.deep).toBe(99999);
  });

  it('should preserve free chat limit at 20', () => {
    expect(PLAN_LIMITS.free.chat).toBe(20);
  });

  it('should map paid plans (no daily_limit) to 9999 chat', () => {
    expect(PLAN_LIMITS.light.chat).toBe(9999);
    expect(PLAN_LIMITS.pro.chat).toBe(9999);
    expect(PLAN_LIMITS.max.chat).toBe(9999);
  });
});

// ════════════════════════════════════════════════════════════════
// PLAN_MODELS — _default fallback
// ════════════════════════════════════════════════════════════════

describe('PLAN_MODELS', () => {
  it('should expose _default fallback identical to free models', () => {
    expect(PLAN_MODELS._default).toEqual(PLAN_CONFIG.free.models);
  });

  it('should resolve every plan to a models map', () => {
    for (const p of ['free', 'light', 'pro', 'max', 'ultra']) {
      expect(typeof PLAN_MODELS[p]).toBe('object');
    }
  });
});

// ════════════════════════════════════════════════════════════════
// getModel() — overrideModels precedence
// ════════════════════════════════════════════════════════════════

describe('getModel()', () => {
  it('should resolve to plan model when no override', () => {
    expect(getModel('pro', 'openai')).toBe(PLAN_CONFIG.pro.models.openai);
  });

  it('should prefer override over plan model', () => {
    const override = { claude: 'override-claude', openai: 'override-gpt' };
    expect(getModel('free', 'claude', override)).toBe('override-claude');
    expect(getModel('pro', 'openai', override)).toBe('override-gpt');
  });

  it('should fall through to default when override does not have provider', () => {
    const override = { claude: 'override-claude' };
    // No openai in override → fall back to PLAN_MODELS._default
    expect(getModel('free', 'openai', override)).toBe(PLAN_MODELS._default.openai);
  });

  it('should fall back to default for unknown plan', () => {
    expect(getModel('mystery', 'claude')).toBe(PLAN_MODELS._default.claude);
  });
});

// ════════════════════════════════════════════════════════════════
// getPlanConfig() — defensive lookup
// ════════════════════════════════════════════════════════════════

describe('getPlanConfig()', () => {
  it('should return free config for null/undefined/unknown', () => {
    expect(getPlanConfig(null).display_name).toBe('Free');
    expect(getPlanConfig(undefined).display_name).toBe('Free');
    expect(getPlanConfig('xxx').display_name).toBe('Free');
  });

  it('should return correct config for each plan', () => {
    expect(getPlanConfig('pro').display_name).toBe('Pro');
    expect(getPlanConfig('max').display_name).toBe('Max');
    expect(getPlanConfig('ultra').display_name).toBe('Ultra');
  });
});

// ════════════════════════════════════════════════════════════════
// getCurrentMonth() — JST-shifted YYYY-MM
// ════════════════════════════════════════════════════════════════

describe('getCurrentMonth()', () => {
  it('should match YYYY-MM regex', () => {
    expect(getCurrentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('should return a current-or-future year string', () => {
    const yr = parseInt(getCurrentMonth().slice(0, 4));
    expect(yr).toBeGreaterThanOrEqual(2024);
  });
});

// ════════════════════════════════════════════════════════════════
// FAIR_USE / FREE_MODEL_LIMITS / RATE_LIMIT_*
// ════════════════════════════════════════════════════════════════

describe('FAIR_USE constants', () => {
  it('should expose hourly + daily + delayMs as numbers', () => {
    expect(typeof FAIR_USE.hourly).toBe('number');
    expect(typeof FAIR_USE.daily).toBe('number');
    expect(typeof FAIR_USE.delayMs).toBe('number');
  });

  it('should keep daily ≥ hourly (fairness sanity)', () => {
    expect(FAIR_USE.daily).toBeGreaterThanOrEqual(FAIR_USE.hourly);
  });
});

describe('FREE_MODEL_LIMITS', () => {
  it('should expose claude / gemini / gpt limits', () => {
    expect(FREE_MODEL_LIMITS.claude).toBe(5);
    expect(FREE_MODEL_LIMITS.gemini).toBe(5);
    expect(FREE_MODEL_LIMITS.gpt).toBe(10);
  });
});

describe('RATE_LIMIT_*', () => {
  it('should expose RATE_LIMIT_WINDOW and RATE_LIMIT_MAX', () => {
    expect(RATE_LIMIT_WINDOW).toBe(60);
    expect(RATE_LIMIT_MAX).toBe(30);
  });
});

// ════════════════════════════════════════════════════════════════
// PROMO_CODES & TESTER_CODES
// ════════════════════════════════════════════════════════════════

describe('PROMO_CODES', () => {
  it('should define LAUNCH30 with 30 days pro', () => {
    expect(PROMO_CODES.LAUNCH30.plan).toBe('pro');
    expect(PROMO_CODES.LAUNCH30.days).toBe(30);
  });

  it('should set valid plan for every promo code', () => {
    for (const code of Object.keys(PROMO_CODES)) {
      expect(PROMO_CODES[code].plan).toBeDefined();
      expect(PROMO_CODES[code].days).toBeGreaterThan(0);
      expect(PROMO_CODES[code].desc).toBeDefined();
    }
  });
});

describe('TESTER_CODES', () => {
  it('should expose 5 tester codes', () => {
    expect(Object.keys(TESTER_CODES)).toHaveLength(5);
  });

  it('should set max_uses ≤ TESTER_TOTAL_LIMIT for each tester', () => {
    for (const code of Object.keys(TESTER_CODES)) {
      expect(TESTER_CODES[code].max_uses).toBeLessThanOrEqual(TESTER_TOTAL_LIMIT);
    }
  });

  it('should expose TESTER_DURATION_HOURS as 72', () => {
    expect(TESTER_DURATION_HOURS).toBe(72);
  });
});

// ════════════════════════════════════════════════════════════════
// STRIPE_PRICE_IDS — every key prefixed price_
// ════════════════════════════════════════════════════════════════

describe('STRIPE_PRICE_IDS', () => {
  it('should expose stripe price_ ids for every paid plan', () => {
    for (const k of ['light', 'pro', 'max', 'ultra']) {
      expect(STRIPE_PRICE_IDS[k]).toMatch(/^price_/);
    }
  });

  it('should expose addon SKUs', () => {
    expect(STRIPE_PRICE_IDS.addon_50).toMatch(/^price_/);
    expect(STRIPE_PRICE_IDS.addon_120).toMatch(/^price_/);
  });

  it('should set https success / cancel URLs', () => {
    expect(STRIPE_SUCCESS_URL).toMatch(/^https:\/\//);
    expect(STRIPE_CANCEL_URL).toMatch(/^https:\/\//);
  });
});

// ════════════════════════════════════════════════════════════════
// Misc constants
// ════════════════════════════════════════════════════════════════

describe('misc constants', () => {
  it('should set USAGE_BATCH_SIZE to a positive integer', () => {
    expect(Number.isInteger(USAGE_BATCH_SIZE)).toBe(true);
    expect(USAGE_BATCH_SIZE).toBeGreaterThan(0);
  });

  it('should set APP_VERSION as semver-like x.y.z', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should provide COMMON_RULES with non-empty Japanese guidance', () => {
    expect(typeof COMMON_RULES).toBe('string');
    expect(COMMON_RULES.length).toBeGreaterThan(50);
    expect(COMMON_RULES).toContain('共通ルール');
  });
});
