# Olas-Operate API reference

## General

### `GET /api`

Returns information of the operate daemon.

<details>
  <summary>Response</summary>

```json
{
  "name": "Operate HTTP server",
  "version": "0.1.0.rc0",
  "account": {
    "key": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb9226a"
  },
  "home": "/Users/virajpatel/valory/olas-operate-app/.operate"
}
```

</details>

---

## Account

### `GET /api/account`

Returns account status.

<details>
  <summary>Response</summary>

- Before setup:

    ```json
    {
      "is_setup": false
    }
    ```

- After setup:

  ```json
  {
    "is_setup": true
  }
  ```

</details>

---

### `POST /api/account`

Create a local user account.

<details>
  <summary>Request</summary>

```json
{
  "password": "Hello,World!",
}
```

</details>

<details>
  <summary>Response</summary>

- If account did not exist:

  ```json
  {
    "error": null
  }
  ```

- If account already exists:

  ```json
  {
    "error": "Account already exists"
  }
  ```

</details>

---

### `PUT /api/account`

Update account password.

<details>
  <summary>Request</summary>

```json
{
  "old_password": "Hello,World!",
  "new_password": "Hello,World",
}
```

</details>

<details>
  <summary>Response</summary>

- If old password is valid:

  ```json
  {
    "error": null
  }
  ```

- If old password is not valid:

  ```json
  {
    "error": "Old password is not valid",
    "traceback": "..."
  }
  ```

</details>

---

### `POST /api/account/login`

Login and create a session.

<details>
  <summary>Request</summary>

```json
{
  "password": "Hello,World",
}
```

</details>

<details>
  <summary>Response</summary>

- If password is valid:

  ```json
  {
    "message": "Login successful"
  }
  ```

- If password is not valid:

  ```json
  {
    "error": "Password is not valid"
  }
  ```

</details>

---

## Wallet

### `GET /api/wallet`

Returns a list of available wallets

<details>
  <summary>Response</summary>

```json
[
  {
    "address": "0xFafd5cb31a611C5e5aa65ea8c6226EB4328175E7",
    "safe_chains": [
      "gnosis"
    ],
    "ledger_type": 0,
    "safes": {
      "gnosis": "0xd56fb274ce2C66008D5c4C09980c4f36Ab81ff23"
    },
    "safe_nonce": 110558881674480320952254000342160989674913430251257716940579305238321962891821
  }
]
```

</details>

---

### `GET /api/extended/wallet`

Returns a list of available wallets with enriched information. It executes on-chain requests to populate the list of owners of each safe, and provides the attributes

- `consistent_backup_owner`: This flag is `true` when all safes across the chains have exactly the same set of backup owner addresses. It ensures that ownership is identical across all safes, regardless of the number of owners.
- `consistent_backup_owner_count`: This flag is `true` when all safes have the same number of owners, and that number is either 0 (no backup owners) or 1 (exactly one backup owner). It checks for uniformity in the count of owners and restricts the count to these two cases.
- `consistent_safe_address`: This flag is `true` when all chains have the same safe address. It ensures there is a single safe address consistently used across all chains.

<details>
  <summary>Response</summary>

```json
[
  {
    "address":"0xFafd5cb31a611C5e5aa65ea8c6226EB4328175E7",
    "consistent_backup_owner": false,
    "consistent_backup_owner_count": false,
    "consistent_safe_address": true,
    "ledger_type":"ethereum",
    "safe_chains":[
      "gnosis",
      "ethereum",
      "base",
      "optimistic"
    ],
    "safe_nonce":110558881674480320952254000342160989674913430251257716940579305238321962891821,
    "safes":{
      "base":{
        "0xd56fb274ce2C66008D5c4C09980c4f36Ab81ff23":{
          "backup_owners": [],  // Empty = no backup owners
          "balances": {...}
        }
      },
      "ethereum":{
        "0xd56fb274ce2C66008D5c4C09980c4f36Ab81ff23":{
          "backup_owners":[
            "0x46eC2E77Fe3E367252f1A8a77470CE8eEd2A985b"
          ],
          "balances": {...}
        }
      },
      "gnosis":{
        "0xd56fb274ce2C66008D5c4C09980c4f36Ab81ff23":{
          "backup_owners":[
            "0x46eC2E77Fe3E367252f1A8a77470CE8eEd2A985b"
          ],
          "balances": {
            "0x0000000000000000000000000000000000000000": 995899999999999999998, // xDAI
            "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83": 0,                     // USDC
            "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f": 960000000000000000000  // OLAS
        }
      },
      "optimistic":{
        "0xd56fb274ce2C66008D5c4C09980c4f36Ab81ff23":{
          "backup_owners":[
            "0x46eC2E77Fe3E367252f1A8a77470CE8eEd2A985b"
          ],
          "balances": {...}
        }
      }
    },
    "single_backup_owner_per_safe":false
  }
]
```

