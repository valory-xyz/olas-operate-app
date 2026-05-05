# Recover Pearl using the backup owner (external backup wallet)

Recovering Pearl using a **backup owner** allows you to regain access when you have lost your password and mnemonic seed phrase.

This process will:

- Generate a new MasterEOA and new AgentEOAs

- Require you to set a new Pearl login password.

- Replace the current MasterEOA in all MasterSafes using the configured backup owner

A copy of the old encrypted files (MasterEOA and AgentEOAs) will remain in the .operate folder. However, you will need the old password to access them.

> [!IMPORTANT]
> We recommend that you back up the `.operate` folder before proceeding. This folder contains private keys and other configuration information required by Pearl. The `.operate` folder is located in your home directory:
>
> - **Windows**: `C:\Users\YOUR_USERNAME\.operate`
> - **macOS**: `/Users/YOUR_USERNAME/.operate`
> - **Linux**: `/home/YOUR_USERNAME/.operate`

Steps to recover Pearl using the backup owner:

1. Open Pearl and wait until the login screen appears. **Do not enter your password.**

2. Open a terminal window/command prompt:
   - **Windows**: Press `Win` + `R`, type `cmd`, and press **Enter**.  
   - **macOS**: Press `Cmd` + `Space`, type `Terminal`, and press **Enter**.  
   - **Linux**: Press `Ctrl` + `Alt` + `T`.  

3. In the terminal window, export the path to the `.operate` folder (replace `YOUR_USERNAME` with your actual username):
   - **Windows**:

      ```bash
      set OPERATE_HOME=C:\Users\YOUR_USERNAME\.operate
      ```

   - **macOS**:

      ```bash
      export OPERATE_HOME=/Users/YOUR_USERNAME/.operate
      ```

   - **Linux**:

      ```bash
      export OPERATE_HOME=/home/YOUR_USERNAME/.operate
      ```

4. In the terminal window, type the command to prepare a new MasterEOA and set up a new password, and then press **Enter**:

    ```bash
    curl -X POST "https://localhost:8765/api/wallet/recovery/prepare" \
    -H "Content-Type: application/json" \
    -d "{\"new_password\": \"YOUR_NEW_PASSWORD\"}" \
    --cacert "$OPERATE_HOME/ssl/cert.pem"
    ```

    Replace `YOUR_NEW_PASSWORD` with your desired password.

> [!WARNING]
> Do not call the `/api/wallet/recovery/prepare` endpoint more than once.
> Each call generates a new recovery bundle and invalidates the previous one.

5. In the terminal window, type the command to display the recovery information and then press **Enter**:

    ```bash
     curl -X GET "https://localhost:8765/api/wallet/recovery/status" \
    --cacert "$OPERATE_HOME/ssl/cert.pem" | python -m json.tool    
    ```

    or

    ```bash
     curl -X GET "https://localhost:8765/api/wallet/recovery/status" \
    --cacert "$OPERATE_HOME/ssl/cert.pem" | python3 -m json.tool    
    ```

    The output will be a JSON structure describing:

    - The current MasterEOA

    - The new MasterEOA

    - All Safe{Wallet}s that must be updated

    Pay special attention to the `safes` section. For each Safe{Wallet}, note:

    - the Safe{Wallet} address,
  
    - `owner_to_remove` (old MasterEOA address),

    - `owner_to_add` (new MasterEOA address),

    - `backup_owners` (your backup owner address).

    Also, you should note the field `"status": "PREPARED",`, meaning that a recovery bundle has been correctly initialized.

    For example:

    ```json
    {
        "id": "eb-12345678-1234-1234-1234-123456789012",
        "wallets": [
            {
                "current_wallet": {
                    "address": "0x1111111111111111111111111111111111111111",
                    "safes": {
                        "gnosis": {
                            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa": {
                                "owners": [
                                    "0x1111111111111111111111111111111111111111",
                                    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
                                ],
                                "backup_owners": [
                                    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
                                ],
                                "owner_to_remove": "0x1111111111111111111111111111111111111111",
                                "owner_to_add": "0x2222222222222222222222222222222222222222"
                            }
                        }
                    },
                    "safe_chains": [
                        "gnosis"
                    ],
                    "ledger_type": "ethereum",
                    "safe_nonce": 12345678901234567890123456789012345678901234567890123456789012345678901234567
                },
                "new_wallet": {
                    "address": "0x2222222222222222222222222222222222222222",
                    "safes": {},
                    "safe_chains": [],
                    "ledger_type": "ethereum",
                    "safe_nonce": null
                },
                "new_mnemonic": null
            }
        ],
        "status": "PREPARED",
        "all_safes_have_backup_owner": true,
        "consistent_backup_owner": true,
        "consistent_backup_owner_count": true,
        "prepared": true,
        "has_swaps": false,
        "has_pending_swaps": true,
        "num_safes": 1,
        "num_safes_with_new_wallet": 0,
        "num_safes_with_old_wallet": 1,
        "num_safes_with_both_wallets": 0
    }
    ```

