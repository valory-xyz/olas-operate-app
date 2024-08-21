#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2021-2024 Valory AG
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
"""This module implements the onchain manager."""

import binascii
import contextlib
import io
import json
import logging
import tempfile
import time
import typing as t
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional, Union

from aea.configurations.data_types import PackageType
from aea.crypto.base import Crypto, LedgerApi
from aea.helpers.base import IPFSHash, cd
from aea_ledger_ethereum.ethereum import EthereumCrypto
from autonomy.chain.base import registry_contracts
from autonomy.chain.config import ChainConfigs, ChainType, ContractConfigs
from autonomy.chain.constants import (
    GNOSIS_SAFE_PROXY_FACTORY_CONTRACT,
    GNOSIS_SAFE_SAME_ADDRESS_MULTISIG_CONTRACT,
    MULTISEND_CONTRACT,
)
from autonomy.chain.service import (
    get_agent_instances,
    get_delployment_payload,
    get_reuse_multisig_payload,
    get_service_info,
)
from autonomy.chain.tx import TxSettler
from autonomy.cli.helpers.chain import MintHelper as MintManager
from autonomy.cli.helpers.chain import OnChainHelper
from autonomy.cli.helpers.chain import ServiceHelper as ServiceManager
from eth_utils import to_bytes
from hexbytes import HexBytes

from operate.constants import (
    ON_CHAIN_INTERACT_RETRIES,
    ON_CHAIN_INTERACT_SLEEP,
    ON_CHAIN_INTERACT_TIMEOUT,
)
from operate.data import DATA_DIR
from operate.data.contracts.service_staking_token.contract import (
    ServiceStakingTokenContract,
)
from operate.types import ContractAddresses
from operate.utils.gnosis import (
    MultiSendOperation,
    NULL_ADDRESS,
    SafeOperation,
    hash_payload_to_hex,
    skill_input_hex_to_payload,
)
from operate.wallet.master import MasterWallet


ETHEREUM_ERC20 = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"


class StakingState(Enum):
    """Staking state enumeration for the staking."""

    UNSTAKED = 0
    STAKED = 1
    EVICTED = 2


class GnosisSafeTransaction:
    """Safe transaction"""

    def __init__(
        self,
        ledger_api: LedgerApi,
        crypto: Crypto,
        chain_type: ChainType,
        safe: str,
    ) -> None:
        """Initiliaze a Gnosis safe tx"""
        self.ledger_api = ledger_api
        self.crypto = crypto
        self.chain_type = chain_type
        self.safe = safe
        self._txs: t.List[t.Dict] = []
        self.tx: t.Optional[t.Dict] = None

    def add(self, tx: t.Dict) -> "GnosisSafeTransaction":
        """Add a transaction"""
        self._txs.append(tx)
        return self

    def build(self) -> t.Dict:
        """Build the transaction."""
        multisend_data = bytes.fromhex(
            registry_contracts.multisend.get_tx_data(
                ledger_api=self.ledger_api,
                contract_address=ContractConfigs.multisend.contracts[self.chain_type],
                multi_send_txs=self._txs,
            ).get("data")[2:]
        )
        safe_tx_hash = registry_contracts.gnosis_safe.get_raw_safe_transaction_hash(
            ledger_api=self.ledger_api,
            contract_address=self.safe,
            value=0,
            safe_tx_gas=0,
            to_address=ContractConfigs.multisend.contracts[self.chain_type],
            data=multisend_data,
            operation=SafeOperation.DELEGATE_CALL.value,
        ).get("tx_hash")[2:]
        payload_data = hash_payload_to_hex(
            safe_tx_hash=safe_tx_hash,
            ether_value=0,
            safe_tx_gas=0,
            to_address=ContractConfigs.multisend.contracts[self.chain_type],
            operation=SafeOperation.DELEGATE_CALL.value,
            data=multisend_data,
        )
        owner = self.ledger_api.api.to_checksum_address(self.crypto.address)
        tx_params = skill_input_hex_to_payload(payload=payload_data)
        safe_tx_bytes = binascii.unhexlify(tx_params["safe_tx_hash"])
        signatures = {
            owner: self.crypto.sign_message(
                message=safe_tx_bytes,
                is_deprecated_mode=True,
            )[2:]
        }
        tx = registry_contracts.gnosis_safe.get_raw_safe_transaction(
            ledger_api=self.ledger_api,
            contract_address=self.safe,
            sender_address=owner,
            owners=(owner,),  # type: ignore
            to_address=tx_params["to_address"],
            value=tx_params["ether_value"],
            data=tx_params["data"],
            safe_tx_gas=tx_params["safe_tx_gas"],
            signatures_by_owner=signatures,
            operation=SafeOperation.DELEGATE_CALL.value,
            nonce=self.ledger_api.api.eth.get_transaction_count(owner),
        )
        self.tx = self.crypto.sign_transaction(tx)
        return t.cast(t.Dict, self.tx)

    def settle(self) -> t.Dict:
        """Settle the transaction."""
        retries = 0
        deadline = datetime.now().timestamp() + ON_CHAIN_INTERACT_TIMEOUT
        while (
            retries < ON_CHAIN_INTERACT_RETRIES
            and datetime.now().timestamp() < deadline
        ):
            try:
                self.build()
                tx_digest = self.ledger_api.send_signed_transaction(self.tx)
            except Exception as e:  # pylint: disable=broad-except
                print(f"Error sending the safe tx: {e}")
                tx_digest = None

            if tx_digest is not None:
                receipt = self.ledger_api.api.eth.wait_for_transaction_receipt(
                    tx_digest
                )
                if receipt["status"] != 0:
                    return receipt
            time.sleep(ON_CHAIN_INTERACT_SLEEP)
        raise RuntimeError("Timeout while waiting for safe transaction to go through")


