/**
 * Tests for X402 protocol feature flags per agent type.
 *
 * X402 is a payment protocol integrated into some agents. The flags control
 * whether the frontend shows X402-related UI for each agent. A missing entry
 * or incorrect value causes the UI to either always show or never show the
 * X402 payment flow for that agent.
 */

import { AgentMap } from '../../constants/agent';
import { X402_ENABLED_FLAGS } from '../../constants/x402';

describe('X402_ENABLED_FLAGS', () => {
  it('covers every agent type defined in AgentMap — no missing entries', () => {
    // Every AgentMap value must have an entry; adding a new agent without
    // updating this map would be a TypeScript error, but we assert it at
    // runtime too to catch any dynamic misuse.
    for (const agentType of Object.values(AgentMap)) {
      expect(X402_ENABLED_FLAGS).toHaveProperty(agentType);
    }
  });

  it('has exactly as many entries as there are agent types', () => {
    const agentCount = Object.values(AgentMap).length;
    expect(Object.keys(X402_ENABLED_FLAGS)).toHaveLength(agentCount);
  });

  it('all values are boolean (not truthy/falsy objects)', () => {
    for (const [, flag] of Object.entries(X402_ENABLED_FLAGS)) {
      expect(typeof flag).toBe('boolean');
    }
  });

  describe('PredictTrader', () => {
    it('has X402 enabled', () => {
      expect(X402_ENABLED_FLAGS[AgentMap.PredictTrader]).toBe(true);
    });
  });

  describe('Optimus', () => {
    it('has X402 enabled', () => {
      expect(X402_ENABLED_FLAGS[AgentMap.Optimus]).toBe(true);
    });
  });

  describe('Modius', () => {
    it('has X402 enabled', () => {
      expect(X402_ENABLED_FLAGS[AgentMap.Modius]).toBe(true);
    });
  });

  describe('Polystrat', () => {
    it('has X402 enabled', () => {
      expect(X402_ENABLED_FLAGS[AgentMap.Polystrat]).toBe(true);
    });
  });

  describe('AgentsFun', () => {
    it('has X402 disabled (x402 is internal to agent, not relevant to FE)', () => {
      expect(X402_ENABLED_FLAGS[AgentMap.AgentsFun]).toBe(false);
    });
  });

  describe('PettAi', () => {
    it('has X402 disabled', () => {
      expect(X402_ENABLED_FLAGS[AgentMap.PettAi]).toBe(false);
    });
  });
});
