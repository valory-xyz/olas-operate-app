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

"""Master key implementation"""

import json
import typing as t
from dataclasses import dataclass
from pathlib import Path

from aea.crypto.base import Crypto, LedgerApi
from aea.crypto.registries import make_ledger_api
from aea_ledger_ethereum.ethereum import EthereumApi, EthereumCrypto
from autonomy.chain.config import ChainType as ChainProfile
from autonomy.chain.tx import TxSettler
from web3 import Account

from operate.constants import (
    ON_CHAIN_INTERACT_RETRIES,
    ON_CHAIN_INTERACT_SLEEP,
    ON_CHAIN_INTERACT_TIMEOUT,
)
from operate.ledger import get_default_rpc
from operate.resource import LocalResource
from operate.types import ChainType, LedgerType
from operate.utils.gnosis import add_owner
from operate.utils.gnosis import create_safe as create_gnosis_safe
from operate.utils.gnosis import get_owners, swap_owner
from operate.utils.gnosis import transfer as transfer_from_safe


class MasterWallet(LocalResource):
    """Master wallet."""

    path: Path
    safe: t.Optional[str] = None
    ledger_type: LedgerType

    _key: str
    _crypto: t.Optional[Crypto] = None
    _password: t.Optional[str] = None
    _crypto_cls: t.Type[Crypto]

    @property
    def password(self) -> str:
        """Password string."""
        if self._password is None:
            raise ValueError("Password not set.")
        return self._password

    @password.setter
    def password(self, value: str) -> None:
        """Set password value."""
        self._password = value

    @property
    def crypto(self) -> Crypto:
        """Load crypto object."""
        if self._crypto is None:
            self._crypto = self._crypto_cls(self.path / self._key, self.password)
        return self._crypto

    @property
    def key_path(self) -> Path:
        """Key path."""
        return self.path / self._key

    def ledger_api(
        self,
        chain_type: ChainType,
        rpc: t.Optional[str] = None,
    ) -> LedgerApi:
        """Get ledger api object."""
        return make_ledger_api(
            self.ledger_type.name.lower(),
            address=(rpc or get_default_rpc(chain=chain_type)),
            chain_id=chain_type.id,
        )

    def transfer(
        self,
        to: str,
        amount: int,
        chain_type: ChainType,
        from_safe: bool = True,
    ) -> None:
        """Transfer funds to the given account."""
        raise NotImplementedError()

    @staticmethod
    def new(password: str, path: Path) -> t.Tuple["MasterWallet", t.List[str]]:
        """Create a new master wallet."""
        raise NotImplementedError()

    def create_safe(
        self,
        chain_type: ChainType,
        owner: t.Optional[str] = None,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Create safe."""
        raise NotImplementedError()

    def add_backup_owner(
        self,
        chain_type: ChainType,
        owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Create safe."""
        raise NotImplementedError()

    def swap_backup_owner(
        self,
        chain_type: ChainType,
        old_owner: str,
        new_owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Create safe."""
        raise NotImplementedError()

    def add_or_swap_owner(
        self,
        chain_type: ChainType,
        owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Add or swap backup owner."""
        raise NotImplementedError()


@dataclass
class EthereumMasterWallet(MasterWallet):
    """Master wallet manager."""

    path: Path
    address: str
    safe_chains: t.List[ChainType]  # For cross-chain support

    ledger_type: LedgerType = LedgerType.ETHEREUM
    safe: t.Optional[str] = None
    safe_nonce: t.Optional[int] = None  # For cross-chain reusability

    _file = ledger_type.config_file
    _key = ledger_type.key_file
    _crypto_cls = EthereumCrypto

    def _transfer_from_eoa(self, to: str, amount: int, chain_type: ChainType) -> None:
        """Transfer funds from EOA wallet."""
        ledger_api = t.cast(EthereumApi, self.ledger_api(chain_type=chain_type))
        tx_helper = TxSettler(
            ledger_api=ledger_api,
            crypto=self.crypto,
            chain_type=ChainProfile.CUSTOM,
            timeout=ON_CHAIN_INTERACT_TIMEOUT,
            retries=ON_CHAIN_INTERACT_RETRIES,
            sleep=ON_CHAIN_INTERACT_SLEEP,
        )

        def _build_tx(  # pylint: disable=unused-argument
            *args: t.Any, **kwargs: t.Any
        ) -> t.Dict:
            """Build transaction"""
            tx = ledger_api.get_transfer_transaction(
                sender_address=self.crypto.address,
                destination_address=to,
                amount=amount,
                tx_fee=50000,
                tx_nonce="0x",
                chain_id=chain_type.id,
                raise_on_try=True,
            )
            return ledger_api.update_with_gas_estimate(
                transaction=tx,
                raise_on_try=True,
            )

        setattr(tx_helper, "build", _build_tx)  # noqa: B010
        tx_helper.transact(lambda x: x, "", kwargs={})

    def _transfer_from_safe(self, to: str, amount: int, chain_type: ChainType) -> None:
        """Transfer funds from safe wallet."""
        transfer_from_safe(
            ledger_api=self.ledger_api(chain_type=chain_type),
            crypto=self.crypto,
            safe=t.cast(str, self.safe),
            to=to,
            amount=amount,
        )

    def transfer(
        self,
        to: str,
        amount: int,
        chain_type: ChainType,
        from_safe: bool = True,
    ) -> None:
        """Transfer funds to the given account."""
        if from_safe:
            return self._transfer_from_safe(
                to=to,
                amount=amount,
                chain_type=chain_type,
            )
        return self._transfer_from_eoa(
            to=to,
            amount=amount,
            chain_type=chain_type,
        )

    @classmethod
    def new(
        cls, password: str, path: Path
    ) -> t.Tuple["EthereumMasterWallet", t.List[str]]:
        """Create a new master wallet."""
        # Backport support on aea
        account = Account()
        account.enable_unaudited_hdwallet_features()
        crypto, mnemonic = account.create_with_mnemonic()
        (path / cls._key).write_text(
            data=json.dumps(
                Account.encrypt(
                    private_key=crypto._private_key,  # pylint: disable=protected-access
                    password=password,
                ),
                indent=2,
            ),
            encoding="utf-8",
        )

        # Create wallet
        wallet = EthereumMasterWallet(path=path, address=crypto.address, safe_chains=[])
        wallet.store()
        wallet.password = password
        return wallet, mnemonic.split()

    def create_safe(
        self,
        chain_type: ChainType,
        owner: t.Optional[str] = None,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Create safe."""
        if chain_type in self.safe_chains:
            return
        self.safe, self.safe_nonce = create_gnosis_safe(
            ledger_api=self.ledger_api(chain_type=chain_type, rpc=rpc),
            crypto=self.crypto,
            owner=owner,
            salt_nonce=self.safe_nonce,
        )
        self.safe_chains.append(chain_type)
        self.store()

    def add_backup_owner(
        self,
        chain_type: ChainType,
        owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Add a backup owner."""
        ledger_api = self.ledger_api(chain_type=chain_type, rpc=rpc)
        if len(get_owners(ledger_api=ledger_api, safe=t.cast(str, self.safe))) == 2:
            raise ValueError("Backup owner already exist!")
        add_owner(
            ledger_api=ledger_api,
            safe=t.cast(str, self.safe),
            owner=owner,
            crypto=self.crypto,
        )

    def swap_backup_owner(
        self,
        chain_type: ChainType,
        old_owner: str,
        new_owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Swap backup owner."""
        ledger_api = self.ledger_api(chain_type=chain_type, rpc=rpc)
        if len(get_owners(ledger_api=ledger_api, safe=t.cast(str, self.safe))) == 1:
            raise ValueError("Backup owner does not exist, cannot swap!")
        swap_owner(
            ledger_api=ledger_api,
            safe=t.cast(str, self.safe),
            old_owner=old_owner,
            new_owner=new_owner,
            crypto=self.crypto,
        )

    def add_or_swap_owner(
        self,
        chain_type: ChainType,
        owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Add or swap backup owner."""
        ledger_api = self.ledger_api(chain_type=chain_type, rpc=rpc)
        owners = get_owners(ledger_api=ledger_api, safe=t.cast(str, self.safe))
        if len(owners) == 1:
            return self.add_backup_owner(chain_type=chain_type, owner=owner, rpc=rpc)

        owners.remove(self.address)
        (old_owner,) = owners
        if old_owner == owner:
            return None

        return self.swap_backup_owner(
            chain_type=chain_type,
            old_owner=old_owner,
            new_owner=owner,
            rpc=rpc,
        )

    @classmethod
    def load(cls, path: Path) -> "EthereumMasterWallet":
        """Load master wallet."""
        return super().load(path)  # type: ignore


LEDGER_TYPE_TO_WALLET_CLASS = {
    LedgerType.ETHEREUM: EthereumMasterWallet,
}


class MasterWalletManager:
    """Master wallet manager."""

    def __init__(self, path: Path, password: t.Optional[str] = None) -> None:
        """Initialize master wallet manager."""
        self.path = path
        self._password = password

    @property
    def json(self) -> t.List[t.Dict]:
        """List of wallets"""
        return [wallet.json for wallet in self]

    @property
    def password(self) -> str:
        """Password string."""
        if self._password is None:
            raise ValueError("Password not set.")
        return self._password

    @password.setter
    def password(self, value: str) -> None:
        """Set password value."""
        self._password = value

    def setup(self) -> "MasterWalletManager":
        """Setup wallet manager."""
        self.path.mkdir(exist_ok=True)
        return self

    def create(self, ledger_type: LedgerType) -> t.Tuple[MasterWallet, t.List[str]]:
        """
        Create a master wallet

        :param ledger_type: Ledger type for the wallet.
        :return: Tuple of master wallet and mnemonic
        """
        if ledger_type == LedgerType.ETHEREUM:
            return EthereumMasterWallet.new(password=self.password, path=self.path)
        raise ValueError(f"{ledger_type} is not supported.")

    def exists(self, ledger_type: LedgerType) -> bool:
        """
        Check if a wallet exists or not

        :param ledger_type: Ledger type for the wallet.
        :return: True if wallet exists, False otherwise.
        """
        return (self.path / ledger_type.config_file).exists() and (
            self.path / ledger_type.key_file
        ).exists()

    def load(self, ledger_type: LedgerType) -> MasterWallet:
        """
        Load master wallet

        :param ledger_type: Ledger type for the wallet.
        :return: Master wallet object
        """
        if ledger_type == LedgerType.ETHEREUM:
            wallet = EthereumMasterWallet.load(path=self.path)
        else:
            raise ValueError(f"{ledger_type} is not supported.")
        wallet.password = self.password
        return wallet

    def __iter__(self) -> t.Iterator[MasterWallet]:
        """Iterate over master wallets."""
        for ledger_type in LedgerType:
            if not self.exists(ledger_type=ledger_type):
                continue
            yield LEDGER_TYPE_TO_WALLET_CLASS[ledger_type].load(path=self.path)
