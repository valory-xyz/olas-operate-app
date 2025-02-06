"""
Script for transferring OLAS

Usage:
    python transfer_olas.py PATH_TO_KEY_CONTAINING_OLAS ADDRESS_TO_TRANSFER AMOUNT

Example:
    python transfer_olas.py keys/gnosis.txt 0xce11e14225575945b8e6dc0d4f2dd4c570f79d9f 2
"""

import json
import os
import sys
from pathlib import Path

from aea_ledger_ethereum.ethereum import EthereumApi, EthereumCrypto
from operate.data.contracts import uniswap_v2_erc20


RPC = os.environ.get("DEV_RPC", "http://localhost:8545")
OLAS_CONTRACT_ADDRESS_GNOSIS = "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f"
WEI_MULTIPLIER = 1e18


def fund(wallet: str, address: str, amount: float = 20.0) -> None:
    """Fund wallet with OLAS token"""
    staking_wallet = EthereumCrypto(wallet)
    ledger_api = EthereumApi(address=RPC)
    olas_contract = ledger_api.api.eth.contract(
        address=ledger_api.api.to_checksum_address(OLAS_CONTRACT_ADDRESS_GNOSIS),
        abi=json.loads(
            Path(
                f"{uniswap_v2_erc20.__path__[0]}",
                "build",
                "IUniswapV2ERC20.json",
            ).read_text(encoding="utf-8")
        ).get("abi"),
    )
    print(
        f"Balance of {address} = {olas_contract.functions.balanceOf(address).call()/1e18} OLAS"
    )
    print(f"Transferring {amount} OLAS from {staking_wallet.address} to {address}")

    tx = olas_contract.functions.transfer(
        address, int(amount * WEI_MULTIPLIER)
    ).build_transaction(
        {
            "chainId": 100,
            "gas": 100000,
            "gasPrice": ledger_api.api.to_wei("50", "gwei"),
            "nonce": ledger_api.api.eth.get_transaction_count(staking_wallet.address),
        }
    )

    signed_txn = ledger_api.api.eth.account.sign_transaction(
        tx, staking_wallet.private_key
    )
    ledger_api.api.eth.send_raw_transaction(signed_txn.rawTransaction)
    print(
        f"Balance of {address} = {olas_contract.functions.balanceOf(address).call()/1e18} OLAS"
    )


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 2:
        fund(wallet=args[0], address=args[1])
        sys.exit()

    if len(args) == 3:
        fund(wallet=args[0], address=args[1], amount=float(args[2]))
        sys.exit()

    print(
        """Script for transferring OLAS

Usage:
    python transfer_olas.py PATH_TO_KEY_CONTAINING_OLAS ADDRESS_TO_TRANSFER AMOUNT

Example:
    python transfer_olas.py keys/gnosis.txt 0xce11e14225575945b8e6dc0d4f2dd4c570f79d9f 2"""
    )
