# Change password

You can change the Pearl login password using either the old password or the BIP-39 backup seed phrase.

> [!IMPORTANT]
> We recommend that you backup the `.operate` folder before proceeding. The `.operate` folder contains private keys and other configuration information required by Pearl. The operate folder is located in your home directory:
>
> - macOS: `/Users/YOUR_USERNAME/.operate`
> - Windows: `C:\Users\YOUR_USERNAME\.operate`
> - Linux: `/home/YOUR_USERNAME/.operate`

1. Make sure no agent is running and that Pearl is stopped.
2. Open Pearl and wait until the login screen appears. Do **not** enter the password.
3. Open a terminal window/command prompt:
     - Windows: press `Win` + `r`. In the Run box, type *cmd*, and then click OK.
     - macOS: press `Cmd` + `Space`, type *Terminal*, and press Enter.
     - Linux: press `Ctrl` + `Alt` + `r`.
4. In the terminal window, type the command to change the password and then press Enter:
   1. (Preferred) If you know the old password, use:

        ```bash
        curl.exe -X PUT "http://localhost:8765/api/account" -H "Content-Type: application/json" -d "{\"old_password\": \"YOUR_OLD_PASSWORD\", \"new_password\": \"YOUR_NEW_PASSWORD\"}"
        ```

        Replace `YOUR_OLD_PASSWORD` and `YOUR_NEW_PASSWORD` accordingly in the command above.

   2. If you know the BIP-39 backup seed phrase:

        ```bash
        curl.exe -X PUT "http://localhost:8765/api/account" -H "Content-Type: application/json" -d "{\"mnemonic\": \"YOUR_SEED_PHRASE\", \"new_password\": \"YOUR_NEW_PASSWORD\"}"
        ```

        Replace `YOUR_SEED_PHRASE` by the BIP-39 backup seed phrase (lowercase, space-separated) and `YOUR_NEW_PASSWORD` accordingly in the command above.
5. Close and restart Pearl.
