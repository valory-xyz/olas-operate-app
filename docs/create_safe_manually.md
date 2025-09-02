# Create Safe{Wallet} manually

This guide helps you create manually a Safe{Wallet} through Pearl.

> [!IMPORTANT]
> If you are creating a Safe{Wallet} on chain *A* because you accidentally transferred funds intended for a
> Safe{Wallet} on chain *B*, **you must ensure to use the same backup owner that you originally used to
> create the Safe{Wallet} on chain *B*** (even if changed the backup owner since then).
>
> This is necessary because the Safe{Wallet} address is derived from the original creation parameters, including the backup owner.


> [!IMPORTANT]
> We recommend that you back up the `.operate` folder before proceeding. This folder contains private keys and other configuration information required by Pearl. The `.operate` folder is located in your home directory:
>
> - **Windows**: `C:\Users\YOUR_USERNAME\.operate`
> - **macOS**: `/Users/YOUR_USERNAME/.operate`
> - **Linux**: `/home/YOUR_USERNAME/.operate`

Steps to create a Safe{Wallet}:

1. Make sure no agent is running and that Pearl is stopped.
2. Open Pearl and wait until the login screen appears. Enter your password, but do **not** run any agent.
3. Ensure that your MasterEOA is funded in the target chain.
4. Open a terminal window/command prompt:
   - **Windows**: Press `Win` + `R`, type `cmd`, and press **Enter**.  
   - **macOS**: Press `Cmd` + `Space`, type `Terminal`, and press **Enter**.  
   - **Linux**: Press `Ctrl` + `Alt` + `T`.  
5. In the terminal window, export the path to the `.operate` folder (replace `YOUR_USERNAME` with your actual username):
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

6. In the terminal window, type the command to create a Safe{Wallet} and press **Enter**. Replace `TARGET_CHAIN` by `ethereum`, `gnosis`, etc., and replace `YOUR_BACKUP_OWNER` by your checksummed backup owner address.

    ```bash
    curl -X POST "https://localhost:8765/api/wallet/safe" \
    -H "Content-Type: application/json" \
    -d "{\"chain\": \"TARGET_CHAIN\", \"backup_owner\": \"YOUR_BACKUP_OWNER\", \"initial_funds\": {} }" \
    --cacert "$OPERATE_HOME/ssl/cert.pem"
    ```

     If the execution is successful, you should see the message `Safe created!` in the command's output. Example:

    ```json
    {"create_tx":"0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef","transfer_txs":{},"safe":"0xabcdefabcdefabcdefabcdefabcdefabcdefabcd","message":"Safe created!"}
    ```

7. Close and restart Pearl.

You can now control the created Safe{Wallet} via the backup owner or using the MasterEOA seed phrase.