# Withdraw Funds Manually from Agent Safe (Owner = Master Safe)

> [!IMPORTANT]
> This guide is pending review.

This guide explains how to withdraw funds stored in the

- **Agent EOA** and
- **Agent Safe** when its owner is the **Master Safe**.

## Prerequisites

- You have [Metamask](https://metamask.io/) installed in your browser and know how to execute transactions.
- You understand Safe{Wallet}s and have some familiarity with the [Safe webapp](https://app.safe.global/).

> [!IMPORTANT]
> This guide does **not** cover removing external investments (e.g., liquidity pools) made by the agent. Ensure that the agent has withdrawn any such funds to the **Agent Safe** before proceeding.

## Step 1: Withdraw funds from and Agent Safe

In this process you have to connect to **Master Safe** via **Master EOA** and execute a transaction in **Agent Safe**.

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

3. **Import Master EOA or Backup Owner into Metamask.**
   - To interact with the **Master Safe**, use either the **Master EOA** or the **backup owner**:
   - To import the **Master EOA** via BIP-39 seed phrase, create a new browser profile, install Metamask, and select *Import an existing wallet*.

4. **Connect to the Master Safe.** Open a new tab and keep this tab open.
   1. Open the Safe webapp https://app.safe.global/home?safe=gno:MASTER_SAFE_ADDRESS (replace `gno` by the correct chain identifier, e.g., `gno`, `eth`, ..., and replace `MASTER_SAFE_ADDRESS` from Step 2.2).
   2. Press *Connect* &#8594; *Metamask*.
   3. Connect using the **Master EOA** or **backup owner**.
   4. Keep this window open.

5. **Connect to the Agent Safe.** Open a new tab and keep this tab open.
   1. Open the Safe webapp: https://app.safe.global/home?safe=gno:AGENT_SAFE_ADDRESS (replace `gno` by the correct chain identifier, e.g., `gno`, `eth`, ...replace `AGENT_SAFE_ADDRESS` with `multisig` from Step 1.2).
   2. Press *Connect* &#8594; *Wallet Connect*.
   3. Copy the link by pressing the top right icon.
   4. Now go back to the **Master Safe** webapp from Step 4 and press the *Wallet Connect* button ![Wallet Connect](./images/wallet_connect.png). Paste the link and approve the connection.

6. **Transfer funds**
   1. At this point you should be connected to both safes.
   2. Initiate the send transaction at the **Agent Safe**.
   3. After pressing confirm and execute the transaction, you will be prompted to sign it by the **Master Safe**.
   4. This will, in turn, require approval from Metamask on the connected EOA.
   5. Repeat the process for as many tokens you wish to transfer.

## Step 1: Withdraw funds from and Agent EOA

1. **Import the Agent EOA into Metamask.**
   1. Copy the **Agent EOA private key**.
   2. Open Metamask.
   3. Go to *Add account or hardware wallet* &#8594; *Import account*.
   4. Select *Private Key*, paste the key, and press *Import*.
   5. Ensure the **Agent EOA address** is selected and connected to the correct chain.

2. **Withdraw from Agent EOA.** Use Metamask to send funds/tokens to the recipient address.

You must repeat this process for as many chains the agent is in.

> [!IMPORTANT]
> Withdraw from Agent Safe first because transactions require gas fees from the Safe owner. If the Safe owner is drained first, it will be unable to interact with the Agent Safe.
