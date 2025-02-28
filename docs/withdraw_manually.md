# Withdraw Funds Manually

This guide explains how to withdraw funds stored in:

- **Agent Safe**
- **Agent EOA**
- **Master Safe** (includes agent bonds and security deposits)
- **Master EOA**

 ## Prerequisites

- You have [Metamask](https://metamask.io/) installed in your browser and know how to execute transactions.
- You understand Safe{Wallet}s and hasve some familiarity with the [Safe webapp](https://app.safe.global/).

> [!IMPORTANT]
> This guide does **not** cover removing external investments (e.g., liquidity pools) made by the agent. Ensure that the agent has withdrawn any such funds to the **Agent Safe** before proceeding.

## Step 1: Withdraw from Agent EOA and Agent Safe

To withdraw funds, from the Agent EOA and Agent Safe you have to access contents stored in the `.operate` folder:

- **Mac**: `/Users/YOUR_USERNAME/.operate`
- **Windows**: `C:\Users\YOUR_USERNAME\.operate`
- **Linux**: `/users/YOUR_USERNAME/`

1. **Stop Pearl.**

2. **Locate Agent Data.** Open the file `.operate/sc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/config.json` in a text editor. If running multiple services, ensure to select the correct `sc-xxxxxx...` folder. Search for:
   1. `name`: Identifies the agent type (e.g., Trader, Optimus, ...).
   2. `keys`: Contains the **Agent EOA address** and its **private key**.
   3. `multisig`: Contains the **Agent Safe address**.
   4. `token`: Contains the **Ownership NFT ID**.

3. **Import the Agent EOA into Metamask.**
   1. Copy the **Agent EOA private key**.
   2. Open Metamask.
   3. Go to *Add account or hardware wallet* → *Import account*.
   4. Select *Private Key*, paste the key, and press *Import*.
   5. Ensure the **Agent EOA address** is selected and connected to the correct chain.

4. **Withdraw from Agent Safe**
   1. Open the Safe webapp: https://app.safe.global/home?safe=gno:AGENT_SAFE_ADDRESS (replace `AGENT_SAFE_ADDRESS`).
   2. Press *Connect* → *Metamask*.
   3. Go to *Home* → *Send*.
   4. Select the recipient, token, and amount. Follow instructions to **create** and **execute** the transaction.
   5. Repeat for all tokens you wish to transfer.

5. **Withdraw from Agent EOA.** Use Metamask to send funds/tokens to the recipient address.

> [!IMPORTANT]
> Withdraw from Agent Safe first because transactions require gas fees from the Agent EOA. If the Agent EOA is drained first, it will be unable to interact with the Agent Safe.

## Step 2: Terminate On-Chain Service

> [!IMPORTANT]
> You can terminate the service **only after** the minimum staking period (typically 3 days).

1. **Open the Olas Registry page of the agent.**
   1. Open a tab.
   2. Navigate to: https://registry.olas.network/gnosis/services/OWNERSHIP_NFT_ID (replace `OWNERSHIP_NFT_ID` from Step 1.2).
   3. Locate Master Safe address under *Operators*.

2. **Import Master EOA or Backup Owner into Metamask.**
   - To interact with the **Master Safe**, use either the **Master EOA** or the **backup owner**:
   - To import the **Master EOA** via BIP-39 seed phrase, create a new browser profile, install Metamask, and select *Import an existing wallet*.

3. **Connect to the Master Safe.**
   1. Open a new tab.
   2. Open the Safe webapp https://app.safe.global/home?safe=gno:MASTER_SAFE_ADDRESS (replace `MASTER_SAFE_ADDRESS`).
   3. Connect using the **Master EOA** or **backup owner**.
   4. Keep this tab open.

> [!NOTE]
> If the service is in *Pre-Registration* on the Olas Registry, skip to Step 3.

4. **Connect the Master Safe to Olas Registry.**
   - Otherwise, press *Connect* (top right) → *Wallet Connect* → Copy the link.
   - In the Safe webapp, press the *Wallet Connect* button ![Wallet Connect](./images/wallet_connect.png) and paste the link.
   - Approve the connection.

5. **Terminate & Unbond Service.**
   1. In the Olas Registry, press *Terminate* service. This transaction will be transferred to the Safe webapp.
   2. In the Safe webapp, **approve** and **execute** the transaction.
   3. If required, return to the Olas Registry, press *Unbond* and execute similarly.
   4. The service should now be in *Pre-Registration*, with funds transferred to the Master Safe, including bonds and security deposits.

## Step 3: Withdraw from Master EOA and Master Safe

1. **Import Master EOA or backup owner into Metamask.** Follow Step 2.2.

2. **Withdraw from Master Safe.**
   1. Open the Safe webapp: https://app.safe.global/home?safe=gno:MASTER_SAFE_ADDRESS (replace `MASTER_SAFE_ADDRESS`)..
   2. Press *Connect* → *Metamask*.
   3. Go to *Home* → *Send*.
   4. Select the recipient, token, and amount. Follow instructions to **create** and **execute** the transaction.
   5. Repeat as needed for all tokens.

3. **Withdraw from Master EOA.** Use Metamask to send funds/tokens to your recipient address.

> [!IMPORTANT]
> Withdraw from Master Safe first because transactions require gas fees from the Master EOA. If the Master EOA is drained first, it will be unable to interact with the Master Safe.