class StakingManager(OnChainHelper):
    """Helper class for staking a service."""

    def __init__(
        self,
        key: Path,
        chain_type: ChainType = ChainType.CUSTOM,
        password: Optional[str] = None,
    ) -> None:
        """Initialize object."""
        super().__init__(key=key, chain_type=chain_type, password=password)
        self.staking_ctr = t.cast(
            ServiceStakingTokenContract,
            ServiceStakingTokenContract.from_dir(
                directory=str(DATA_DIR / "contracts" / "service_staking_token")
            ),
        )

    def status(self, service_id: int, staking_contract: str) -> StakingState:
        """Is the service staked?"""
        return StakingState(
            self.staking_ctr.get_instance(
                ledger_api=self.ledger_api,
                contract_address=staking_contract,
            )
            .functions.getStakingState(service_id)
            .call()
        )

    def slots_available(self, staking_contract: str) -> bool:
        """Check if there are available slots on the staking contract"""
        instance = self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        )
        available = instance.functions.maxNumServices().call() - len(
            instance.functions.getServiceIds().call()
        )
        return available > 0

    def available_rewards(self, staking_contract: str) -> int:
        """Get the available staking rewards on the staking contract"""
        instance = self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        )
        available_rewards = instance.functions.availableRewards().call()
        return available_rewards

    def service_info(self, staking_contract: str, service_id: int) -> dict:
        """Get the service onchain info"""
        return self.staking_ctr.get_service_info(
            self.ledger_api,
            staking_contract,
            service_id,
        ).get("data")
 
    def agent_ids(self, staking_contract: str) -> t.List[int]:
        instance = self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        )
        return instance.functions.getAgentIds().call()

    def service_registry(self, staking_contract: str) -> str:
        instance = self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        )
        return instance.functions.serviceRegistry().call()

    def staking_token(self, staking_contract: str) -> str:
        instance = self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        )
        return instance.functions.stakingToken().call()

    def service_registry_token_utility(self, staking_contract: str) -> str:
        instance = self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        )
        return instance.functions.serviceRegistryTokenUtility().call()

    def min_staking_deposit(self, staking_contract: str) -> str:
        instance = self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        )
        return instance.functions.minStakingDeposit().call()

    def activity_checker(self, staking_contract: str) -> str:
        instance = self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        )
        return instance.functions.activityChecker().call()

    def check_staking_compatibility(
        self,
        service_id: int,
        staking_contract: str,
    ) -> None:
        """Check if service can be staked."""
        status = self.status(service_id, staking_contract)
        if status == StakingState.STAKED:
            raise ValueError("Service already staked")

        if status == StakingState.EVICTED:
            raise ValueError("Service is evicted")

        if not self.slots_available(staking_contract):
            raise ValueError("No sataking slots available.")

    def stake(
        self,
        service_id: int,
        service_registry: str,
        staking_contract: str,
    ) -> None:
        """Stake the service"""
        self.check_staking_compatibility(
            service_id=service_id, staking_contract=staking_contract
        )

        tx_settler = TxSettler(
            ledger_api=self.ledger_api,
            crypto=self.crypto,
            chain_type=self.chain_type,
            timeout=ON_CHAIN_INTERACT_TIMEOUT,
            retries=ON_CHAIN_INTERACT_RETRIES,
            sleep=ON_CHAIN_INTERACT_SLEEP,
        )

        # we make use of the ERC20 contract to build the approval transaction
        # since it has the same interface as ERC721 we might want to create
        # a ERC721 contract package
        def _build_approval_tx(  # pylint: disable=unused-argument
            *args: t.Any, **kargs: t.Any
        ) -> t.Dict:
            return registry_contracts.erc20.get_approve_tx(
                ledger_api=self.ledger_api,
                contract_address=service_registry,
                spender=staking_contract,
                sender=self.crypto.address,
                amount=service_id,
            )

        setattr(tx_settler, "build", _build_approval_tx)  # noqa: B010
        tx_settler.transact(
            method=lambda: {},
            contract="",
            kwargs={},
            dry_run=False,
        )

        def _build_staking_tx(  # pylint: disable=unused-argument
            *args: t.Any, **kargs: t.Any
        ) -> t.Dict:
            return self.ledger_api.build_transaction(
                contract_instance=self.staking_ctr.get_instance(
                    ledger_api=self.ledger_api,
                    contract_address=staking_contract,
                ),
                method_name="stake",
                method_args={"serviceId": service_id},
                tx_args={
                    "sender_address": self.crypto.address,
                },
                raise_on_try=True,
            )

        setattr(tx_settler, "build", _build_staking_tx)  # noqa: B010
        tx_settler.transact(
            method=lambda: {},
            contract="",
            kwargs={},
            dry_run=False,
        )

    def check_if_unstaking_possible(
        self,
        service_id: int,
        staking_contract: str,
    ) -> None:
        """Check unstaking availability"""
        if self.status(
            service_id=service_id, staking_contract=staking_contract
        ) not in {StakingState.STAKED, StakingState.EVICTED}:
            raise ValueError("Service not staked.")

        ts_start = t.cast(int, self.service_info(staking_contract, service_id)[3])
        available_rewards = t.cast(
            int,
            self.staking_ctr.available_rewards(self.ledger_api, staking_contract).get(
                "data"
            ),
        )
        minimum_staking_duration = t.cast(
            int,
            self.staking_ctr.get_min_staking_duration(
                self.ledger_api, staking_contract
            ).get("data"),
        )
        staked_duration = time.time() - ts_start
        if staked_duration < minimum_staking_duration and available_rewards > 0:
            raise ValueError("Service cannot be unstaked yet.")

    def unstake(self, service_id: int, staking_contract: str) -> None:
        """Unstake the service"""

        tx_settler = TxSettler(
            ledger_api=self.ledger_api,
            crypto=self.crypto,
            chain_type=self.chain_type,
            timeout=ON_CHAIN_INTERACT_TIMEOUT,
            retries=ON_CHAIN_INTERACT_RETRIES,
            sleep=ON_CHAIN_INTERACT_SLEEP,
        )

        def _build_unstaking_tx(  # pylint: disable=unused-argument
            *args: t.Any, **kargs: t.Any
        ) -> t.Dict:
            return self.ledger_api.build_transaction(
                contract_instance=self.staking_ctr.get_instance(
                    ledger_api=self.ledger_api,
                    contract_address=staking_contract,
                ),
                method_name="unstake",
                method_args={"serviceId": service_id},
                tx_args={
                    "sender_address": self.crypto.address,
                },
                raise_on_try=True,
            )

        setattr(tx_settler, "build", _build_unstaking_tx)  # noqa: B010
        tx_settler.transact(
            method=lambda: {},
            contract="",
            kwargs={},
            dry_run=False,
        )

    def get_stake_approval_tx_data(
        self,
        service_id: int,
        service_registry: str,
        staking_contract: str,
    ) -> bytes:
        """Get stake approval tx data."""
        self.check_staking_compatibility(
            service_id=service_id,
            staking_contract=staking_contract,
        )
        return registry_contracts.erc20.get_instance(
            ledger_api=self.ledger_api,
            contract_address=service_registry,
        ).encodeABI(
            fn_name="approve",
            args=[
                staking_contract,
                service_id,
            ],
        )

    def get_stake_tx_data(self, service_id: int, staking_contract: str) -> bytes:
        """Get stake approval tx data."""
        self.check_staking_compatibility(
            service_id=service_id,
            staking_contract=staking_contract,
        )
        return self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        ).encodeABI(
            fn_name="stake",
            args=[service_id],
        )

    def get_unstake_tx_data(self, service_id: int, staking_contract: str) -> bytes:
        """Unstake the service"""
        self.check_if_unstaking_possible(
            service_id=service_id,
            staking_contract=staking_contract,
        )
        return self.staking_ctr.get_instance(
            ledger_api=self.ledger_api,
            contract_address=staking_contract,
        ).encodeABI(
            fn_name="unstake",
            args=[service_id],
        )


