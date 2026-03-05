# Pearl Agent Integration Checklist (3rd Party)

This checklist helps external teams integrate their agent into Pearl. There are two paths — choose one:

- **Path A — Hand off to Pearl team**: Complete the prerequisites and assets sections below, then share this document with the Pearl team. They will handle all code changes.
- **Path B — Raise a PR yourself**: Complete the prerequisites and assets sections below, then follow [frontend-checklist.md](./frontend-checklist.md) to make the code changes and open a PR against the `staging` branch.

> **New chain?** If your agent runs on a chain not already supported in Pearl (Gnosis, Base, Mode, Optimism, Polygon), contact the Pearl team first. Chain-level infrastructure cannot be added via a 3rd party PR.

---

## Prerequisites

Confirm these are in place before starting:

- [ ] Staking contract(s) deployed on-chain — note address(es) and chain
- [ ] Activity checker contract deployed — note address and ABI type (Mech / Requester / Staking / Meme / Pet)
- [ ] OLAS staking requirement per program tier (e.g. 100 OLAS for Beta I, 1000 OLAS for Beta II)
- [ ] Service package published to IPFS — note the hash
- [ ] Agent registered on the [Olas Registry](https://marketplace.olas.network/ethereum/ai-agents) — note the agent ID(s)
- [ ] Middleware PR open or merged (see [middleware-checklist.md](./middleware-checklist.md))

---

## Information & Assets to Provide

Gather everything below. These are required for the code changes in either path.

### Identity

- [ ] Display name (shown in the UI, e.g. "Polystrat")
- [ ] Short description (one sentence shown on the agent card)
- [ ] Category (optional: `Prediction Markets` or `DeFi`)
- [ ] Default behavior string (optional, shown in the Performance tab)
- [ ] Service public ID (Olas Registry identifier, e.g. `valory/trader`)
- [ ] Agent type key (snake_case internal name matching the middleware, e.g. `polymarket_trader`)

### Service Template

- [ ] IPFS hash of the service package
- [ ] Service version string (e.g. `v0.31.7`)
- [ ] Agent release GitHub repository and version tag
- [ ] All environment variables with name, description, and provision type (`USER` / `COMPUTED` / `FIXED`)
- [ ] Fund requirements per chain: native token amounts for agent wallet and safe wallet, plus any ERC20 token amounts
- [ ] NFT IPFS hash used in the staking contract configuration

### Tokens (if ERC20 required)

- [ ] Token symbol, contract address, and decimals for each token the agent requires (if not already supported on that chain)

### Agent Flags

- [ ] `requiresSetup` — does the user need to enter API keys or config during setup? If yes, list each input field with label and validation rules.
- [ ] `isGeoLocationRestricted` — should a geo-restriction warning appear?
- [ ] `hasExternalFunds` — does the agent hold funds in external DeFi protocols?
- [ ] `isX402Enabled` — does the agent use the X402 payment protocol?
- [ ] `doesChatUiRequireApiKey` — does the embedded chat UI need a user-provided API key?
- [ ] `needsOpenProfileEachAgentRun` — does the user need to open an external URL each run? If yes, provide the alert title and message.

### Feature Flags

Agree with the Pearl PM on `true` / `false` for each: `withdraw-funds`, `staking-contract-section`, `backup-via-safe`, `bridge-onboarding`, `bridge-add-funds`, `on-ramp`.

### Visual Assets

- [ ] Agent icon — PNG, 64×64 px, named `agent-{agentType}-icon.png`
- [ ] Onboarding step images — one PNG per step (any number of steps), named `setup-agent-{agentType}-{n}.png`
- [ ] Onboarding copy — for each step: a short title and a one-sentence description

### Performance Metrics

- [ ] List of metrics the agent will report via `agent_performance.json` — for each: name, `is_primary` (true/false), description, example value. See [agent-performance-checklist.md](./agent-performance-checklist.md) for the full spec.
