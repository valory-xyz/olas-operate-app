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
import logging
import os
import typing as t
from dataclasses import dataclass, field
from pathlib import Path

from aea.crypto.base import Crypto, LedgerApi
from aea.crypto.registries import make_ledger_api
from aea.helpers.logging import setup_logger
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
from operate.operate_types import Chain, LedgerType
from operate.resource import LocalResource
from operate.utils.gnosis import add_owner
from operate.utils.gnosis import create_safe as create_gnosis_safe
from operate.utils.gnosis import get_owners, swap_owner
from operate.utils.gnosis import transfer as transfer_from_safe
from operate.utils.gnosis import transfer_erc20_from_safe


class MasterWallet(LocalResource):
    """Master wallet."""

    path: Path
    safes: t.Optional[t.Dict[Chain, str]] = {}
    safe_chains: t.List[Chain] = []
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
        chain: Chain,
        rpc: t.Optional[str] = None,
    ) -> LedgerApi:
        """Get ledger api object."""
        return make_ledger_api(
            self.ledger_type.name.lower(),
            address=(rpc or get_default_rpc(chain=chain)),
            chain_id=chain.id,
        )

    def transfer(
        self,
        to: str,
        amount: int,
        chain: Chain,
        from_safe: bool = True,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Transfer funds to the given account."""
        raise NotImplementedError()

    # pylint: disable=too-many-arguments
    def transfer_erc20(
        self,
        token: str,
        to: str,
        amount: int,
        chain: Chain,
        from_safe: bool = True,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Transfer funds to the given account."""
        raise NotImplementedError()

    @staticmethod
    def new(password: str, path: Path) -> t.Tuple["MasterWallet", t.List[str]]:
        """Create a new master wallet."""
        raise NotImplementedError()

    def create_safe(
        self,
        chain: Chain,
        owner: t.Optional[str] = None,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Create safe."""
        raise NotImplementedError()

    def add_backup_owner(
        self,
        chain: Chain,
        owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Create safe."""
        raise NotImplementedError()

    def swap_backup_owner(
        self,
        chain: Chain,
        old_owner: str,
        new_owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Create safe."""
        raise NotImplementedError()

    def add_or_swap_owner(
        self,
        chain: Chain,
        owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Add or swap backup owner."""
        raise NotImplementedError()

    @classmethod
    def migrate_format(cls, path: Path) -> bool:
        """Migrate the JSON file format if needed."""
        raise NotImplementedError


@dataclass
class EthereumMasterWallet(MasterWallet):
    """Master wallet manager."""

    path: Path
    address: str

    safes: t.Optional[t.Dict[Chain, str]] = field(default_factory=dict)  # type: ignore
    safe_chains: t.List[Chain] = field(default_factory=list)  # type: ignore
    ledger_type: LedgerType = LedgerType.ETHEREUM
    safe_nonce: t.Optional[int] = None  # For cross-chain reusability

    _file = ledger_type.config_file
    _key = ledger_type.key_file
    _crypto_cls = EthereumCrypto

    def _transfer_from_eoa(
        self, to: str, amount: int, chain: Chain, rpc: t.Optional[str] = None
    ) -> None:
        """Transfer funds from EOA wallet."""
        ledger_api = t.cast(EthereumApi, self.ledger_api(chain=chain, rpc=rpc))
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
            max_priority_fee_per_gas = os.getenv("MAX_PRIORITY_FEE_PER_GAS", None)
            max_fee_per_gas = os.getenv("MAX_FEE_PER_GAS", None)
            tx = ledger_api.get_transfer_transaction(
                sender_address=self.crypto.address,
                destination_address=to,
                amount=amount,
                tx_fee=50000,
                tx_nonce="0x",
                chain_id=chain.id,
                raise_on_try=True,
                max_fee_per_gas=int(max_fee_per_gas) if max_fee_per_gas else None,
                max_priority_fee_per_gas=int(max_priority_fee_per_gas)
                if max_priority_fee_per_gas
                else None,
            )
            return ledger_api.update_with_gas_estimate(
                transaction=tx,
                raise_on_try=True,
            )

        setattr(tx_helper, "build", _build_tx)  # noqa: B010
        tx_helper.transact(lambda x: x, "", kwargs={})

    def _transfer_from_safe(
        self, to: str, amount: int, chain: Chain, rpc: t.Optional[str] = None
    ) -> None:
        """Transfer funds from safe wallet."""
        if self.safes is not None:
            transfer_from_safe(
                ledger_api=self.ledger_api(chain=chain, rpc=rpc),
                crypto=self.crypto,
                safe=t.cast(str, self.safes[chain]),
                to=to,
                amount=amount,
            )
        else:
            raise ValueError("Safes not initialized")

    def _transfer_erc20_from_safe(
        self,
        token: str,
        to: str,
        amount: int,
        chain: Chain,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Transfer funds from safe wallet."""
        transfer_erc20_from_safe(
            ledger_api=self.ledger_api(chain=chain, rpc=rpc),
            crypto=self.crypto,
            token=token,
            safe=t.cast(str, self.safes[chain]),  # type: ignore
            to=to,
            amount=amount,
        )

    def transfer(
        self,
        to: str,
        amount: int,
        chain: Chain,
        from_safe: bool = True,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Transfer funds to the given account."""
        if from_safe:
            return self._transfer_from_safe(
                to=to,
                amount=amount,
                chain=chain,
                rpc=rpc,
            )
        return self._transfer_from_eoa(
            to=to,
            amount=amount,
            chain=chain,
            rpc=rpc,
        )

    # pylint: disable=too-many-arguments
    def transfer_erc20(
        self,
        token: str,
        to: str,
        amount: int,
        chain: Chain,
        from_safe: bool = True,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Transfer funds to the given account."""
        if not from_safe:
            raise NotImplementedError()
        return self._transfer_erc20_from_safe(
            token=token,
            to=to,
            amount=amount,
            chain=chain,
            rpc=rpc,
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
        chain: Chain,
        owner: t.Optional[str] = None,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Create safe."""
        if chain in self.safe_chains:
            return
        safe, self.safe_nonce = create_gnosis_safe(
            ledger_api=self.ledger_api(chain=chain, rpc=rpc),
            crypto=self.crypto,
            owner=owner,
            salt_nonce=self.safe_nonce,
        )
        self.safe_chains.append(chain)
        if self.safes is None:
            self.safes = {}
        self.safes[chain] = safe
        self.store()

    def add_backup_owner(
        self,
        chain: Chain,
        owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Add a backup owner."""
        ledger_api = self.ledger_api(chain=chain, rpc=rpc)
        if chain not in self.safes:  # type: ignore
            raise ValueError(f"Safes not created for chain {chain}!")
        safe = t.cast(str, self.safes[chain])  # type: ignore
        if len(get_owners(ledger_api=ledger_api, safe=safe)) == 2:
            raise ValueError("Backup owner already exist!")
        add_owner(
            ledger_api=ledger_api,
            safe=safe,
            owner=owner,
            crypto=self.crypto,
        )

    def swap_backup_owner(
        self,
        chain: Chain,
        old_owner: str,
        new_owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Swap backup owner."""
        ledger_api = self.ledger_api(chain=chain, rpc=rpc)
        if chain not in self.safes:  # type: ignore
            raise ValueError(f"Safes not created for chain {chain}!")
        safe = t.cast(str, self.safes[chain])  # type: ignore
        if len(get_owners(ledger_api=ledger_api, safe=safe)) == 1:
            raise ValueError("Backup owner does not exist, cannot swap!")
        swap_owner(
            ledger_api=ledger_api,
            safe=safe,
            old_owner=old_owner,
            new_owner=new_owner,
            crypto=self.crypto,
        )

    def add_or_swap_owner(
        self,
        chain: Chain,
        owner: str,
        rpc: t.Optional[str] = None,
    ) -> None:
        """Add or swap backup owner."""
        ledger_api = self.ledger_api(chain=chain, rpc=rpc)
        if self.safes is None or chain not in self.safes:
            raise ValueError(f"Safes not created for chain {chain}!")
        safe = t.cast(str, self.safes[chain])
        owners = get_owners(ledger_api=ledger_api, safe=safe)
        if len(owners) == 1:
            return self.add_backup_owner(chain=chain, owner=owner, rpc=rpc)

        owners.remove(self.address)
        (old_owner,) = owners
        if old_owner == owner:
            return None

        return self.swap_backup_owner(
            chain=chain,
            old_owner=old_owner,
            new_owner=owner,
            rpc=rpc,
        )

    @classmethod
    def load(cls, path: Path) -> "EthereumMasterWallet":
        """Load master wallet."""
        # TODO: This is a complex way to read the 'safes' dictionary.
        # The reason for that is that wallet.safes[chain] would fail
        # (for example in service manager) when passed a ChainType key.

        raw_ethereum_wallet = t.cast(EthereumMasterWallet, super().load(path))  # type: ignore
        safes = {}
        for chain, safe_address in raw_ethereum_wallet.safes.items():
            safes[Chain(chain)] = safe_address

        raw_ethereum_wallet.safes = safes
        return raw_ethereum_wallet

    @classmethod
    def migrate_format(cls, path: Path) -> bool:
        """Migrate the JSON file format if needed."""
        wallet_path = path / cls._file
        with open(wallet_path, "r", encoding="utf-8") as file:
            data = json.load(file)

        migrated = False
        if "safes" not in data:
            safes = {}
            for chain in data["safe_chains"]:
                safes[chain] = data["safe"]
            data.pop("safe")
            data["safes"] = safes
            migrated = True

        old_to_new_chains = [
            "ethereum",
            "goerli",
            "gnosis",
            "solana",
            "optimistic",
            "base",
            "mode",
        ]
        safe_chains = []
        for chain in data["safe_chains"]:
            if isinstance(chain, int):
                safe_chains.append(old_to_new_chains[chain])
                migrated = True
            else:
                safe_chains.append(chain)
        data["safe_chains"] = safe_chains

        if isinstance(data["ledger_type"], int):
            old_to_new_ledgers = [ledger_type.value for ledger_type in LedgerType]
            data["ledger_type"] = old_to_new_ledgers[data["ledger_type"]]
            migrated = True

        safes = {}
        for chain, address in data["safes"].items():
            if chain.isnumeric():
                safes[old_to_new_chains[int(chain)]] = address
                migrated = True
            else:
                safes[chain] = address
        data["safes"] = safes

        with open(wallet_path, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

        return migrated


LEDGER_TYPE_TO_WALLET_CLASS = {
    LedgerType.ETHEREUM: EthereumMasterWallet,
}


class MasterWalletManager:
    """Master wallet manager."""

    def __init__(
        self,
        path: Path,
        password: t.Optional[str] = None,
        logger: t.Optional[logging.Logger] = None,
    ) -> None:
        """Initialize master wallet manager."""
        self.path = path
        self._password = password
        self.logger = logger or setup_logger(name="operate.master_wallet_manager")

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

    def migrate_wallet_configs(self) -> None:
        """Migrate old wallet config formats to new ones, if applies."""

        print(self.path)

        for ledger_type in LedgerType:
            if not self.exists(ledger_type=ledger_type):
                continue

            wallet_class = LEDGER_TYPE_TO_WALLET_CLASS.get(ledger_type)
            if wallet_class is None:
                continue

            migrated = wallet_class.migrate_format(path=self.path)
            if migrated:
                self.logger.info(f"Wallet {wallet_class} has been migrated.")