class _ChainUtil:
    """On chain service management."""

    def __init__(
        self,
        rpc: str,
        wallet: MasterWallet,
        contracts: ContractAddresses,
        chain_type: t.Optional[ChainType] = None,
    ) -> None:
        """On chain manager."""
        self.rpc = rpc
        self.wallet = wallet
        self.contracts = contracts
        self.chain_type = chain_type or ChainType.CUSTOM

    def _patch(self) -> None:
        """Patch contract and chain config."""
        ChainConfigs.get(self.chain_type).rpc = self.rpc
        if self.chain_type != ChainType.CUSTOM:
            return

        for name, address in self.contracts.items():
            ContractConfigs.get(name=name).contracts[self.chain_type] = address

    @property
    def crypto(self) -> Crypto:
        """Load crypto object."""
        self._patch()
        _, crypto = OnChainHelper.get_ledger_and_crypto_objects(
            chain_type=self.chain_type,
            key=self.wallet.key_path,
            password=self.wallet.password,
        )
        return crypto

    @property
    def ledger_api(self) -> LedgerApi:
        """Load ledger api object."""
        self._patch()
        ledger_api, _ = OnChainHelper.get_ledger_and_crypto_objects(
            chain_type=self.chain_type,
            key=self.wallet.key_path,
            password=self.wallet.password,
        )
        return ledger_api

    def owner_of(self, token_id: int) -> str:
        """Get owner of a service."""
        self._patch()
        ledger_api, _ = OnChainHelper.get_ledger_and_crypto_objects(
            chain_type=self.chain_type
        )


    def info(self, token_id: int) -> t.Dict:
        """Get service info."""
        self._patch()
        ledger_api, _ = OnChainHelper.get_ledger_and_crypto_objects(
            chain_type=self.chain_type
        )
        (
            security_deposit,
            multisig_address,
            config_hash,
            threshold,
            max_agents,
            number_of_agent_instances,
            service_state,
            canonical_agents,
        ) = get_service_info(
            ledger_api=ledger_api,
            chain_type=self.chain_type,
            token_id=token_id,
        )
        instances = get_agent_instances(
            ledger_api=ledger_api,
            chain_type=self.chain_type,
            token_id=token_id,
        ).get("agentInstances", [])
        return dict(
            security_deposit=security_deposit,
            multisig=multisig_address,
            config_hash=config_hash.hex(),
            threshold=threshold,
            max_agents=max_agents,
            number_of_agent_instances=number_of_agent_instances,
            service_state=service_state,
            canonical_agents=canonical_agents,
            instances=instances,
        )


    def get_service_safe_owners(self, service_id: int) -> t.List[str]:
        """Get list of owners."""
        ledger_api, _ = OnChainHelper.get_ledger_and_crypto_objects(
            chain_type=self.chain_type
        )
        (
            _,
            multisig_address,
            _,
            _,
            _,
            _,
            _,
            _,
        ) = get_service_info(
            ledger_api=ledger_api,
            chain_type=self.chain_type,
            token_id=service_id,
        )
        return registry_contracts.gnosis_safe.get_owners(
            ledger_api=ledger_api,
            contract_address=multisig_address,
        ).get("owners", [])


    def swap(  # pylint: disable=too-many-arguments,too-many-locals
        self,
        service_id: int,
        multisig: str,
        owner_key: str,
        new_owner_address: str
    ) -> None:
        """Swap safe owner."""
        logging.info(f"Swapping safe for service {service_id} [{multisig}]...")
        self._patch()
        manager = ServiceManager(
            service_id=service_id,
            chain_type=self.chain_type,
            key=self.wallet.key_path,
            password=self.wallet.password,
            timeout=ON_CHAIN_INTERACT_TIMEOUT,
            retries=ON_CHAIN_INTERACT_RETRIES,
            sleep=ON_CHAIN_INTERACT_SLEEP,
        )
        with tempfile.TemporaryDirectory() as temp_dir:
            key_file = Path(temp_dir, "key.txt")
            key_file.write_text(owner_key, encoding="utf-8")
            owner_crypto = EthereumCrypto(private_key_path=str(key_file))
        owner_cryptos: t.List[EthereumCrypto] = [owner_crypto]
        owners = [
            manager.ledger_api.api.to_checksum_address(owner_crypto.address)
            for owner_crypto in owner_cryptos
        ]
        owner_to_swap = owners[0]
        multisend_txs = []
        txd = registry_contracts.gnosis_safe.get_swap_owner_data(
            ledger_api=manager.ledger_api,
            contract_address=multisig,
            old_owner=manager.ledger_api.api.to_checksum_address(owner_to_swap),
            new_owner=manager.ledger_api.api.to_checksum_address(
                new_owner_address
            ),
        ).get("data")
        multisend_txs.append(
            {
                "operation": MultiSendOperation.CALL,
                "to": multisig,
                "value": 0,
                "data": HexBytes(txd[2:]),
            }
        )
        multisend_txd = registry_contracts.multisend.get_tx_data(  # type: ignore
            ledger_api=manager.ledger_api,
            contract_address=ContractConfigs.multisend.contracts[self.chain_type],
            multi_send_txs=multisend_txs,
        ).get("data")
        multisend_data = bytes.fromhex(multisend_txd[2:])
        safe_tx_hash = registry_contracts.gnosis_safe.get_raw_safe_transaction_hash(
            ledger_api=manager.ledger_api,
            contract_address=multisig,
            to_address=ContractConfigs.multisend.contracts[self.chain_type],
            value=0,
            data=multisend_data,
            safe_tx_gas=0,
            operation=SafeOperation.DELEGATE_CALL.value,
        ).get("tx_hash")[2:]
        payload_data = hash_payload_to_hex(
            safe_tx_hash=safe_tx_hash,
            ether_value=0,
            safe_tx_gas=0,
            to_address=ContractConfigs.multisend.contracts[self.chain_type],
            data=multisend_data,
        )
        tx_params = skill_input_hex_to_payload(payload=payload_data)
        safe_tx_bytes = binascii.unhexlify(tx_params["safe_tx_hash"])
        owner_to_signature = {}
        for owner_crypto in owner_cryptos:
            signature = owner_crypto.sign_message(
                message=safe_tx_bytes,
                is_deprecated_mode=True,
            )
            owner_to_signature[
                manager.ledger_api.api.to_checksum_address(owner_crypto.address)
            ] = signature[2:]
        tx = registry_contracts.gnosis_safe.get_raw_safe_transaction(
            ledger_api=manager.ledger_api,
            contract_address=multisig,
            sender_address=owner_crypto.address,
            owners=tuple(owners),  # type: ignore
            to_address=tx_params["to_address"],
            value=tx_params["ether_value"],
            data=tx_params["data"],
            safe_tx_gas=tx_params["safe_tx_gas"],
            signatures_by_owner=owner_to_signature,
            operation=SafeOperation.DELEGATE_CALL.value,
        )
        stx = owner_crypto.sign_transaction(tx)
        tx_digest = manager.ledger_api.send_signed_transaction(stx)
        receipt = manager.ledger_api.api.eth.wait_for_transaction_receipt(tx_digest)
        if receipt["status"] != 1:
            raise RuntimeError("Error swapping owners")

    def staking_slots_available(self, staking_contract: str) -> bool:
        """Check if there are available slots on the staking contract"""
        self._patch()
        return StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).slots_available(
            staking_contract=staking_contract,
        )

    def staking_rewards_available(self, staking_contract: str) -> bool:
        """Check if there are available staking rewards on the staking contract"""
        self._patch()
        available_rewards = StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).available_rewards(
            staking_contract=staking_contract,
        )
        return available_rewards > 0

