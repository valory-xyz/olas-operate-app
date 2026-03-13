# Test findings

## Bugs to fix later

### `TransferCryptoOn` includes zero-amount tokens in the transfer summary

- File: `frontend/components/PearlDeposit/SelectPaymentMethod/TransferCryptoOn.tsx`
- Problem: `tokenAndDepositedAmounts` maps every entry from `amountsToDeposit` without filtering out zero values.
- Impact: the transfer screen can show tokens that the user did not actually choose to deposit, which is inconsistent with the bridge and on-ramp flows that already filter out zero-amount tokens.
- Suggested fix: filter `amountsToDeposit` to `amount > 0` before building `tokensToDeposit`.

---

# Phase 9 test findings

## Quirks (not bugs — intentional or benign)

### `PolygonBeta3` display name is `'Polygon Alpha III'` (on-chain metadata typo)

- File: `frontend/config/stakingPrograms/polygon.ts`
- The staking program ID is correctly `polygon_beta_3` (matches the middleware registry).
- The `name` field reads `'Polygon Alpha III'` which is a typo that originated in the on-chain contract metadata and has been preserved in the frontend to match the on-chain value.
- This is **not a bug** — it is a known quirk. The test documents it explicitly so future maintainers don't "fix" the name and break the on-chain match.

### `OptimusAlpha` on Mode supports `AgentMap.Modius`, not `AgentMap.Optimus`

- File: `frontend/config/stakingPrograms/mode.ts`
- Despite its name, `OptimusAlpha` is a Mode-chain staking program that was originally deployed for the Modius agent.
- The dedicated Optimus programs (`OptimusAlpha2`, `OptimusAlpha3`, `OptimusAlpha4`) live on the **Optimism** chain.
- The test documents this explicitly to prevent confusion when reading the config.
