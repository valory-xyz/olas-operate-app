
# Pearl v1 Agent Requirements

**Date:** Nov 20, 2025  
**Approved for external use:** -

---

## Introduction

Pearl v1 introduces several features and security improvements that may require updates to existing agent blueprint implementations.

The main changes are:

- encrypted Agent EOA storage
- agent funding status endpoint
- agent performance template

This document focuses on the first two items.

---

## 1. Agent EOA Encryption

Previously, the Agent EOA private key was written to `ethereum_private_key.txt` in plaintext. That exposed the key to anyone with access to the agent working directory.

### Previous implementation

The private key was stored as a raw hex string in:

```text
.operate/services/sc-<uuid4>/deployment/agent/ethereum_private_key.txt
```

Example:

```text
0x80123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd
```

Usage:

```python
from eth_account import Account

with open("ethereum_private_key.txt", "r") as file:
    private_key = file.read().strip()

account = Account.from_key(private_key)
print(f"Ethereum Address: {account.address}")
```

### Securing Agent EOA private keys

In Pearl v1, each private key is stored encrypted in V3 keystore format.

This supports two goals:

1. **Secure local storage of private keys** by storing the key as a V3 Ethereum keystore JSON.
2. **Runtime access for the agent** by passing a user-set password from Pearl so the agent can decrypt and use the private key.

### Secure local storage

To support encrypted storage, `ethereum_private_key.txt` can now contain either:

- a plaintext private key, or
- a V3 Ethereum keystore JSON containing the encrypted private key

Example V3 keystore payload:

```json
{
  "address": "c9fe3494f6f96b57a3fe8c97055041f64c0b58d3",
  "crypto": {
    "cipher": "aes-128-ctr",
    "cipherparams": {
      "iv": "333c8d9d757fb91d7a1af36f388c8251"
    },
    "ciphertext": "e2f3f25bcfb4224e12ef7909cf885646b75828578def8bf92801a2b305a1bbe1",
    "kdf": "scrypt",
    "kdfparams": {
      "dklen": 32,
      "n": 262144,
      "r": 1,
      "p": 8,
      "salt": "89193d4941b92a45e8b4b99ce54c1d07"
    },
    "mac": "00ec6c5ca251adf5616598fe6ccd3eb9d4dced599124bf56e04d74c3fd1eeb1b"
  },
  "id": "100e1d76-f43f-42b1-abb9-2e2d2cbd96c9",
  "version": 3
}
```

### Runtime decryption

When the private key is encrypted, Pearl passes the decryption password to the agent as a command-line argument:

```text
--password <password>
```

The agent must read this argument and use it to decrypt the locally stored key.

The example below supports both:

- Pearl v1: encrypted private key
- Quickstart (QS): plaintext private key

> Agents created and run with Pearl v1 secure key storage are not expected to run with QS unchanged.

```python
from argparse import ArgumentParser
from eth_account import Account

with open("ethereum_private_key.txt", "r") as file:
    private_key = file.read().strip()

arg_parser = ArgumentParser()
arg_parser.add_argument(
    "--password",
    type=str,
    help="Password to decrypt the Ethereum private key.",
)
args = arg_parser.parse_args()

if args.password is not None:
    private_key = Account.decrypt(private_key, args.password)

account = Account.from_key(private_key)
print(f"Ethereum Address: {account.address}")
```

### Backwards compatibility

Quickstart continues to use plaintext private keys, so agent implementations must support both plaintext and encrypted formats.

---

## 2. Agent Funding Status Endpoint

Pearl v1 requires agents to implement the `/funds-status` endpoint. This allows an agent to request additional funds needed to maintain normal operation.

These funds are separate from staking funds in OLAS. They represent operational funds needed by the agent for its use case.

Examples:

- gas costs for the Agent EOA
- investment capital for an agent-managed Safe

Pearl periodically calls `/funds-status`, similar to `/healthcheck`.

- If the agent reports a non-zero deficit for an asset, Pearl prompts the user for approval and transfers the requested funds if approved.
- If the deficit is zero or the payload is empty, no action is taken.

