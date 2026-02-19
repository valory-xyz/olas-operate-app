# **Pearl Account Recovery**

This document describes the supported methods for recovering access to a Pearl account or recovering associated funds. Recovery options depend on the backup method selected at the time of account creation.

Pearl is a **self-custodial application**. Pearl, Valory, and the Autonolas DAO **do not hold user keys, credentials, or recovery data** and cannot restore access on a user’s behalf.

## **Recovery Options Overview**

There are **four supported recovery paths**:

1. Recovery using the account recovery phrase (seed phrase)
2. Recovery using an in-app backup wallet (Google or Apple)
3. Recovery using an external backup wallet

Each method provides a different recovery scope, as described below.

---

## **1. Recovery using your recovery phrase**

If you have retained your **recovery phrase**, you may recover **full access** to your Pearl account, including wallets, agents, and funds.

### **Important**

* This recovery method is **not supported natively within the Pearl application**
* Recovery must be performed manually via a terminal-based process outlined
  [here](https://github.com/valory-xyz/olas-operate-app/blob/main/docs/change_password.md#change-pearl-password)

### **Scope of recovery**

* Full account access
* Ability to set a new account password
* Full control over all associated wallets and agents

### **User responsibility**

* Secure storage of the recovery phrase
* Correct execution of recovery steps
* Any loss resulting from incorrect use of the seed phrase is the user’s sole responsibility

---

## **2. Recovery using an in-app backup wallet (Google or Apple)**

If you created a backup wallet using **Google or Apple**, you may recover your Pearl account directly within the application.

### **Recovery process**

1. Open the Pearl application
2. Select **“Forgot my password”**
3. Follow the in-app recovery steps
4. Set a new password

### **Requirements**

* The backup wallet must be **sufficiently funded on all chains** where active agents operate
* The recovery process should be completed in **a single uninterrupted session**
* Supported only for backup wallets created via:

  * Google
  * Apple

### **Scope of recovery**

* Full Pearl account access
* Restoration of agents and funds

  * Funds available in the address used for gas fees (**MasterEOA**) will **not** be recoverable
* Ability to set a new password

### **User responsibility**

* Link backup wallets to your Pearl wallet across all chains in advance
* Correct execution of recovery steps
* Any loss resulting from incorrect use of the backup wallet is the user’s sole responsibility

---

## **3. Recovery using an external backup wallet**

If you configured an external wallet you control as a backup, you may recover **full access** to your Pearl account.

### **Recovery process**

1. This recovery method is **not supported natively within the Pearl application**
2. Recovery must be performed manually via a terminal-based process outlined
   [here](https://github.com/valory-xyz/olas-operate-app/blob/main/docs/recover_using_backup_wallet.md)

### **Important**

* The backup wallet must be **sufficiently funded on all chains** where active agents operate
* The recovery process should be completed in **a single uninterrupted session**

### **Scope of recovery**

* Full account access
* Ability to set a new password
* Full control over all associated wallets and agents

  * Funds available in the address used for gas fees (**MasterEOA**) will **not** be recoverable

### **User responsibility**

* Link backup wallets to your Pearl wallet across all chains in advance
* Correct execution of recovery steps
* Any loss resulting from incorrect use of the backup wallet is the user’s sole responsibility

