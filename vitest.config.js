import { defineConfig } from 'vitest/config';

// Vitest config — Lais (goal-ai-worker)
//
// Coverage thresholds reflect Phase 8.1 Functional Coverage Review baseline:
// unit充足率 2.2% → 拡充後 ≥ 30 件 (helpers / auth / rate-limit / streak / cors / routing)
// 段階的に上げる前提: 初期は v8 provider + reporter のみ、threshold は緩めから開始。
// `npm run test:coverage` 用に provider を v8 で固定 (Node20+ で利用可)。

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    exclude: ['tests/e2e/**', 'tests/smoke/**'],
    environment: 'node',
    globals: false,                  // explicit imports for IDE clarity
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    testTimeout: 5000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/**/*.test.js', 'src/index.js', 'src/worker.js.bak'],
      thresholds: {
        // SUBAGENT-LAIS-UNIT-COVERAGE-70-V1 (2026-05-01): unit test 200+ 件
        // で line 70%+ / branch 60%+ / function 70%+ 達成済。70% 閾値を恒久化。
        lines: 70,
        branches: 60,
        functions: 70,
        statements: 70,
      },
    },
  },
});