> The agent may request funds only for its own EOA or Safe address. Requests for any other address are ignored.

### Middleware behavior

Important details for first integrations:

- middleware polls `/funds-status` only when the service is in `DEPLOYED` state
- middleware validates chain names and destination addresses
- unknown chains or unknown destination addresses can cause the funding requirements call to fail
- middleware currently uses the `deficit` field to determine requested transfers
- after a successful funding call, middleware applies a cooldown period (default: 5 minutes) during which new requests are ignored

---

## 3. Technical Specification

The `/funds-status` endpoint should:

- return HTTP `200` on success
- return a non-`200` status code on failure
- respond with JSON in the schema below

### Response schema

```json
{
  "chain1": {
    "0xAgentEOAAddress1": {
      "0x0000000000000000000000000000000000000000": {
        "balance": "850",
        "deficit": "150",
        "decimals": "18"
      },
      "0xToken1": {
        "balance": "1200",
        "deficit": "800",
        "decimals": "6"
      }
    },
    "0xSafeAddress": {
      "0x0000000000000000000000000000000000000000": {
        "balance": "1000",
        "deficit": "0",
        "decimals": "18"
      },
      "0xToken1": {
        "balance": "850",
        "deficit": "0",
        "decimals": "6"
      }
    }
  }
}
```

### Field definitions

#### First level

- **Chain name** in lowercase

#### Second level

- **Agent EOA or Safe address** in checksum format

#### Third level

- **Asset address**
  - ERC20 tokens: token contract address
  - native token: zero address `0x0000000000000000000000000000000000000000`

#### Fourth level

Object containing:

- `balance`: current balance in the smallest unit
- `deficit`: requested top-up amount in the smallest unit
- `decimals`: token precision, for example `18` for ETH or `6` for USDC

### Important details

- empty entries are treated as `0`
- units are expressed in the smallest token unit
  - `1000000000000000000 = 1 ETH`
  - `1000000 = 1 USDC`
- values should be strings to avoid large integer and serialization issues
- only the agent Safe and Agent EOA addresses should be reported

---

## 4. Fund Request Strategy

The agent is responsible for:

- reading the current balance for each required asset
- computing the deficit for both Agent Safe and Agent EOA
- returning the exact amount to be transferred in `deficit`

For fixed amounts, the recommended strategy is a **fixed threshold and top-up** approach:

```python
if current_balance < threshold:
    deficit = topup - current_balance
```

Definitions:

- `threshold`: minimum balance before requesting funds
- `topup`: target balance after a successful funding transfer

Typical rule of thumb:

```text
threshold = topup / 2
```

This helps avoid frequent small funding requests.

To reduce repeated requests and user notifications, prefer:

```text
requested_amount >= FACTOR * threshold - balance
```

Where:

- `FACTOR = 2` is a common default

If your agent uses a different strategy, it should still avoid continuous small requests. Prefer larger, less frequent transfers whenever practical.

Agents built with Open AEA / Open Autonomy can reuse the `funds_manager` skill, as already done in Trader. That skill implements a fixed threshold and top-up strategy, and only requires funding values to be configured.

---

## 5. Example Responses

### Example 1: Agent EOA needs native gas funds on Base

`0xC9FE3494f6f96B57A3FE8c97055041F64C0B58D3` is the Agent EOA address.

```json
{
  "base": {
    "0xC9FE3494f6f96B57A3FE8c97055041F64C0B58D3": {
      "0x0000000000000000000000000000000000000000": {
        "balance": "80000000000000",
        "deficit": "120000000000000",
        "decimals": "18"
      }
    }
  }
}
```

### Example 2: Agent Safe needs USDC on Optimism

`0x5E25f59942615F9C168200537A440551A70De703` is the agent Safe address.

```json
{
  "optimism": {
    "0x5E25f59942615F9C168200537A440551A70De703": {
      "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85": {
        "balance": "0",
        "deficit": "10000000",
        "decimals": "6"
      }
    }
  }
}
```

