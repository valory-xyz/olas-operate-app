# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2023 Valory AG
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
#
# ------------------------------------------------------------------------------

"""Ledger helpers."""

import os
import typing as t

from operate.ledger.base import LedgerHelper
from operate.ledger.ethereum import Ethereum
from operate.ledger.solana import Solana
from operate.operate_types import Chain, LedgerType


ETHEREUM_PUBLIC_RPC = os.environ.get("ETHEREUM_RPC", "https://ethereum.publicnode.com")
GNOSIS_PUBLIC_RPC = os.environ.get("GNOSIS_RPC", "https://gnosis-rpc.publicnode.com")
GOERLI_PUBLIC_RPC = os.environ.get(
    "GOERLI_RPC", "https://ethereum-goerli.publicnode.com"
)
SOLANA_PUBLIC_RPC = os.environ.get("SOLANA_RPC", "https://api.mainnet-beta.solana.com")
BASE_PUBLIC_RPC = os.environ.get("BASE_RPC", "https://mainnet.base.org")
CELO_PUBLIC_RPC = os.environ.get("CELO_RPC", "https://forno.celo.org")
OPTIMISM_PUBLIC_RPC = os.environ.get("OPTIMISM_RPC", "https://mainnet.optimism.io")
MODE_PUBLIC_RPC = os.environ.get("MODE_RPC", "https://rpc.mode.network")

ETHEREUM_RPC = os.environ.get("ETHEREUM_RPC", "https://ethereum.publicnode.com")
GNOSIS_RPC = os.environ.get("GNOSIS_RPC", "https://rpc-gate.autonolas.tech/gnosis-rpc/")
GOERLI_RPC = os.environ.get("GOERLI_RPC", "https://ethereum-goerli.publicnode.com")
SOLANA_RPC = os.environ.get("SOLANA_RPC", "https://api.mainnet-beta.solana.com")
BASE_RPC = os.environ.get("BASE_RPC", "https://mainnet.base.org")
CELO_RPC = os.environ.get("CELO_RPC", "https://forno.celo.org")
OPTIMISM_RPC = os.environ.get("OPTIMISM_RPC", "https://mainnet.optimism.io")
MODE_RPC = os.environ.get("MODE_RPC", "https://rpc.mode.network")

PUBLIC_RPCS = {
    Chain.ETHEREUM: ETHEREUM_PUBLIC_RPC,
    Chain.GNOSIS: GNOSIS_PUBLIC_RPC,
    Chain.GOERLI: GOERLI_PUBLIC_RPC,
    Chain.SOLANA: SOLANA_PUBLIC_RPC,
    Chain.BASE: BASE_PUBLIC_RPC,
    Chain.CELO: CELO_PUBLIC_RPC,
    Chain.OPTIMISTIC: OPTIMISM_PUBLIC_RPC,
    Chain.MODE: MODE_PUBLIC_RPC,
}

DEFAULT_RPCS = {
    Chain.ETHEREUM: ETHEREUM_RPC,
    Chain.GNOSIS: GNOSIS_RPC,
    Chain.GOERLI: GOERLI_RPC,
    Chain.SOLANA: SOLANA_RPC,
    Chain.BASE: BASE_RPC,
    Chain.CELO: CELO_RPC,
    Chain.OPTIMISTIC: OPTIMISM_RPC,
    Chain.MODE: MODE_RPC,
}

CHAIN_HELPERS: t.Dict[Chain, t.Type[LedgerHelper]] = {
    Chain.ETHEREUM: Ethereum,
    Chain.GNOSIS: Ethereum,
    Chain.GOERLI: Ethereum,
    Chain.SOLANA: Solana,
    Chain.BASE: Ethereum,
    Chain.CELO: Ethereum,
    Chain.OPTIMISTIC: Ethereum,
    Chain.MODE: Ethereum,
}

LEDGER_HELPERS: t.Dict[LedgerType, t.Type[LedgerHelper]] = {
    LedgerType.ETHEREUM: Ethereum,
    LedgerType.SOLANA: Solana,
}

CURRENCY_DENOMS = {
    Chain.ETHEREUM: "Wei",
    Chain.GNOSIS: "xDai",
    Chain.GOERLI: "GWei",
    Chain.SOLANA: "Lamp",
    Chain.BASE: "Wei",
    Chain.CELO: "Wei",
    Chain.OPTIMISTIC: "Wei",
    Chain.MODE: "Wei",
}


def get_default_rpc(chain: Chain) -> str:
    """Get default RPC chain type."""
    return DEFAULT_RPCS.get(chain, ETHEREUM_RPC)


def get_ledger_helper_by_chain(rpc: str, chain: Chain) -> LedgerHelper:
    """Get ledger helper by chain type."""
    return CHAIN_HELPERS.get(chain, Ethereum)(rpc=rpc)


def get_ledger_helper_by_ledger(rpc: str, ledger: LedgerHelper) -> LedgerHelper:
    """Get ledger helper by ledger type."""
    return LEDGER_HELPERS.get(ledger, Ethereum)(rpc=rpc)  # type: ignore


def get_currency_denom(chain: Chain) -> str:
    """Get currency denom by chain type."""
    return CURRENCY_DENOMS.get(chain, "Wei")