class OnChainManager(_ChainUtil):
    """On chain service management."""

    def mint(  # pylint: disable=too-many-arguments,too-many-locals
        self,
        package_path: Path,
        agent_id: int,
        number_of_slots: int,
        cost_of_bond: int,
        threshold: int,
        nft: Optional[Union[Path, IPFSHash]],
        update_token: t.Optional[int] = None,
        token: t.Optional[str] = None,
    ) -> t.Dict:
        """Mint service."""
        # TODO: Support for update
        self._patch()
        manager = MintManager(
            chain_type=self.chain_type,
            key=self.wallet.key_path,
            password=self.wallet.password,
            update_token=update_token,
            timeout=ON_CHAIN_INTERACT_TIMEOUT,
            retries=ON_CHAIN_INTERACT_RETRIES,
            sleep=ON_CHAIN_INTERACT_SLEEP,
        )

        # Prepare for minting
        (
            manager.load_package_configuration(
                package_path=package_path, package_type=PackageType.SERVICE
            )
            .load_metadata()
            .verify_nft(nft=nft)
            .verify_service_dependencies(agent_id=agent_id)
            .publish_metadata()
        )

        with tempfile.TemporaryDirectory() as temp, contextlib.redirect_stdout(
            io.StringIO()
        ):
            with cd(temp):
                kwargs = dict(
                    number_of_slots=number_of_slots,
                    cost_of_bond=cost_of_bond,
                    threshold=threshold,
                    token=token,
                )
                # TODO: Enable after consulting smart contracts team re a safe
                # being a service owner
                # if update_token is None:
                #     kwargs["owner"] = self.wallet.safe # noqa: F401
                method = (
                    manager.mint_service
                    if update_token is None
                    else manager.update_service
                )
                method(**kwargs)
                (metadata,) = Path(temp).glob("*.json")
                published = {
                    "token": int(Path(metadata).name.replace(".json", "")),
                    "metadata": json.loads(Path(metadata).read_text(encoding="utf-8")),
                }
        return published

    def activate(
        self,
        service_id: int,
        token: t.Optional[str] = None,
    ) -> None:
        """Activate service."""
        logging.info(f"Activating service {service_id}...")
        self._patch()
        with contextlib.redirect_stdout(io.StringIO()):
            ServiceManager(
                service_id=service_id,
                chain_type=self.chain_type,
                key=self.wallet.key_path,
                password=self.wallet.password,
                timeout=ON_CHAIN_INTERACT_TIMEOUT,
                retries=ON_CHAIN_INTERACT_RETRIES,
                sleep=ON_CHAIN_INTERACT_SLEEP,
            ).check_is_service_token_secured(
                token=token,
            ).activate_service()

    def register(
        self,
        service_id: int,
        instances: t.List[str],
        agents: t.List[int],
        token: t.Optional[str] = None,
    ) -> None:
        """Register instance."""
        logging.info(f"Registering service {service_id}...")
        with contextlib.redirect_stdout(io.StringIO()):
            ServiceManager(
                service_id=service_id,
                chain_type=self.chain_type,
                key=self.wallet.key_path,
                password=self.wallet.password,
                timeout=ON_CHAIN_INTERACT_TIMEOUT,
                retries=ON_CHAIN_INTERACT_RETRIES,
                sleep=ON_CHAIN_INTERACT_SLEEP,
            ).check_is_service_token_secured(
                token=token,
            ).register_instance(
                instances=instances,
                agent_ids=agents,
            )

    def deploy(
        self,
        service_id: int,
        reuse_multisig: bool = False,
        token: t.Optional[str] = None,
    ) -> None:
        """Deploy service."""
        logging.info(f"Deploying service {service_id}...")
        self._patch()
        with contextlib.redirect_stdout(io.StringIO()):
            ServiceManager(
                service_id=service_id,
                chain_type=self.chain_type,
                key=self.wallet.key_path,
                password=self.wallet.password,
                timeout=ON_CHAIN_INTERACT_TIMEOUT,
                retries=ON_CHAIN_INTERACT_RETRIES,
                sleep=ON_CHAIN_INTERACT_SLEEP,
            ).check_is_service_token_secured(
                token=token,
            ).deploy_service(
                reuse_multisig=reuse_multisig,
            )

    def terminate(self, service_id: int, token: t.Optional[str] = None) -> None:
        """Terminate service."""
        logging.info(f"Terminating service {service_id}...")
        self._patch()
        with contextlib.redirect_stdout(io.StringIO()):
            ServiceManager(
                service_id=service_id,
                chain_type=self.chain_type,
                key=self.wallet.key_path,
                password=self.wallet.password,
                timeout=ON_CHAIN_INTERACT_TIMEOUT,
                retries=ON_CHAIN_INTERACT_RETRIES,
                sleep=ON_CHAIN_INTERACT_SLEEP,
            ).check_is_service_token_secured(
                token=token,
            ).terminate_service()

    def unbond(self, service_id: int, token: t.Optional[str] = None) -> None:
        """Unbond service."""
        logging.info(f"Unbonding service {service_id}...")
        self._patch()
        with contextlib.redirect_stdout(io.StringIO()):
            ServiceManager(
                service_id=service_id,
                chain_type=self.chain_type,
                key=self.wallet.key_path,
                password=self.wallet.password,
                timeout=ON_CHAIN_INTERACT_TIMEOUT,
                retries=ON_CHAIN_INTERACT_RETRIES,
                sleep=ON_CHAIN_INTERACT_SLEEP,
            ).check_is_service_token_secured(
                token=token,
            ).unbond_service()

    def stake(
        self,
        service_id: int,
        service_registry: str,
        staking_contract: str,
    ) -> None:
        """Stake service."""
        self._patch()
        StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).stake(
            service_id=service_id,
            service_registry=service_registry,
            staking_contract=staking_contract,
        )

    def unstake(self, service_id: int, staking_contract: str) -> None:
        """Unstake service."""
        self._patch()
        StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).unstake(
            service_id=service_id,
            staking_contract=staking_contract,
        )

    def staking_status(self, service_id: int, staking_contract: str) -> StakingState:
        """Stake the service"""
        self._patch()
        return StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).status(
            service_id=service_id,
            staking_contract=staking_contract,
        )


