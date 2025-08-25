# Withdraw Funds Manually

This guide explains how to withdraw funds stored in:

- **Agent Safe**
- **Agent EOA**
- **Master Safe** (includes agent bonds and security deposits)
- **Master EOA**

## Prerequisites

- You have [Metamask](https://metamask.io/) installed in your browser and know how to execute transactions.
- You understand Safe{Wallet}s and have some familiarity with the [Safe webapp](https://app.safe.global/).

> [!IMPORTANT]
> This guide does **not** cover removing external investments (e.g., liquidity pools) made by the agent. Ensure that the agent has withdrawn any such funds to the **Agent Safe** before proceeding.

## Step 1: Withdraw from Agent EOA and Agent Safe

To withdraw funds from the Agent EOA and Agent Safe you have to access contents stored in the `.operate` folder:

- **Mac**: `/Users/YOUR_USERNAME/.operate`
- **Windows**: `C:\Users\YOUR_USERNAME\.operate`
- **Linux**: `/users/YOUR_USERNAME/.operate`

1. **Stop Pearl.**

2. **Locate Agent Data.** Open the file `.operate/sc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/config.json` in a text editor. If running multiple agents, ensure to select the correct `sc-xxxxxx...` folder. Search and note down the following values from the `config.json` file, which will be required in the next steps:
   1. `name`: Identifies the agent type (e.g., Trader, Optimus, ...).
   2. `keys`: Contains the **Agent EOA address** and its **private key**.
   3. `multisig`: Contains the **Agent Safe address**.
   4. `token`: Contains the **Ownership NFT ID**.

3. **Import the Agent EOA into Metamask.**
   1. Copy the **Agent EOA private key**.
   2. Open Metamask.
   3. Go to *Add account or hardware wallet* &#8594; *Import account*.
   4. Select *Private Key*, paste the key, and press *Import*.
   5. Ensure the **Agent EOA address** is selected and connected to the correct chain.

4. **Withdraw from Agent Safe**
   1. Open the Safe webapp: https://app.safe.global/home?safe=gno:AGENT_SAFE_ADDRESS (replace `gno` by the correct chain identifier, e.g., `gno`, `eth`, ...replace `AGENT_SAFE_ADDRESS` with `multisig` from Step 1.2).
   2. Press *Connect* &#8594; *Metamask*.
   3. Go to *Home* &#8594; *Send*.
   4. Select the recipient, token, and amount. Follow instructions to **create** and **execute** the transaction.
   5. Repeat for all tokens you wish to transfer.

5. **Withdraw from Agent EOA.** Use Metamask to send funds/tokens to the recipient address.

You must repeat this process for as many chains the agent is in.

> [!IMPORTANT]
> Withdraw from Agent Safe first because transactions require gas fees from the Agent EOA. If the Agent EOA is drained first, it will be unable to interact with the Agent Safe.

## Step 2: Terminate On-Chain Service

1. **Stop Pearl.**

2. **Locate data in the Olas Marketplace page of the agent.**
   1. Navigate to: https://marketplace.olas.network/gnosis/ai-agents/OWNERSHIP_NFT_ID (replace `gnosis` by the correct chain, e.g., `gnosis`, `ethereum`, ..., and replace `OWNERSHIP_NFT_ID` from Step 1.2).
   2. Locate **Master Safe address** under *Operators*.
   3. Locate **Staking contract address** under *Owner address*. If this address matches the **Master Safe address**, your service is not staked.

3. **Import Master EOA or Backup Owner into Metamask.**
   - To interact with the **Master Safe**, use either the **Master EOA** or the **backup owner**:
   - To import the **Master EOA** via BIP-39 seed phrase, create a new browser profile, install Metamask, and select *Import an existing wallet*.

4. **Connect to the Master Safe.** Open a new tab and keep this tab open.
   1. Open the Safe webapp https://app.safe.global/home?safe=gno:MASTER_SAFE_ADDRESS (replace `gno` by the correct chain identifier, e.g., `gno`, `eth`, ..., and replace `MASTER_SAFE_ADDRESS` from Step 2.2).
   2. Connect using the **Master EOA** or **backup owner**.

5. **Unstake Service.** If your service is not staked, you can skip this step.  You can unstake the service **only after** the minimum staking period (typically 3 days).
   1. Open the staking contract Blockscout interface: https://gnosis.blockscout.com/address/STAKING_CONTRACT_ADDRESS?tab=write_proxy (replace `STAKING_CONTRACT_ADDRESS` from Step 2.2).
   2. Press *Login* (top right) &#8594; *Continue with Web3 wallet* &#8594; *Wallet Connect* &#8594; Copy the link.
   3. On the Safe webapp, press the *Wallet Connect* button ![Wallet Connect](./images/wallet_connect.png) and paste the link and approve the connection.
   4. On the staking contract Blockscout interface scroll down to method *41. Unstake*. Enter your Ownership NFT ID and press *Write*. This transaction will be transferred to the Safe webapp.
   5. On the Safe webapp, **approve** and **execute** the transaction.

6. **Terminate and Unbond Service.** Make sure the service is unstaked before proceeding in this step. If the service is in *Pre-Registration* on the Olas Marketplace, you can skip this step.
   1. Open the Olas Marketplace page: https://marketplace.olas.network/gnosis/ai-agents/OWNERSHIP_NFT_ID (replace `gnosis` by the correct chain, e.g., `gnosis`, `ethereum`, ..., and replace `OWNERSHIP_NFT_ID` from Step 1.2).
   2. Press *Connect* (top right) &#8594; *Wallet Connect* &#8594; Copy the link.
   3. On the Safe webapp, press the *Wallet Connect* button ![Wallet Connect](./images/wallet_connect.png) and paste the link and approve the connection.
   4. On the Olas Marketplace, press *Terminate*. This transaction will be transferred to the Safe webapp.
   5. On the Safe webapp, **approve** and **execute** the transaction.
   6. If required, return to the Olas Registry, press *Unbond* and execute similarly.
   7. The service should now be in *Pre-Registration*, with funds transferred to the Master Safe, including bonds and security deposits.

You must repeat this process for as many chains the agent is in.

## Step 3: Withdraw from Master EOA and Master Safe

1. **Stop Pearl.**

2. **Import Master EOA or backup owner into Metamask.** Follow Step 2.2.

3. **Withdraw from Master Safe.**
   1. Open the Safe webapp: https://app.safe.global/home?safe=gno:MASTER_SAFE_ADDRESS (replace `gno` by the correct chain identifier, e.g., `gno`, `eth`, ..., and replace `MASTER_SAFE_ADDRESS` from Step 2.2)..
   2. Press *Connect* &#8594; *Metamask*.
   3. Go to *Home* &#8594; *Send*.
   4. Select the recipient, token, and amount. Follow instructions on the Safe webapp to **create** and **execute** the transaction.
   5. Repeat as needed for all tokens.

4. **Withdraw from Master EOA.** Use Metamask to send funds/tokens to your recipient address.

You must repeat this process for as many chains the agent is in.

> [!IMPORTANT]
> Withdraw from Master Safe first because transactions require gas fees from the Master EOA. If the Master EOA is drained first, it will be unable to interact with the Master Safe.
