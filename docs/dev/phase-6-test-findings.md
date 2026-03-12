# Phase 6 test findings

## Bugs to fix later

### `TransferCryptoOn` includes zero-amount tokens in the transfer summary

- File: `frontend/components/PearlDeposit/SelectPaymentMethod/TransferCryptoOn.tsx`
- Problem: `tokenAndDepositedAmounts` maps every entry from `amountsToDeposit` without filtering out zero values.
- Impact: the transfer screen can show tokens that the user did not actually choose to deposit, which is inconsistent with the bridge and on-ramp flows that already filter out zero-amount tokens.
- Suggested fix: filter `amountsToDeposit` to `amount > 0` before building `tokensToDeposit`.
