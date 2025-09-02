# Change Pearl password

You can change the Pearl login password using either the old password or the BIP-39 backup seed phrase.

> [!IMPORTANT]
> We recommend that you back up the `.operate` folder before proceeding. This folder contains private keys and other configuration information required by Pearl. The `.operate` folder is located in your home directory:
>
> - **Windows**: `C:\Users\YOUR_USERNAME\.operate`
> - **macOS**: `/Users/YOUR_USERNAME/.operate`
> - **Linux**: `/home/YOUR_USERNAME/.operate`

Steps to change the password:

1. Make sure no agent is running and that Pearl is stopped.
2. Open Pearl and wait until the login screen appears. Do **not** enter the password.
3. Open a terminal window/command prompt:
   - **Windows**: Press `Win` + `R`, type `cmd`, and press **Enter**.  
   - **macOS**: Press `Cmd` + `Space`, type `Terminal`, and press **Enter**.  
   - **Linux**: Press `Ctrl` + `Alt` + `T`.  
4. In the terminal window, export the path to the `.operate` folder (replace `YOUR_USERNAME` with your actual username):
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

5. In the terminal window, type the command to change the password and then press **Enter**:

   - (Preferred) If you know the old password, use:

       ```bash
        curl -X PUT "https://localhost:8765/api/account" \
        -H "Content-Type: application/json" \
        -d "{\"old_password\": \"YOUR_OLD_PASSWORD\", \"new_password\": \"YOUR_NEW_PASSWORD\"}" \
        --cacert "$OPERATE_HOME/ssl/cert.pem"
       ```

       Replace `YOUR_OLD_PASSWORD` with your current password and `YOUR_NEW_PASSWORD` with your desired password.

   - If you know the BIP-39 backup seed phrase:

       ```bash
        curl -X PUT "https://localhost:8765/api/account" \
        -H "Content-Type: application/json" \
        -d "{\"mnemonic\": \"YOUR_SEED_PHRASE\", \"new_password\": \"YOUR_NEW_PASSWORD\"}" \
        --cacert "$OPERATE_HOME/ssl/cert.pem"
       ```

       Replace `YOUR_SEED_PHRASE` with your **lowercase, space-separated** BIP-39 seed phrase, and `YOUR_NEW_PASSWORD` with your desired password.
6. Close and restart Pearl.
