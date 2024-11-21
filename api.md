#### `GET /api`

Returns information of the operate daemon

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
#### `GET /api/account`

Returns account status

<details>
  <summary>Before setup</summary>

```json
{
  "is_setup": false
}
```

</details>

<details>
  <summary>After setup</summary>

```json
{
  "is_setup": true
}
```
</details>

---
#### `POST /api/account`

Create a local user account

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

```json
{
  "error": null
}
```
</details>

If account already exists

<details>
  <summary>Response</summary>

```json
{
  "error": "Account already exists"
}
```
</details>

---
#### `PUT /api/account`

Update password

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

```json
{
  "error": null
}
```
</details>

Old password is not valid

<details>
  <summary>Response</summary>

```json
{
  "error": "Old password is not valid",
  "traceback": "..."
}
```
</details>

---
#### `POST /api/account/login`

Login and create a session

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

```json
{
  "message": "Login successful"
}
```
</details>

---
#### `GET /api/wallet`

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
#### `POST /api/wallet`

Creates a master key for given chain type.

<details>
  <summary>Request</summary>

```js
{
  "chain_type": ChainType,
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
    "safe": null,
    "safe_nonce": null
  },
  "mnemonic": [...]
}
```
</details>

---
#### `POST /api/wallet/safe`

Creates a gnosis safe for given chain type.

<details>
  <summary>Request</summary>

```js
{
  "chain_type": ChainType,
  "backup_owner": "0xd7DB7603B5A5c1cBBD88b7C11F3Fd6e46779094e"
}
```

Note: For backwards compatibility, the field `owner` is also accepted as an alias for `backup_owner`.

</details>

<details>
  <summary>Response</summary>

```json
{
  "address": "0xaaFd5cb31A611C5e5aa65ea8c6226EB4328175E3",
  "safe_chains": [
    2
  ],
  "ledger_type": 0,
  "safe": "0xe56fb574ce2C66008d5c4C09980c4f36Ab81ff22",
  "safe_nonce": 110558881674480320952254000342160989674913430251157716140571305138121962898821
}
```
</details>

---
#### `PUT /api/wallet/safe`

Updates a gnosis safe for given chain type.

<details>
  <summary>Request</summary>

```js
{
  "chain_type": ChainType,
  "backup_owner": "0xd7DB7603B5A5c1cBBD88b7C11F3Fd6e46779094e"
}
```

Note: For backwards compatibility, the field `owner` is also accepted as an alias for `backup_owner`.

</details>

<details>
  <summary>Response</summary>

```json
{
  "address": "0xaaFd5cb31A611C5e5aa65ea8c6226EB4328175E3",
  "safe_chains": [
    2
  ],
  "ledger_type": 0,
  "safe": "0xe56fb574ce2C66008d5c4C09980c4f36Ab81ff22",
  "safe_nonce": 110558881674480320952254000342160989674913430251157716140571305138121962898821
}
```
</details>

---
#### `GET /api/services`

Returns the list of services

<details>
  <summary>Response</summary>