### Example 3: No extra funds needed

```json
{}
```

---

## 6. Reference Implementation

```python
import json
import os

from flask import Flask, jsonify
from web3 import Web3


app = Flask(__name__)

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
AGENT_EOA = Web3.to_checksum_address("0xc9fe3494f6f96b57a3fe8c97055041f64c0b58d3")
AGENT_SAFE = Web3.to_checksum_address("0x5e25f59942615f9c168200537a440551a70de703")
USDC_ADDRESS = Web3.to_checksum_address("0x0b2c639c533813f4aa9d7837caf62653d097ff85")

# It's a good practice to allow overriding fund requirements
# via environment variables for flexibility from Pearl.
FUND_REQUIREMENTS = json.loads(
    os.getenv(
        key="FUND_REQUIREMENTS",
        default=json.dumps(
            {
                "optimism": {
                    AGENT_EOA: {
                        ZERO_ADDRESS: {
                            "threshold": "50000000000000",
                            "topup": "500000000000000",
                        }
                    },
                    AGENT_SAFE: {
                        USDC_ADDRESS: {
                            "threshold": "1000000",
                            "topup": "10000000",
                        }
                    },
                }
            }
        ),
    )
)

RPC_URLS = json.loads(
    os.getenv(
        key="RPC_URLS",
        default=json.dumps(
            {
                "optimism": "https://mainnet.optimism.io",
            }
        ),
    )
)

_WEB3_CLIENTS: dict[str, Web3] = {}

ERC20_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function",
    },
]


def get_web3(chain: str) -> Web3:
    rpc_url = RPC_URLS.get(chain) or os.getenv(f"{chain.upper()}_RPC_URL")
    if not rpc_url:
        raise RuntimeError(f"No RPC URL configured for chain '{chain}'")
    if chain not in _WEB3_CLIENTS:
        _WEB3_CLIENTS[chain] = Web3(Web3.HTTPProvider(rpc_url))
    return _WEB3_CLIENTS[chain]


def fetch_balance(chain: str, address: str, asset_address: str) -> tuple[int, int]:
    w3 = get_web3(chain)
    if asset_address == ZERO_ADDRESS:
        return w3.eth.get_balance(address), 18

    contract = w3.eth.contract(address=asset_address, abi=ERC20_ABI)
    balance = contract.functions.balanceOf(address).call()
    try:
        decimals = contract.functions.decimals().call()
    except Exception:
        decimals = 18
    return balance, decimals


def compute_funds_status() -> dict:
    """Compute the current funds status for all chains, addresses, and assets."""
    payload: dict[str, dict[str, dict[str, dict[str, str]]]] = {}

    for chain, addresses in FUND_REQUIREMENTS.items():
        chain_result: dict[str, dict[str, dict[str, str]]] = {}

        for address, assets in addresses.items():
            checksum_address = Web3.to_checksum_address(address)
            asset_result: dict[str, dict[str, str]] = {}

            for asset_address, state in assets.items():
                checksum_asset = (
                    ZERO_ADDRESS
                    if asset_address == ZERO_ADDRESS
                    else Web3.to_checksum_address(asset_address)
                )
                balance, decimals = fetch_balance(chain, checksum_address, checksum_asset)
                threshold = int(state["threshold"])
                topup = int(state["topup"])
                deficit = str(max(topup - balance, 0) if balance < threshold else 0)

                asset_result[checksum_asset] = {
                    "balance": str(balance),
                    "deficit": str(deficit),
                    "decimals": str(decimals),
                }

            chain_result[checksum_address] = asset_result

        if any(
            int(asset["deficit"]) > 0
            for addr in chain_result.values()
            for asset in addr.values()
        ):
            payload[chain] = chain_result

    return payload


@app.get("/funds-status")
def funds_status() -> tuple[dict, int]:
    """Return the current funds status."""
    return jsonify(compute_funds_status()), 200


if __name__ == "__main__":
    app.run(port=8716)
```
