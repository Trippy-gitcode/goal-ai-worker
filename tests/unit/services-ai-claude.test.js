import { describe, it, expect } from 'vitest';
import { buildAnthropicRequest } from '../../src/services/ai/claude.js';

describe('buildAnthropicRequest', () => {
  it('should produce {model, max_tokens, messages} skeleton', () => {
    const r = buildAnthropicRequest('SYS', '', [{ role: 'user', content: 'hi' }], 'claude-X', 200, {});
    expect(r.model).toBe('claude-X');
    expect(r.max_tokens).toBe(200);
    expect(r.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('should set system as plain string when CACHE_ENABLED is unset', () => {
    const r = buildAnthropicRequest('SYS-A', 'VAR-B', [], 'm', 100, {});
    expect(r.system).toBe('SYS-AVAR-B');
  });

  it('should set system as cache_control block when CACHE_ENABLED=true', () => {
    const r = buildAnthropicRequest('SYS-A', '', [], 'm', 100, { CACHE_ENABLED: 'true' });
    expect(Array.isArray(r.system)).toBe(true);
    expect(r.system[0]).toMatchObject({ type: 'text', text: 'SYS-A' });
    expect(r.system[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('should append variablePart as a plain (uncached) text block when present', () => {
    const r = buildAnthropicRequest('SYS', 'VAR', [], 'm', 100, { CACHE_ENABLED: 'true' });
    expect(r.system).toHaveLength(2);
    expect(r.system[0].cache_control).toBeDefined();
    expect(r.system[1]).toEqual({ type: 'text', text: 'VAR' });
    expect(r.system[1].cache_control).toBeUndefined();
  });

  it('should NOT append variablePart when empty/whitespace and CACHE_ENABLED=true', () => {
    const r = buildAnthropicRequest('SYS', '   ', [], 'm', 100, { CACHE_ENABLED: 'true' });
    expect(r.system).toHaveLength(1);
  });

  it('should pass through messages unchanged', () => {
    const msgs = [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ];
    const r = buildAnthropicRequest('S', '', msgs, 'm', 100, {});
    expect(r.messages).toEqual(msgs);
  });
});
