import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

/*
 * Phase B-5 — コード分割（PATCH-PB5-CODE-SPLIT、2026-04-25）
 *
 * 目的: 初期 bundle サイズ削減 + ルート別 chunk 分割。
 *
 * 戦略:
 * 1. 画面別 chunk は Vite/Rollup の動的 import 自動分割に任せる（src/components/App.jsx
 *    の lazy() 化で各 S-XX 画面が個別 chunk になる）。
 * 2. ベンダー（preact / @preact/signals / preact-router / @supabase/supabase-js）は
 *    `manualChunks` 関数で 2 グループに固定: `vendor-preact`（フレームワーク）
 *    と `vendor-supabase`（Supabase クライアント、最大の重量物）。
 *    これにより画面遷移時に preact ランタイムが再評価されず、Supabase は初期 chunk
 *    から完全に分離（認証画面到達まで読込延期可能）。
 * 3. 共通 lib（src/lib/auth.js / supabase.js）は entry chunk に inline する代わり、
 *    `vendor-supabase` 経由で参照されるため自然に共有される。
 *
 * Vite v5 / v4 互換: `build.rollupOptions.output.manualChunks` は v3〜v5 共通 API。
 *
 * 参照:
 * - docs/ops/code_splitting.md（運用 SSoT）
 * - lais/verify/dev_system_v34_patches.md PATCH-PB5-CODE-SPLIT
 */
export default defineConfig({
  plugins: [preact()],
  server: {
    port: 5175,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Supabase は最重量（~150 kB minified）。独立 chunk で初期読込から外す。
          if (id.includes('@supabase')) return 'vendor-supabase';
          // Preact 系（preact / @preact/signals / preact-router）は同一 chunk に集約。
          if (
            id.includes('preact') ||
            id.includes('@preact')
          ) {
            return 'vendor-preact';
          }
          // それ以外のベンダーは vendor 共通 chunk へ（現状ほぼ存在しないが将来用）。
          return 'vendor';
        },
      },
    },
  },
});
