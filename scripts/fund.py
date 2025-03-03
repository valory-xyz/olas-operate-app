"""Fund an address on gnosis fork."""

import json
import os
import sys
from pathlib import Path

from aea_ledger_ethereum.ethereum import EthereumApi, EthereumCrypto
from dotenv import load_dotenv
from operate.data.contracts import uniswap_v2_erc20


load_dotenv()

RPC = os.environ.get("DEV_RPC", "http://localhost:8545")

OLAS_CONTRACT_ADDRESS_GNOSIS = "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f"


def fund(address: str, amount: float = 10.0) -> None:
    """Fund an address."""
    staking_keys_path = os.environ.get("STAKING_TEST_KEYS_PATH", None)
    ledger_api = EthereumApi(address=RPC)
    crypto = EthereumCrypto("scripts/keys/gnosis.txt")
    tx = ledger_api.get_transfer_transaction(
        sender_address=crypto.address,
        destination_address=address,
        amount=int(amount * 1e18),
        tx_fee=50000,
        tx_nonce="0x",
        chain_id=100,
    )
    stx = crypto.sign_transaction(transaction=tx)
    digest = ledger_api.send_signed_transaction(stx)
    ledger_api.get_transaction_receipt(tx_digest=digest, raise_on_try=True)

    print(f"Transferred: {ledger_api.get_balance(address=address)}")
    if staking_keys_path:
        staking_crypto = EthereumCrypto(staking_keys_path)
        with open(
            Path(
                f"{uniswap_v2_erc20.__path__[0]}",
                "build",
                "IUniswapV2ERC20.json",
            ),
            "r",
            encoding="utf-8",
        ) as abi_file:
            abi = json.load(abi_file)["abi"]

        olas_contract = ledger_api.api.eth.contract(
            address=ledger_api.api.to_checksum_address(OLAS_CONTRACT_ADDRESS_GNOSIS),
            abi=abi,
        )

        tx = olas_contract.functions.transfer(address, int(2e18)).build_transaction(
            {
                "chainId": 100,
                "gas": 100000,
                "gasPrice": ledger_api.api.to_wei("50", "gwei"),
                "nonce": ledger_api.api.eth.get_transaction_count(
                    staking_crypto.address
                ),
            }
        )

        signed_txn = ledger_api.api.eth.account.sign_transaction(
            tx, staking_crypto.private_key
        )
        ledger_api.api.eth.send_raw_transaction(signed_txn.rawTransaction)
        balance = olas_contract.functions.balanceOf(address).call()
        print(f"Balance of {address} = {balance/1e18} OLAS")


if __name__ == "__main__":
    fund(sys.argv[1])