class EthSafeTxBuilder(_ChainUtil):
    """Safe Transaction builder."""

    def new_tx(self) -> GnosisSafeTransaction:
        """Create a new GnosisSafeTransaction instance."""
        return GnosisSafeTransaction(
            ledger_api=self.ledger_api,
            crypto=self.crypto,
            chain_type=self.chain_type,
            safe=t.cast(str, self.wallet.safe),
        )

    def get_mint_tx_data(  # pylint: disable=too-many-arguments
        self,
        package_path: Path,
        agent_id: int,
        number_of_slots: int,
        cost_of_bond: int,
        threshold: int,
        nft: Optional[Union[Path, IPFSHash]],
        update_token: t.Optional[int] = None,
        token: t.Optional[str] = None,
    ) -> t.Dict:
        """Build mint transaction."""
        # TODO: Support for update
        self._patch()
        manager = MintManager(
            chain_type=self.chain_type,
            key=self.wallet.key_path,
            password=self.wallet.password,
            update_token=update_token,
            timeout=ON_CHAIN_INTERACT_TIMEOUT,
            retries=ON_CHAIN_INTERACT_RETRIES,
            sleep=ON_CHAIN_INTERACT_SLEEP,
        )
        # Prepare for minting
        (
            manager.load_package_configuration(
                package_path=package_path, package_type=PackageType.SERVICE
            )
            .load_metadata()
            .verify_nft(nft=nft)
            #.verify_service_dependencies(agent_id=agent_id)  # TODO add this check once subgraph production indexes agent 25
            .publish_metadata()
        )
        instance = registry_contracts.service_manager.get_instance(
            ledger_api=self.ledger_api,
            contract_address=self.contracts["service_manager"],
        )

        if update_token is None:
            txd = instance.encodeABI(
                fn_name="create",
                args=[
                    self.wallet.safe,
                    token or ETHEREUM_ERC20,
                    manager.metadata_hash,
                    [agent_id],
                    [[number_of_slots, cost_of_bond]],
                    threshold,
                ],
            )
        else:
            txd = instance.encodeABI(
                fn_name="update",
                args=[
                    token or ETHEREUM_ERC20,
                    manager.metadata_hash,
                    [agent_id],
                    [[number_of_slots, cost_of_bond]],
                    threshold,
                    update_token
                ],
            )            

        return {
            "to": self.contracts["service_manager"],
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }

    def get_olas_approval_data(
        self,
        spender: str,
        amount: int,
        olas_contract: str,
    ) -> t.Dict:
        """Get activate tx data."""
        instance = registry_contracts.erc20.get_instance(
            ledger_api=self.ledger_api,
            contract_address=olas_contract,
        )
        txd = instance.encodeABI(
            fn_name="approve",
            args=[spender, amount],
        )
        return {
            "to": olas_contract,
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }

    def get_activate_data(self, service_id: int, cost_of_bond: int) -> t.Dict:
        """Get activate tx data."""
        instance = registry_contracts.service_manager.get_instance(
            ledger_api=self.ledger_api,
            contract_address=self.contracts["service_manager"],
        )
        txd = instance.encodeABI(
            fn_name="activateRegistration",
            args=[service_id],
        )
        return {
            "from": self.wallet.safe,
            "to": self.contracts["service_manager"],
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": cost_of_bond,
        }

    def get_register_instances_data(
        self,
        service_id: int,
        instances: t.List[str],
        agents: t.List[int],
        cost_of_bond: int,
    ) -> t.Dict:
        """Get register instances tx data."""
        instance = registry_contracts.service_manager.get_instance(
            ledger_api=self.ledger_api,
            contract_address=self.contracts["service_manager"],
        )
        txd = instance.encodeABI(
            fn_name="registerAgents",
            args=[
                service_id,
                instances,
                agents,
            ],
        )
        return {
            "from": self.wallet.safe,
            "to": self.contracts["service_manager"],
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": cost_of_bond,
        }

    def get_deploy_data(
        self,
        service_id: int,
        reuse_multisig: bool = False,
    ) -> t.Dict:
        """Get deploy tx data."""
        instance = registry_contracts.service_manager.get_instance(
            ledger_api=self.ledger_api,
            contract_address=self.contracts["service_manager"],
        )
        if reuse_multisig:
            _deployment_payload, error = get_reuse_multisig_payload(
                ledger_api=self.ledger_api,
                crypto=self.crypto,
                chain_type=self.chain_type,
                service_id=service_id,
            )
            if _deployment_payload is None:
                raise ValueError(error)
            deployment_payload = _deployment_payload
            gnosis_safe_multisig = ContractConfigs.get(
                GNOSIS_SAFE_SAME_ADDRESS_MULTISIG_CONTRACT.name
            ).contracts[self.chain_type]
        else:
            deployment_payload = get_delployment_payload()
            gnosis_safe_multisig = ContractConfigs.get(
                GNOSIS_SAFE_PROXY_FACTORY_CONTRACT.name
            ).contracts[self.chain_type]

        txd = instance.encodeABI(
            fn_name="deploy",
            args=[
                service_id,
                gnosis_safe_multisig,
                deployment_payload,
            ],
        )
        return {
            "to": self.contracts["service_manager"],
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }

    def get_deploy_data_from_safe(
        self,
        service_id: int,
        master_safe: str,
        reuse_multisig: bool = False,
    ) -> t.List[t.Dict[str, t.Any]]:
        """Get the deploy data instructions for a safe"""
        registry_instance = registry_contracts.service_manager.get_instance(
            ledger_api=self.ledger_api,
            contract_address=self.contracts["service_manager"],
        )
        approve_hash_message = None
        if reuse_multisig:
            _deployment_payload, approve_hash_message, error = get_reuse_multisig_from_safe_payload(
                ledger_api=self.ledger_api,
                chain_type=self.chain_type,
                service_id=service_id,
                master_safe=master_safe,
            )
            if _deployment_payload is None:
                raise ValueError(error)
            deployment_payload = _deployment_payload
            gnosis_safe_multisig = ContractConfigs.get(
                GNOSIS_SAFE_SAME_ADDRESS_MULTISIG_CONTRACT.name
            ).contracts[self.chain_type]
        else:
            deployment_payload = get_delployment_payload()
            gnosis_safe_multisig = ContractConfigs.get(
                GNOSIS_SAFE_PROXY_FACTORY_CONTRACT.name
            ).contracts[self.chain_type]

        deploy_data = registry_instance.encodeABI(
            fn_name="deploy",
            args=[
                service_id,
                gnosis_safe_multisig,
                deployment_payload,
            ],
        )
        deploy_message = {
            "to": self.contracts["service_manager"],
            "data": deploy_data[2:],
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }
        if approve_hash_message is None:
            return [deploy_message]
        return [approve_hash_message, deploy_message]

    def get_terminate_data(self, service_id: int) -> t.Dict:
        """Get terminate tx data."""
        instance = registry_contracts.service_manager.get_instance(
            ledger_api=self.ledger_api,
            contract_address=self.contracts["service_manager"],
        )
        txd = instance.encodeABI(
            fn_name="terminate",
            args=[service_id],
        )
        return {
            "to": self.contracts["service_manager"],
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }

    def get_unbond_data(self, service_id: int) -> t.Dict:
        """Get unbond tx data."""
        instance = registry_contracts.service_manager.get_instance(
            ledger_api=self.ledger_api,
            contract_address=self.contracts["service_manager"],
        )
        txd = instance.encodeABI(
            fn_name="unbond",
            args=[service_id],
        )
        return {
            "to": self.contracts["service_manager"],
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }

    def get_staking_approval_data(
        self,
        service_id: int,
        service_registry: str,
        staking_contract: str,
    ) -> t.Dict:
        """Get staking approval data"""
        self._patch()
        txd = StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).get_stake_approval_tx_data(
            service_id=service_id,
            service_registry=service_registry,
            staking_contract=staking_contract,
        )
        return {
            "from": self.wallet.safe,
            "to": self.contracts["service_registry"],
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }

    def get_staking_data(
        self,
        service_id: int,
        staking_contract: str,
    ) -> t.Dict:
        """Get staking tx data"""
        self._patch()
        txd = StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).get_stake_tx_data(
            service_id=service_id,
            staking_contract=staking_contract,
        )
        return {
            "to": staking_contract,
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }

    def get_unstaking_data(
        self,
        service_id: int,
        staking_contract: str,
    ) -> t.Dict:
        """Get unstaking tx data"""
        self._patch()
        txd = StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).get_unstake_tx_data(
            service_id=service_id,
            staking_contract=staking_contract,
        )
        return {
            "to": staking_contract,
            "data": txd[2:],
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }

    def staking_slots_available(self, staking_contract: str) -> bool:
        """Stake service."""
        self._patch()
        return StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).slots_available(
            staking_contract=staking_contract,
        )

    def staking_status(self, service_id: int, staking_contract: str) -> StakingState:
        """Stake the service"""
        self._patch()
        return StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        ).status(
            service_id=service_id,
            staking_contract=staking_contract,
        )

    def get_staking_params(self, staking_contract: str) -> t.Dict:
        """Get agent IDs for the staking contract"""
        self._patch()
        staking_manager = StakingManager(
            key=self.wallet.key_path,
            password=self.wallet.password,
            chain_type=self.chain_type,
        )
        agent_ids = staking_manager.agent_ids(
            staking_contract=staking_contract,
        )
        service_registry = staking_manager.service_registry(
            staking_contract=staking_contract,
        )
        staking_token = staking_manager.staking_token(
            staking_contract=staking_contract,
        )
        service_registry_token_utility = staking_manager.service_registry_token_utility(
            staking_contract=staking_contract,
        )
        min_staking_deposit = staking_manager.min_staking_deposit(
            staking_contract=staking_contract,
        )
        activity_checker = staking_manager.activity_checker(
            staking_contract=staking_contract,
        )

        return dict(
            agent_ids=agent_ids,
            service_registry=service_registry,
            staking_token=staking_token,
            service_registry_token_utility=service_registry_token_utility,
            min_staking_deposit=min_staking_deposit,
            activity_checker=activity_checker
        )

    def can_unstake(self, service_id: int, staking_contract: str) -> bool:
        """Can unstake the service?"""
        try:
            StakingManager(
                key=self.wallet.key_path,
                password=self.wallet.password,
                chain_type=self.chain_type,
            ).check_if_unstaking_possible(
                service_id=service_id,
                staking_contract=staking_contract,
            )
            return True
        except ValueError:
            return False

    def get_swap_data(self, service_id: int, multisig: str, owner_key: str) -> t.Dict:
        """Swap safe owner."""
        # TODO: Discuss implementation
        raise NotImplementedError()