</details>

---

### `POST /api/wallet`

Creates a master wallet for a given ledger type. If a wallet already exists for a given ledger type, it returns the already existing wallet without creating an additional one.

<details>
  <summary>Request</summary>

```json
{
  "ledger_type": LedgerType,
}
```

</details>

<details>
  <summary>Response</summary>

```json
{
  "wallet": {
    "address": "0xAafd5cb31a611C5e5aa65ea8c6226EB4328175E1",
    "safe_chains": [],
    "ledger_type": 0,
    "safes": {},
    "safe_nonce": null
  },
  "mnemonic": ["polar", "mail", "tattoo", "write", "track", ... ]
}
```

</details>

---

### `POST /api/wallet/safe`

Creates a Gnosis safe for given chain.

<details>
  <summary>Request</summary>

```js
{
  "chain": Chain,
  "fund_amount": 10000000000000000
}
```

</details>

<details>
  <summary>Response</summary>

- If Gnosis safe creation is successful:

  ```json
  {
    "address": "0xFafd5cb31a611C5e5aa65ea8c6226EB4328175E7",
    "safe_chains": [
      "gnosis"
    ],
    "ledger_type": 0,
    "safes": {
      "gnosis": "0xd56fb274ce2C66008D5c4C09980c4f36Ab81ff23"
    },
    "safe_nonce": 110558881674480320952254000342160989674913430251257716940579305238321962891821
  }
  ```

- If Gnosis safe creation is not successful:

  ```json
  {
    "error": "Error message",
    "traceback": "Traceback message"
  }
  ```

</details>

---

### `PUT /api/wallet/safe`

Upadtes a Gnosis safe for given chain. If no `backup_owner` is provided, it will assume a null value, that is, it will remove the backup owner from the safe.

<details>
  <summary>Request</summary>

```js
{
  "chain": Chain,
  "backup_owner": "0x650e83Bc808B8f405A9aF7CF68644cc817e084A6"  // Optional.
}
```

</details>

<details>
  <summary>Response</summary>

- If Gnosis safe update is successful:

  ```json
  {
    "backup_owner_updated": true,
    "chain": "gnosis",
    "message": "Backup owner updated.",
    "wallet": {
      "address": "0xFafd5cb31a611C5e5aa65ea8c6226EB4328175E7",
      "safe_chains": [
        "gnosis"
      ],
      "ledger_type": 0,
      "safes": {
        "gnosis": "0xd56fb274ce2C66008D5c4C09980c4f36Ab81ff23"
      },
      "safe_nonce": 110558881674480320952254000342160989674913430251257716940579305238321962891821
    }
  }
  ```

- If Gnosis safe update is successful, but no changes required in the safe:

  ```json
  {
    "backup_owner_updated": false,
    "chain": "gnosis",
    "message": "No changes on backup owner. The backup owner provided matches the current one.",
    "wallet": {
      "address": "0xFafd5cb31a611C5e5aa65ea8c6226EB4328175E7",
      "safe_chains": [
        "gnosis"
      ],
      "ledger_type": 0,
      "safes": {
        "gnosis": "0xd56fb274ce2C66008D5c4C09980c4f36Ab81ff23"
      },
      "safe_nonce": 110558881674480320952254000342160989674913430251257716940579305238321962891821
    }
  }
  ```

- If Gnosis safe creation is not successful:

  ```json
  {
    "error": "Error message",
    "traceback": "Traceback message"
  }
  ```

</details>

---

## Services

### `GET /api/v2/services`

Returns the list of existing service configurations.

<details>
  <summary>Response</summary>

