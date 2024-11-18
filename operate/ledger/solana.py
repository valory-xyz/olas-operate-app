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

"""Solana ledger helpers."""

import typing as t

from operate.ledger.base import LedgerHelper
from operate.operate_types import LedgerType


class Solana(LedgerHelper):
    """Solana ledger helper."""

    def create_key(self) -> t.Dict:
        """Create key."""
        return {
            "address": "",
            "private_key": "",
            "encrypted": False,
            "ledger": LedgerType.SOLANA,
        }
