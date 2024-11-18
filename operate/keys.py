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

"""Keys manager."""

import json
import logging
import os
import typing as t
from dataclasses import dataclass
from pathlib import Path

from aea.helpers.logging import setup_logger
from aea_ledger_ethereum.ethereum import EthereumCrypto

from operate.operate_types import LedgerType
from operate.resource import LocalResource


@dataclass
class Key(LocalResource):
    """Key resource."""

    ledger: LedgerType
    address: str
    private_key: str

    @classmethod
    def load(cls, path: Path) -> "Key":
        """Load a service"""
        return super().load(path)  # type: ignore


Keys = t.List[Key]


class KeysManager:
    """Keys manager."""

    def __init__(
        self,
        path: Path,
        logger: t.Optional[logging.Logger] = None,
    ) -> None:
        """
        Initialize keys manager

        :param path: Path to keys storage.
        :param logger: logging.Logger object.
        """
        self.path = path
        self.logger = logger or setup_logger(name="operate.keys")

    def setup(self) -> None:
        """Setup service manager."""
        self.path.mkdir(exist_ok=True)

    def get(self, key: str) -> Key:
        """Get key object."""
        return Key.from_json(  # type: ignore
            obj=json.loads(
                (self.path / key).read_text(
                    encoding="utf-8",
                )
            )
        )

    def create(self) -> str:
        """Creates new key."""
        crypto = EthereumCrypto()
        path = self.path / crypto.address
        if path.is_file():
            return crypto.address

        path.write_text(
            json.dumps(
                Key(
                    ledger=LedgerType.ETHEREUM,
                    address=crypto.address,
                    private_key=crypto.private_key,
                ).json,
                indent=4,
            ),
            encoding="utf-8",
        )
        return crypto.address

    def delete(self, key: str) -> None:
        """Delete key."""
        os.remove(self.path / key)