```json
[
  {
    "hash": "bafybeiha6dxygx2ntgjxhs6zzymgqk3s5biy3ozeqw6zuhr6yxgjlebfmq",
    "keys": [
      {
        "ledger": 0,
        "address": "0x6Db941e0e82feA3c02Ba83B20e3fB5Ea6ee539cf",
        "private_key": "0x34f58dcc11acec007644e49921fd81b9c8a959f651d6d66a42242a1b2dbaf4be"
      }
    ],
    "ledger_config": {
      "rpc": "http://localhost:8545",
      "type": 0,
      "chain": 2
    },
    "chain_data": {
      "instances": [
        "0x6Db941e0e82feA3c02Ba83B20e3fB5Ea6ee539cf"
      ],
      "token": 380,
      "multisig": "0x7F3e460Cf596E783ca490791643C0055Fa2034AC",
      "staked": false,
      "on_chain_state": 6,
      "user_params": {
        "nft": "bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq",
        "agent_id": 14,
        "threshold": 1,
        "use_staking": false,
        "cost_of_bond": 10000000000000000,
        "olas_cost_of_bond": 10000000000000000000,
        "olas_required_to_stake": 10000000000000000000,
        "fund_requirements": {
          "agent": 0.1,
          "safe": 0.5
        }
      }
    },
    "path": "/Users/virajpatel/valory/olas-operate-app/.operate/services/bafybeiha6dxygx2ntgjxhs6zzymgqk3s5biy3ozeqw6zuhr6yxgjlebfmq",
    "service_path": "/Users/virajpatel/valory/olas-operate-app/.operate/services/bafybeiha6dxygx2ntgjxhs6zzymgqk3s5biy3ozeqw6zuhr6yxgjlebfmq/trader_omen_gnosis",
    "name": "valory/trader_omen_gnosis"
  }
]
```

</details>

---
#### `POST /api/services`

Create a service using the service template

<details>
  <summary>Request</summary>

```json
{
  "name": "Trader Agent",
  "description": "Trader agent for omen prediction markets",
  "hash": "bafybeiha6dxygx2ntgjxhs6zzymgqk3s5biy3ozeqw6zuhr6yxgjlebfmq",
  "image": "https://operate.olas.network/_next/image?url=%2Fimages%2Fprediction-agent.png&w=3840&q=75",
  "configuration": {
    "nft": "bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq",
    "rpc": "http://localhost:8545",
    "agent_id": 14,
    "threshold": 1,
    "use_staking": false,
    "cost_of_bond": 10000000000000000,
    "olas_cost_of_bond": 10000000000000000000,
    "olas_required_to_stake": 10000000000000000000,
    "fund_requirements": {
      "agent": 0.1,
      "safe": 0.5
    }
  }
}
```

</details>

Optionally you can add `deploy` parameter and set it to `true` for a full deployment in a single request.

<details>
  <summary>Response</summary>

```json
{
  "hash": "bafybeiha6dxygx2ntgjxhs6zzymgqk3s5biy3ozeqw6zuhr6yxgjlebfmq",
  "keys": [
    {
      "ledger": 0,
      "address": "0x10EB940024913dfCAE95D21E04Ba662cdfB79fF0",
      "private_key": "0x00000000000000000000000000000000000000000000000000000000000000000"
    }
  ],
  "ledger_config": {
    "rpc": "http: //localhost:8545",
    "type": 0,
    "chain": 2
  },
  "chain_data": {
    "instances": [
      "0x10EB940024913dfCAE95D21E04Ba662cdfB79fF0"
    ],
    "token": 382,
    "multisig": "0xf21d8A424e83BBa2588306D1C574FE695AD410b5",
    "staked": false,
    "on_chain_state": 4,
    "user_params": {
      "nft": "bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq",
      "agent_id": 14,
      "threshold": 1,
      "use_staking": false,
      "cost_of_bond": 10000000000000000,
      "olas_cost_of_bond": 10000000000000000000,
      "olas_required_to_stake": 10000000000000000000,
      "fund_requirements": {
        "agent": 0.1,
        "safe": 0.5
      }
    }
  },
  "path": "~/.operate/services/bafybeiha6dxygx2ntgjxhs6zzymgqk3s5biy3ozeqw6zuhr6yxgjlebfmq",
  "service_path": "~/.operate/services/bafybeiha6dxygx2ntgjxhs6zzymgqk3s5biy3ozeqw6zuhr6yxgjlebfmq/trader_omen_gnosis",
  "name": "valory/trader_omen_gnosis"
}
```

</details>

---
#### `PUT /api/services`

Update a service

<details>
  <summary>Request</summary>