def get_packed_signature_for_approved_hash(owners: t.Tuple[str]) -> bytes:
        """Get the packed signatures."""
        sorted_owners = sorted(owners, key=str.lower)
        signatures = b''
        for owner in sorted_owners:
            # Convert address to bytes and ensure it is 32 bytes long (left-padded with zeros)
            r_bytes = to_bytes(hexstr=owner[2:].rjust(64, '0'))

            # `s` as 32 zero bytes
            s_bytes = b'\x00' * 32

            # `v` as a single byte
            v_bytes = to_bytes(1)

            # Concatenate r, s, and v to form the packed signature
            packed_signature = r_bytes + s_bytes + v_bytes
            signatures += packed_signature

        return signatures


def get_reuse_multisig_from_safe_payload(  # pylint: disable=too-many-locals
    ledger_api: LedgerApi,
    chain_type: ChainType,
    service_id: int,
    master_safe: str,
) -> t.Tuple[Optional[str], Optional[t.Dict[str, t.Any]], Optional[str]]:
    """Reuse multisig."""
    _, multisig_address, _, threshold, *_ = get_service_info(
        ledger_api=ledger_api,
        chain_type=chain_type,
        token_id=service_id,
    )
    if multisig_address == NULL_ADDRESS:
        return None, None, "Cannot reuse multisig, No previous deployment exist!"

    multisend_address = ContractConfigs.get(MULTISEND_CONTRACT.name).contracts[
        chain_type
    ]
    multisig_instance = registry_contracts.gnosis_safe.get_instance(
        ledger_api=ledger_api,
        contract_address=multisig_address,
    )

    # Verify if the service was terminated properly or not
    old_owners = multisig_instance.functions.getOwners().call()
    if len(old_owners) != 1 or master_safe not in old_owners:
        return (
            None,
            None,
            "Service was not terminated properly, the service owner should be the only owner of the safe",
        )

    # Build multisend tx to add new instances as owners
    txs = []
    new_owners = t.cast(
        t.List[str],
        get_agent_instances(
            ledger_api=ledger_api,
            chain_type=chain_type,
            token_id=service_id,
        ).get("agentInstances"),
    )

    for _owner in new_owners:
        txs.append(
            {
                "to": multisig_address,
                "data": HexBytes(
                    bytes.fromhex(
                        multisig_instance.encodeABI(
                            fn_name="addOwnerWithThreshold",
                            args=[_owner, 1],
                        )[2:]
                    )
                ),
                "operation": MultiSendOperation.CALL,
                "value": 0,
            }
        )

    txs.append(
        {
            "to": multisig_address,
            "data": HexBytes(
                bytes.fromhex(
                    multisig_instance.encodeABI(
                        fn_name="removeOwner",
                        args=[new_owners[0], master_safe, 1],
                    )[2:]
                )
            ),
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }
    )

    txs.append(
        {
            "to": multisig_address,
            "data": HexBytes(
                bytes.fromhex(
                    multisig_instance.encodeABI(
                        fn_name="changeThreshold",
                        args=[threshold],
                    )[2:]
                )
            ),
            "operation": MultiSendOperation.CALL,
            "value": 0,
        }
    )

    multisend_tx = registry_contracts.multisend.get_multisend_tx(
        ledger_api=ledger_api,
        contract_address=multisend_address,
        txs=txs,
    )
    signature_bytes = get_packed_signature_for_approved_hash(owners=(master_safe, ))

    safe_tx_hash = registry_contracts.gnosis_safe.get_raw_safe_transaction_hash(
        ledger_api=ledger_api,
        contract_address=multisig_address,
        to_address=multisend_address,
        value=multisend_tx["value"],
        data=multisend_tx["data"],
        operation=1,
    ).get("tx_hash")
    approve_hash_data = multisig_instance.encodeABI(
        fn_name="approveHash",
        args=[
            safe_tx_hash,
        ],
    )
    approve_hash_message = {
        "to": multisig_address,
        "data": approve_hash_data[2:],
        "operation": MultiSendOperation.CALL,
        "value": 0,
    }

    safe_exec_data = multisig_instance.encodeABI(
        fn_name="execTransaction",
        args=[
            multisend_address,  # to address
            multisend_tx["value"],  # value
            multisend_tx["data"],  # data
            1,  # operation
            0,  # safe tx gas
            0,  # bas gas
            0,  # safe gas price
            NULL_ADDRESS,  # gas token
            NULL_ADDRESS,  # refund receiver
            signature_bytes,  # signatures
        ],
    )
    payload = multisig_address + safe_exec_data[2:]
    return payload, approve_hash_message, None

