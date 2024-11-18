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

"""Ethereum ledger helpers."""

import typing as t

from aea_ledger_ethereum import EthereumApi, EthereumCrypto

from operate.ledger.base import LedgerHelper
from operate.operate_types import LedgerType


class Ethereum(LedgerHelper):
    """Ethereum ledger helper."""

    api: EthereumApi

    def __init__(self, rpc: str) -> None:
        """Initialize object."""
        super().__init__(rpc)
        self.api = EthereumApi(address=self.rpc)

    def create_key(self) -> t.Dict:
        """Create key."""
        account = EthereumCrypto()
        return {
            "address": account.address,
            "private_key": account.private_key,
            "encrypted": False,
            "ledger": LedgerType.ETHEREUM,
        }
