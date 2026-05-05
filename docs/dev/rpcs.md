# Acquiring RPC Endpoints for Development

The app supports multiple EVM chains. Provide HTTPS RPC URLs per chain in your `.env`:

```env
# Set only the chains you need; leave others unset or blank
GNOSIS_RPC=https://...
BASE_RPC=https://...
OPTIMISM_RPC=https://...
ETHEREUM_RPC=https://...
MODE_RPC=https://...
POLYGON_RPC=https://...
CELO_RPC=https://...
```

You can use Tenderly forks, Alchemy, Infura, QuickNode, or your own nodes. For local development, Virtual TestNets are convenient and safe.

## Tenderly (recommended for forks)

1. Create a Tenderly account at https://tenderly.co/ and a project.
2. Create a new Virtual TestNet under Infrastructure → Virtual TestNets.
3. Select your target network and note the Chain ID:
   - Gnosis Chain (id: 100)
   - Base (id: 8453)
   - Optimism (id: 10)
   - Ethereum Mainnet (id: 1)
   - Mode (id: 34443)
   - Polygon (id: 137)
   - Celo (id: 42220)
4. Copy the Virtual TestNets RPC URL and set the matching env variable(s), e.g.:

```env
GNOSIS_RPC=https://virtual.gnosis.eu.rpc.tenderly.co/...
BASE_RPC=https://virtual.base.eu.rpc.tenderly.co/...
```

Use Tenderly’s Fund Accounts to faucet test funds where supported.

Keep Virtual TestNets fresh by recreating them periodically and updating the corresponding env values.

## Managed RPC providers

For mainnet/testnet access without forking, obtain endpoints from providers and map them to the env variables above:

- Alchemy: https://dashboard.alchemy.com/
- Infura: https://app.infura.io/
- QuickNode: https://www.quicknode.com/
- Public RPCs: consult each chain’s docs; rate limits may apply.

## Notes

- Only set the env variables for chains you actually use.
- Ensure URLs are HTTPS. WebSocket endpoints are not required.
- If an RPC becomes rate-limited or unreliable, switch providers or a fresh Tenderly fork.