6. For each Safe{Wallet} that you have, you must use your **backup owner** to swap `owner_to_remove` (old MasterEOA), by `owner_to_add` (New MasterEOA). In the example above, there is only one Safe{Wallet} on Gnosis chain (`0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`) and the user must use their backup owner (`0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`) to replace the old MasterEOA (`0x1111111111111111111111111111111111111111`) by the new MasterEOA (`0x2222222222222222222222222222222222222222`). Follow these steps:

   1. Make sure you have set up a crypto wallet that controls your backup owner (e.g. MetaMask).
   2. Open the Safe{Wallet} web app [https://app.safe.global/welcome/accounts](https://app.safe.global/welcome/accounts), click `Add`, select the appropriate network and paste the Safe{Wallet} address.
   3. Click on the Safe{Wallet} you have added. This will take you to the Safe{Wallet} home.
   4. Click `Connect` and approve the connection to your backup owner crypto wallet.
   5. Go to `Settings` -> `Setup` -> `Members`.
   6. Find the old MasterEOA and click `Replace signer`.
   7. Enter the address of the new MasterEOA.
   8. Repeat for every chain shown in `safes` in step 5. Each chain listed there is associated with one Safe{Wallet}.

7. In the terminal window, type the command to display the recovery information again, and then press **Enter**:

    ```bash
     curl -X GET "https://localhost:8765/api/wallet/recovery/status" \
    --cacert "$OPERATE_HOME/ssl/cert.pem" | python -m json.tool    
    ```

    or

    ```bash
     curl -X GET "https://localhost:8765/api/wallet/recovery/status" \
    --cacert "$OPERATE_HOME/ssl/cert.pem" | python3 -m json.tool    
    ```

    If you have swapped all the Safe{Wallet}s, you should see in the output JSON `status": "COMPLETED"`.

> [!WARNING]
> If the status is `PREPARED` or `IN_PROGRESS`, some Safe{Wallet}s still need their owners updated.
> Please, review the status output to identify which ones are pending and refer to step 6 to finish all the swaps.

8. In the terminal window, type the command to complete the recovery process and then press **Enter**:

    ```bash
    curl -X POST "https://localhost:8000/api/wallet/recovery/complete" \
    -H "Content-Type: application/json" \
    -d "{\"require_consistent_owners\": true}" \
    --cacert "$OPERATE_HOME/ssl/cert.pem"
    ```

9. Close and restart Pearl. Log in using the **new password** set in step 4.

After successfully finishing the process, your MasterSafe(s) will now be controlled by the new MasterEOA (and your backup owner), and
new AgentEOAs will be created for your agents. Note that upon restarting, Pearl might require that you fund the MasterEOA and AgentEOAs, since they are new wallets.