```json
[
  {
    "chain_configs": {...},
    "description": "Trader agent for omen prediction markets",
    "env_variables": {...},
    "hash": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u",
    "hash_history": {"1731487112": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u"},
    "home_chain": "gnosis",
    "keys": [...],
    "name": "valory/trader_omen_gnosis",
    "service_config_id": "sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39",
    "service_path": "/home/user/.operate/services/sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39/trader_omen_gnosis",
    "version": 4
  },
  ...
]
```

</details>

---

#### `POST /api/v2/services`

Create a service configuration using a template.

<details>
  <summary>Request</summary>

```json
  {
    "configurations": {...},
    "description": "Trader agent for omen prediction markets",
    "env_variables": {...},
    "hash": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u",
    "image": "https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75",
    "home_chain": "gnosis",
    "name": "valory/trader_omen_gnosis",
    "service_version": "v0.18.4"
  }
```

</details>

<details>
  <summary>Response</summary>

```json
{
  "chain_configs": {...},
  "description": "Trader agent for omen prediction markets",
  "env_variables": {...},
  "hash": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u",
  "hash_history": {"1731487112": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u"},
  "home_chain": "gnosis",
  "keys": [...],
  "name": "valory/trader_omen_gnosis",
  "service_config_id": "sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39",
  "service_path": "/home/user/.operate/services/sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39/trader_omen_gnosis",
  "version": 4
}
```

</details>

---

### `PUT /api/v2/services`

Update all the service configurations whose Service Public ID match the Service Public ID in the provided hash.

<details>
  <summary>Request</summary>

```json
  {
    "configurations": {...},
    "description": "Trader agent for omen prediction markets",
    "env_variables": {...},
    "hash": "bafybeibpseosblmaw6sk6zsnic2kfxfsijrnfluuhkwboyqhx7ma7zw2me",
    "image": "https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75",
    "home_chain": "gnosis",
    "name": "valory/trader_omen_gnosis",
    "service_version": "v0.19.0"
  }
```

</details>

<details>
  <summary>Response</summary>

The response contains an array of the services which have been updated (an empty array if no service matches the Service Public ID in the provided hash).

```json
[
  {
    "chain_configs": {...},
    "description": "Trader agent for omen prediction markets",
    "env_variables": {...},
    "hash": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u",
    "hash_history": {"1731487112": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u", "1731490000": "bafybeibpseosblmaw6sk6zsnic2kfxfsijrnfluuhkwboyqhx7ma7zw2me"},
    "home_chain": "gnosis",
    "keys": [...],
    "name": "valory/trader_omen_gnosis",
    "service_config_id": "sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39",
    "service_path": "/home/user/.operate/services/sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39/trader_omen_gnosis",
    "version": 4
  },
  ...
]
```

</details>

---

#### `POST /api/v2/services/stop` (alias `GET /stop_all_services`)

Stop all running deployments.

<details>
  <summary>Response</summary>

- If the operation was successful:
  
  ```json
  {
    "message": "Services stopped."
  }
  ```

- If the operation was not successful:

  ```json
  {
    "error": "Error message",
    "traceback": "Traceback message"
  }
  ```

</details>

---

## Service

### `GET /api/v2/service/{service_config_id}`

Returns the service configuration `service_config_id`.

<details>
  <summary>Response</summary>

- If service configuration `service_config_id` exists:

  ```json
  {
    "chain_configs": {...},
    "description": "Trader agent for omen prediction markets",
    "env_variables": {...},
    "hash": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u",
    "hash_history": {"1731487112": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u"},
    "home_chain": "gnosis",
    "keys": [...],
    "name": "valory/trader_omen_gnosis",
    "service_config_id": "sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39",
    "service_path": "/home/user/.operate/services/sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39/trader_omen_gnosis",
    "version": 4
  }

  ```

- If service configuration `service_config_id` does not exist:
  
  ```json
  {
    "error": "Service foo not found"
  }
  ```

</details>

---

### `POST /api/v2/service/{service_config_id}`

Deploy service with service configuration `service_config_id` on-chain and run local deployment. This endpoint executes the following tasks:

1. Stops any running service.
2. Ensures that the service is deployed on-chain on all the configured chains.
3. Ensures that the the service is staked on all the configured chains.
4. Runs the service locally.
5. Starts funding job.
6. Starts healthcheck job.