```json
{
    "old_service_hash": "bafybeiha6dxygx2ntgjxhs6zzymgqk3s5biy3ozeqw6zuhr6yxgjlebfmq",
    "new_service_hash": "bafybeicxdpkuk5z5zfbkso7v5pywf4v7chxvluyht7dtgalg6dnhl7ejoe",
}
```

</details>

Optionally you can add `deploy` parameter and set it to `true` for a full deployment in a single request.

<details>
  <summary>Response</summary>

```json
{
  "hash": "bafybeicxdpkuk5z5zfbkso7v5pywf4v7chxvluyht7dtgalg6dnhl7ejoe",
  "keys": [
    {
      "ledger": 0,
      "address": "0x10EB940024913dfCAE95D21E04Ba662cdfB79fF0",
      "private_key": "0x00000000000000000000000000000000000000000000000000000000000000000"
    }
  ],
  "ledger_config": {
    "rpc": "http: //localhost:8545",
    "type": 0,
    "chain": 2
  },
  "chain_data": {
    "instances": [
      "0x10EB940024913dfCAE95D21E04Ba662cdfB79fF0"
    ],
    "token": 382,
    "multisig": "0xf21d8A424e83BBa2588306D1C574FE695AD410b5",
    "staked": false,
    "on_chain_state": 4,
    "user_params": {
      "nft": "bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq",
      "agent_id": 14,
      "threshold": 1,
      "use_staking": false,
      "cost_of_bond": 10000000000000000,
      "olas_cost_of_bond": 10000000000000000000,
      "olas_required_to_stake": 10000000000000000000,
      "fund_requirements": {
        "agent": 0.1,
        "safe": 0.5
      }
    }
  },
  "path": "~/.operate/services/bafybeicxdpkuk5z5zfbkso7v5pywf4v7chxvluyht7dtgalg6dnhl7ejoe",
  "service_path": "~/.operate/services/bafybeicxdpkuk5z5zfbkso7v5pywf4v7chxvluyht7dtgalg6dnhl7ejoe/trader_omen_gnosis",
  "name": "valory/trader_omen_gnosis"
}
```

</details>

---
#### `GET /api/services/{service}`

<details>
  <summary>Response</summary>

```json
{
  "hash": "{service}",
  "keys": [
    {
      "ledger": 0,
      "address": "0x10EB940024913dfCAE95D21E04Ba662cdfB79fF0",
      "private_key": "0x00000000000000000000000000000000000000000000000000000000000000000"
    }
  ],
  "ledger_config": {
    "rpc": "http: //localhost:8545",
    "type": 0,
    "chain": 2
  },
  "chain_data": {
    "instances": [
      "0x10EB940024913dfCAE95D21E04Ba662cdfB79fF0"
    ],
    "token": 382,
    "multisig": "0xf21d8A424e83BBa2588306D1C574FE695AD410b5",
    "staked": false,
    "on_chain_state": 4,
    "user_params": {
      "nft": "bafybeig64atqaladigoc3ds4arltdu63wkdrk3gesjfvnfdmz35amv7faq",
      "agent_id": 14,
      "threshold": 1,
      "use_staking": false,
      "cost_of_bond": 10000000000000000,
      "olas_cost_of_bond": 10000000000000000000,
      "olas_required_to_stake": 10000000000000000000,
      "fund_requirements": {
        "agent": 0.1,
        "safe": 0.5
      }
    }
  },
  "path": "~/.operate/services/{service}",
  "service_path": "~/.operate/services/{service}/trader_omen_gnosis",
  "name": "valory/trader_omen_gnosis"
}
```

</details>

---
#### `POST /api/services/{service}/onchain/deploy`

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
#### `POST /api/services/{service}/onchain/stop`

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
#### `GET /api/services/{service}/deployment`

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
#### `POST /api/services/{service}/deployment/build`

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
#### `POST /api/services/{service}/deployment/start`

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
#### `POST /api/services/{service}/deployment/stop`

Stop agent

```json
```

---
#### `POST /api/services/{service}/deployment/delete`

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


