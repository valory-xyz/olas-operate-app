# Withdraw funds manually

This guide will help you to withdraw the funds currently stored in your

* Agent Safe
* Agent EOA
* Master Safe (including agent bonds and security deposits)
* Master EOA

This guide assumes that:

* The user has some familiarity executing transactions with [Metamask](https://metamask.io/), and the extension installed in their browser.
* The user knows what is a Safe Wallet and has some familiarity with the [Safe webapp](https://app.safe.global/).

> [!IMPORTANT]
> This guide does not cover the removal of any external activity that your agent has participated in (e.g., investments in liquidity pools). Ensure that your agent has withdrawn any such funds before proceeding.

## Step 1: Withdraw funds from the Agent EOA and Agent Safe

To withdraw funds from the agent you need the private keys, which are stored in the `.operate` folder in your home directory, for example:

* `/Users/your_username/.operate` (Mac)
* `C:\Users\your_username\.operate` (Windows)

1. **Stop Pearl.**

2. **Identify your agent data.** Open the file `.operate/sc-01234567-0123-0123-0123-012345678901/config.json` with a text editor. If you are running multiple services, each service has its own `sc-...` folder. Make sure to access the correct folder.
    * Within the `config.json` file, browse for the word `name`. This will help you identify if it's the correct agent.
    * Browse for the word `keys`. This contains the **Agent EOA address** and its corresponding **private key**.
    * Browse for the work `multisig`. This contains the **Agent Safe address**.
    * Finally, browse for the word `token`. This contains your **Ownership NFT ID**.

3. **Import the Agent EOA to Metamask.**
    * Copy the Agent EOA private key from the previous step.
    * Open Metamask in your browser.
    * Import the private key as follows: press on the dropdown menu in the address &#8594; *Add account or hardware wallet* &#8594; Import account. Set *Private Key* type, and paste the private key on the textbox below. Next, press *Import*.
    * Ensure that the the Agent EOA address is selected on Metamask and that you are connected to the correct chain.

4. **Withdraw the Agent Safe.**
    * Open the Safe webapp of your Agent Safe. For example, for the Gnosis chain: https://app.safe.global/home?safe=gno:AGENT_SAFE_ADDRESS (replace AGENT_SAFE_ADDRESS accordingly).
    * Press *Connect* and select *Metamask*.
    * Once connected to the Safe webapp, go to *Home* and press *Send*. Select the recipient address, the token and the amount to transfer. Follow the instructions to **create** and **execute** the transaction.
    * Repeat the previous step for as many tokens as you want to transfer.

5. **Withdraw the Agent EOA.** Use Metamask to send the tokens held to your chosen recipient address. Note that once your Agent EOA is drained, you will need to send funds to interact with the Agent Safe again. For this reason, we recommend draining your Agent Safe first.

## Step 2: Terminate the on-chain service

This step will terminate the on-chain service and recover any bonds and security deposit made on the staking contract.

> [!IMPORTANT]
> You can only terminate your service after it has been staked for the minimum staking period established by the staking contract (typycally 3 days).

1. **Import the Master EOA or backup owner to Metamask.** The Master EOA or the backup owner are the signers of the Master Safe. You can use either to interact with the Master Safe.
   * To import the Master EOA with the BIP-39 seed phrase you have to create a new browser profile and add the Metamask extension.
   * Press *Import an existing wallet* (**not** *Create a new wallet*) and provide the seed phrase.

2. **Connect to the Master Safe.**
    * Open the Safe webapp of your Master Safe. For example, for the Gnosis chain: https://app.safe.global/home?safe=gno:MASTER_SAFE_ADDRESS (replace MASTER_SAFE_ADDRESS accordingly).
    * Connect to the Master Safe using the Master EOA (or backup wallet).
    * Keep this page opened on a tab.

3. **Connect to the Olas Registry page of your agent.**
   * Open a separate tab on your browser.
   * Open the Olas Registry page of your agent. For example, for the gnosis chain: https://registry.olas.network/gnosis/services/OWNERSHIP_NFT_ID. (replace OWNERSHIP_NFT_ID by the `token` from Step 1.2).
   * You can find your Master Safe address under *Operators*.

4. **Connect the Master Safe to the Olas Registry.**
   * If your service is on *Pre-Registration*, you can skip to Step 6 below.
   * Otherwise, on the top right corner, press *Connect*, and select *Wallet Connect*. Copy the link.
   * Go to the Safe webapp of your Master Safe from Step 2 above and press the *Wallet Connect* button ![alt text](image-2.png) on the top bar.
   * Paste the *Wallet Connect* link and press *Approve*.
   * At this point, you are connected to the Olas Registry through your Master Safe.
  
5. **Terminate and unbond the service.**
   * Go to the Olas Registry page from Step 3 above.
   * Press *Terminate* service.
   * Go to the Safe webapp of the Master Safe and **approve** and **execute** the transaction.
   * If required, *Unbond* the service similarly.
   * At this point, your service should be in *Pre-registration* state, and your bonds and security deposit transferred to the Master Safe.
  
## Step 3: Withdraw funds from the Master EOA and the Master Safe

1. **Import the Master EOA or backup owner to Metamask.** Follow Step 2.1 from the section above.

2. **Withdraw the Master Safe.**
    * Open the Safe webapp of your Master Safe. For example, for the Gnosis chain: https://app.safe.global/home?safe=gno:MASTER_SAFE_ADDRESS (replace MASTER_SAFE_ADDRESS accordingly).
    * Press *Connect* and select *Metamask*.
    * Once connected to the Safe webapp, go to *Home* and press *Send*. Select the recipient address, the token and the amount to transfer. Follow the instructions to **create** and **execute** the transaction.
    * Repeat the previous step for as many tokens as you want to transfer.

3. **Withdraw the Master EOA.** Use Metamask to send the tokens held on the Master EOA to your chosen recipient address. Note that once your Master EOA is drained, you will need to send funds to interact with the Master Safe again. For this reason, we recommend draining your Master Safe first.