</details>

<details>
  <summary>Response</summary>

The response contains the updated service configuration following the on-chain operations, including service Gnosis safe, on-chain token, etc.

```json
{
  "chain_configs": {...},
  "description": "Trader agent for omen prediction markets",
  "env_variables": {...},
  "hash": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u",
  "hash_history": {"1731487112": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u"},
  "home_chain": "gnosis",
  "keys": [...],
  "name": "valory/trader_omen_gnosis",
  "service_config_id": "sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39",
  "service_path": "/home/user/.operate/services/sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39/trader_omen_gnosis"
}

```

</details>

---

### `PUT /api/v2/service/{service_config_id}`

Update service configuration `service_config_id` with the provided template.

<details>
  <summary>Request</summary>

```json
  {
    "configurations": {...},
    "description": "Trader agent for omen prediction markets",
    "env_variables": {...},
    "hash": "bafybeibpseosblmaw6sk6zsnic2kfxfsijrnfluuhkwboyqhx7ma7zw2me",
    "image": "https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75",
    "home_chain": "gnosis",
    "name": "valory/trader_omen_gnosis",
    "service_version": "v0.19.0"
  }
```

</details>

<details>
  <summary>Response</summary>

- If the update is successful, the response contains the updated service configuration:

  ```json
  {
    "chain_configs": {...},
    "description": "Trader agent for omen prediction markets",
    "env_variables": {...},
    "hash": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u",
    "hash_history": {"1731487112": "bafybeidicxsruh3r4a2xarawzan6ocwyvpn3ofv42po5kxf7x6ck7kn22u", "1731490000": "bafybeibpseosblmaw6sk6zsnic2kfxfsijrnfluuhkwboyqhx7ma7zw2me"},
    "home_chain": "gnosis",
    "keys": [...],
    "name": "valory/trader_omen_gnosis",
    "service_config_id": "sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39",
    "service_path": "/home/user/.operate/services/sc-85a7a12a-8c6b-46b8-919a-b8a3b8e3ad39/trader_omen_gnosis"
  }

  ```

- If the update is not successful:

  ```json
  {
    "error": "Error message",
    "traceback": "Traceback message"
  }
  ```

</details>

---

### `POST /api/service/{service_config_id}/stop`

Stop service with service configuration `service_configuration_id`.

<details>
  <summary>Response</summary>

```json
  {
    "nodes": {
      "agent": [],
      "tendermint": []
    },
    "status": 1
  }
```

</details>

---

## Unused endpoints

### `POST /api/services/{service}/onchain/deploy`

**:warning: Deprecated**

Deploy service on-chain

<details>
  <summary>Request</summary>

```json
```

</details>

<details>
  <summary>Response</summary>

```json
```

</details>

---

### `POST /api/services/{service}/onchain/stop`

**:warning: Deprecated**

Stop service on-chain

<details>
  <summary>Request</summary>

```json
```

</details>

<details>
  <summary>Response</summary>

```json
```

</details>

---

### `GET /api/services/{service}/deployment`

**:warning: Deprecated**

<details>
  <summary>Response</summary>

```json
{
  "status": 1,
  "nodes": {
    "agent": [
      "traderomengnosis_abci_0"
    ],
    "tendermint": [
      "traderomengnosis_tm_0"
    ]
  }
}
```

</details>

---

### `POST /api/services/{service}/deployment/build`

**:warning: Deprecated**

Build service locally

<details>
  <summary>Request</summary>

```json
```

</details>

<details>
  <summary>Response</summary>

```json
```

</details>

---

### `POST /api/services/{service}/deployment/start`

**:warning: Deprecated**

Start agent

<details>
  <summary>Request</summary>

```json
```

</details>

<details>
  <summary>Response</summary>

```json
```

</details>

---

### `POST /api/services/{service}/deployment/stop`

**:warning: Deprecated**

Stop agent

```json
```

---

### `POST /api/services/{service}/deployment/delete`

**:warning: Deprecated**

Delete local deployment

<details>
  <summary>Request</summary>

```json
```

</details>

<details>
  <summary>Response</summary>

```json
```

</details>

<!-- 

<details>
  <summary>Request</summary>

```json
```

</details>

<details>
  <summary>Response</summary>

```json
```
</details>

-->
