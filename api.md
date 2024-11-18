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
      2
    ],
    "ledger_type": 0,
    "safe": "0xd56fb274ce2C66008D5c4C09980c4f36Ab81ff23",
    "safe_nonce": 110558881674480320952254000342160989674913430251257716940579305238321962891821
  }
]
```

</details>

---

### `POST /api/wallet`

Creates a master wallet for given chain type. If a wallet already exists for a given chain type, it returns the already existing wallet without creating an additional one.

<details>
  <summary>Request</summary>

```json
{
  "chain": Chain,
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

Creates a Gnosis safe for given chain type.

<details>
  <summary>Request</summary>

```js
{
  "chain": Chain,
}
```

</details>

<details>
  <summary>Response</summary>

- If Gnosis safe creation is successful:

  ```json
  {
    "address": "0xaaFd5cb31A611C5e5aa65ea8c6226EB4328175E3",
    "safe_chains": [
      2
    ],
    "ledger_type": 0,
    "safes": {
      "2": "0xe56fb574ce2C66008d5c4C09980c4f36Ab81ff22"
    },
    "safe_nonce": 110558881674480320952254000342160989674913430251157716140571305138121962898821
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
