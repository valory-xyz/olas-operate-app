from pathlib import Path
import json
from tempfile import NamedTemporaryFile, TemporaryFile
from time import sleep
import typing as t

from aea_ledger_ethereum import EthereumCrypto
from operate.ledger import get_default_rpc
from operate.ledger.profiles import CONTRACTS, OLAS, USDC
from operate.operate_types import Chain, ContractAddresses, LedgerType
from aea.crypto.registries import make_ledger_api

from autonomy.chain.config import ChainType as ChainProfile
from autonomy.chain.tx import TxSettler

from operate.constants import (
    ON_CHAIN_INTERACT_RETRIES,
    ON_CHAIN_INTERACT_SLEEP,
    ON_CHAIN_INTERACT_TIMEOUT,
)

WEI_MULTIPLIER = 1e18

from autonomy.chain.tx import TxSettler

local_rpc = "http://localhost:8545"
def send(chain, crypto, to, amount):
    rpc_address = local_rpc
    ledger_api = make_ledger_api(
        chain.ledger_type.lower(),
        address=rpc_address,
        chain_id=chain.id,
    )
    tx_helper = TxSettler(
        ledger_api=ledger_api,
        crypto=crypto,
        chain_type=ChainProfile.CUSTOM,
        timeout=ON_CHAIN_INTERACT_TIMEOUT,
        retries=ON_CHAIN_INTERACT_RETRIES,
        sleep=ON_CHAIN_INTERACT_SLEEP,
    )

    def _build_tx(  # pylint: disable=unused-argument
        *args: t.Any, **kwargs: t.Any
    ) -> t.Dict:
        """Build transaction"""
        max_priority_fee_per_gas = None
        max_fee_per_gas = None
        tx = ledger_api.get_transfer_transaction(
            sender_address=crypto.address,
            destination_address=to,
            amount=amount,
            tx_fee=50000,
            tx_nonce="0x",
            chain_id=chain.id,
            raise_on_try=True,
            max_fee_per_gas=int(max_fee_per_gas) if max_fee_per_gas else None,
            max_priority_fee_per_gas=(
                int(max_priority_fee_per_gas) if max_priority_fee_per_gas else None
            ),
        )
        return ledger_api.update_with_gas_estimate(
            transaction=tx,
            raise_on_try=True,
        )

    setattr(tx_helper, "build", _build_tx)  # noqa: B010
    tx_helper.transact(lambda x: x, "", kwargs={})


def send_olas(chain, crypto, to, amount):
    rpc_address = local_rpc
    ledger_api = make_ledger_api(
        chain.ledger_type.lower(),
        address=rpc_address,
        chain_id=chain.id,
    )
    olas_contract = ledger_api.api.eth.contract(
        address=ledger_api.api.to_checksum_address(OLAS[Chain.GNOSIS]),
        abi=json.loads(
            Path(
                Path(__file__).parent.parent,
                "operate",
                "data",
                "contracts",
                "uniswap_v2_erc20",
                "build",
                "IUniswapV2ERC20.json",
            ).read_text(encoding="utf-8")
        ).get("abi"),
    )
    tx = olas_contract.functions.transfer(
        to, int(amount * WEI_MULTIPLIER)
    ).build_transaction(
        {
            "chainId": chain.id,
            "gas": 100000,
            "gasPrice": ledger_api.api.to_wei("50", "gwei"),
            "nonce": ledger_api.api.eth.get_transaction_count(crypto.address),
        }
    )

    signed_txn = ledger_api.api.eth.account.sign_transaction(tx, crypto.private_key)
    ledger_api.api.eth.send_raw_transaction(signed_txn.rawTransaction)

