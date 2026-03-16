/**
 * Tests for agent type constants.
 *
 * `AgentMap` values are used as API identifiers sent to the middleware backend.
 * A mismatch between the frontend constant and the middleware's expected string
 * causes the entire agent flow to fail silently (wrong agent started, service
 * not found, etc.).
 */

import { AgentMap } from '../../constants/agent';

describe('AgentMap', () => {
  it('maps PredictTrader to the middleware identifier "trader"', () => {
    expect(AgentMap.PredictTrader).toBe('trader');
  });

  it('maps AgentsFun to the middleware identifier "memeooorr"', () => {
    expect(AgentMap.AgentsFun).toBe('memeooorr');
  });

  it('maps Modius to the middleware identifier "modius"', () => {
    expect(AgentMap.Modius).toBe('modius');
  });

  it('maps Optimus to the middleware identifier "optimus"', () => {
    expect(AgentMap.Optimus).toBe('optimus');
  });

  it('maps PettAi to the middleware identifier "pett_ai"', () => {
    expect(AgentMap.PettAi).toBe('pett_ai');
  });

  it('maps Polystrat to the middleware identifier "polymarket_trader"', () => {
    expect(AgentMap.Polystrat).toBe('polymarket_trader');
  });

  it('covers exactly 6 agent types', () => {
    expect(Object.keys(AgentMap)).toHaveLength(6);
  });

  it('has no duplicate middleware identifier values', () => {
    const values = Object.values(AgentMap);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('uses only lowercase identifiers (middleware is case-sensitive)', () => {
    for (const value of Object.values(AgentMap)) {
      expect(value).toBe(value.toLowerCase());
    }
  });
});
