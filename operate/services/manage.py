#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ------------------------------------------------------------------------------
#
#   Copyright 2024 Valory AG
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
"""Service manager."""

import asyncio
import logging
import traceback
import typing as t
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import aiohttp  # type: ignore
from aea.helpers.base import IPFSHash
from aea.helpers.logging import setup_logger
from autonomy.chain.base import registry_contracts

from operate.keys import Key, KeysManager
from operate.ledger import PUBLIC_RPCS
from operate.ledger.profiles import CONTRACTS, OLAS, STAKING
from operate.services.protocol import EthSafeTxBuilder, OnChainManager, StakingState
from operate.services.service import (
    Deployment,
    OnChainData,
    OnChainState,
    OnChainUserParams,
    Service,
)
from operate.wallet.master import MasterWalletManager


# pylint: disable=redefined-builtin

OPERATE = ".operate"
CONFIG = "config.json"
SERVICES = "services"
KEYS = "keys"
DEPLOYMENT = "deployment"
CONFIG = "config.json"
KEY = "master-key.txt"
KEYS_JSON = "keys.json"
DOCKER_COMPOSE_YAML = "docker-compose.yaml"
SERVICE_YAML = "service.yaml"
HTTP_OK = 200


async def check_service_health() -> bool:
    """Check the service health"""
    async with aiohttp.ClientSession() as session:
        async with session.get("http://localhost:8716/healthcheck") as resp:
            status = resp.status
            response_json = await resp.json()
            return status == HTTP_OK and response_json.get(
                "is_transitioning_fast", False
            )


class ServiceManager:
    """Service manager."""

    def __init__(
        self,
        path: Path,
        keys_manager: KeysManager,
        wallet_manager: MasterWalletManager,
        logger: t.Optional[logging.Logger] = None,
    ) -> None:
        """
        Initialze service manager

        :param path: Path to service storage.
        :param keys_manager: Keys manager.
        :param wallet_manager: Wallet manager instance.
        :param logger: logging.Logger object.
        """
        self.path = path
        self.keys_manager = keys_manager
        self.wallet_manager = wallet_manager
        self.logger = logger or setup_logger(name="operate.manager")

    def setup(self) -> None:
        """Setup service manager."""
        self.path.mkdir(exist_ok=True)

    @property
    def json(self) -> t.List[t.Dict]:
        """Returns the list of available services."""
        data = []
        for path in self.path.iterdir():
            if not path.name.startswith("bafybei"):
                continue
            service = Service.load(path=path)
            data.append(service.json)
        return data

    def exists(self, service: str) -> bool:
        """Check if service exists."""
        return (self.path / service).exists()

    def get_on_chain_manager(self, service: Service) -> OnChainManager:
        """Get OnChainManager instance."""
        return OnChainManager(
            rpc=service.ledger_config.rpc,
            wallet=self.wallet_manager.load(service.ledger_config.type),
            contracts=CONTRACTS[service.ledger_config.chain],
        )

    def get_eth_safe_tx_builder(self, service: Service) -> EthSafeTxBuilder:
        """Get EthSafeTxBuilder instance."""
        return EthSafeTxBuilder(
            rpc=service.ledger_config.rpc,
            wallet=self.wallet_manager.load(service.ledger_config.type),
            contracts=CONTRACTS[service.ledger_config.chain],
        )

    def create_or_load(
        self,
        hash: str,
        rpc: t.Optional[str] = None,
        on_chain_user_params: t.Optional[OnChainUserParams] = None,
        keys: t.Optional[t.List[Key]] = None,
    ) -> Service:
        """
        Create or load a service

        :param hash: Service hash
        :param rpc: RPC string
        :param on_chain_user_params: On-chain user parameters
        :param keys: Keys
        :return: Service instance
        """
        path = self.path / hash
        if path.exists():
            return Service.load(path=path)

        if rpc is None:
            raise ValueError("RPC cannot be None when creating a new service")

        if on_chain_user_params is None:
            raise ValueError(
                "On-chain user parameters cannot be None when creating a new service"
            )

        return Service.new(
            hash=hash,
            keys=keys or [],
            rpc=rpc,
            storage=self.path,
            on_chain_user_params=on_chain_user_params,
        )

    def deploy_service_onchain(  # pylint: disable=too-many-statements
        self,
        hash: str,
        update: bool = False,
    ) -> None:
        """
        Deploy as service on-chain

        :param hash: Service hash
        :param update: Update the existing deployment
        """
        self.logger.info("Loading service")
        service = self.create_or_load(hash=hash)
        user_params = service.chain_data.user_params
        keys = service.keys or [
            self.keys_manager.get(self.keys_manager.create())
            for _ in range(service.helper.config.number_of_agents)
        ]
        instances = [key.address for key in keys]
        ocm = self.get_on_chain_manager(service=service)
        if user_params.use_staking and not ocm.staking_slots_available(
            staking_contract=STAKING[service.ledger_config.chain]
        ):
            raise ValueError("No staking slots available")

        if user_params.use_staking and not ocm.staking_rewards_available(
            staking_contract=STAKING[service.ledger_config.chain]
        ):
            raise ValueError("No staking rewards available")

        if service.chain_data.token > -1:
            self.logger.info("Syncing service state")
            info = ocm.info(token_id=service.chain_data.token)
            service.chain_data.on_chain_state = OnChainState(info["service_state"])
            service.chain_data.instances = info["instances"]
            service.chain_data.multisig = info["multisig"]
            service.store()
        self.logger.info(f"Service state: {service.chain_data.on_chain_state.name}")

        if user_params.use_staking:
            self.logger.info("Checking staking compatibility")
            if service.chain_data.on_chain_state in (
                OnChainState.NOTMINTED,
                OnChainState.MINTED,
            ):
                required_olas = (
                    user_params.olas_cost_of_bond + user_params.olas_required_to_stake
                )
            elif service.chain_data.on_chain_state == OnChainState.ACTIVATED:
                required_olas = user_params.olas_required_to_stake
            else:
                required_olas = 0

            balance = (
                registry_contracts.erc20.get_instance(
                    ledger_api=ocm.ledger_api,
                    contract_address=OLAS[service.ledger_config.chain],
                )
                .functions.balanceOf(ocm.crypto.address)
                .call()
            )
            if balance < required_olas:
                raise ValueError(
                    "You don't have enough olas to stake, "
                    f"required olas: {required_olas}; your balance {balance}"
                )

        if service.chain_data.on_chain_state == OnChainState.NOTMINTED:
            self.logger.info("Minting service")
            service.chain_data.token = t.cast(
                int,
                ocm.mint(
                    package_path=service.service_path,
                    agent_id=user_params.agent_id,
                    number_of_slots=service.helper.config.number_of_agents,
                    cost_of_bond=(
                        user_params.olas_cost_of_bond
                        if user_params.use_staking
                        else user_params.cost_of_bond
                    ),
                    threshold=user_params.threshold,
                    nft=IPFSHash(user_params.nft),
                    update_token=service.chain_data.token if update else None,
                    token=(
                        OLAS[service.ledger_config.chain]
                        if user_params.use_staking
                        else None
                    ),
                ).get("token"),
            )
            service.chain_data.on_chain_state = OnChainState.MINTED
            service.store()

        info = ocm.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state == OnChainState.MINTED:
            self.logger.info("Activating service")
            ocm.activate(
                service_id=service.chain_data.token,
                token=(
                    OLAS[service.ledger_config.chain]
                    if user_params.use_staking
                    else None
                ),
            )
            service.chain_data.on_chain_state = OnChainState.ACTIVATED
            service.store()

        info = ocm.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state == OnChainState.ACTIVATED:
            self.logger.info("Registering service")
            ocm.register(
                service_id=service.chain_data.token,
                instances=instances,
                agents=[user_params.agent_id for _ in instances],
                token=(
                    OLAS[service.ledger_config.chain]
                    if user_params.use_staking
                    else None
                ),
            )
            service.chain_data.on_chain_state = OnChainState.REGISTERED
            service.keys = keys
            service.store()

        info = ocm.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state == OnChainState.REGISTERED:
            self.logger.info("Deploying service")
            ocm.deploy(
                service_id=service.chain_data.token,
                reuse_multisig=update,
                token=(
                    OLAS[service.ledger_config.chain]
                    if user_params.use_staking
                    else None
                ),
            )
            service.chain_data.on_chain_state = OnChainState.DEPLOYED
            service.store()

        info = ocm.info(token_id=service.chain_data.token)
        service.keys = keys
        service.chain_data = OnChainData(
            token=service.chain_data.token,
            instances=info["instances"],
            multisig=info["multisig"],
            staked=False,
            on_chain_state=service.chain_data.on_chain_state,
            user_params=service.chain_data.user_params,
        )
        service.store()

    def deploy_service_onchain_from_safe(  # pylint: disable=too-many-statements,too-many-locals
        self,
        hash: str,
        update: bool = False,
    ) -> None:
        """
        Deploy as service on-chain

        :param hash: Service hash
        :param update: Update the existing deployment
        """
        self.logger.info("Loading service")
        service = self.create_or_load(hash=hash)
        user_params = service.chain_data.user_params
        keys = service.keys or [
            self.keys_manager.get(self.keys_manager.create())
            for _ in range(service.helper.config.number_of_agents)
        ]
        instances = [key.address for key in keys]
        wallet = self.wallet_manager.load(service.ledger_config.type)
        sftxb = self.get_eth_safe_tx_builder(service=service)
        if user_params.use_staking and not sftxb.staking_slots_available(
            staking_contract=STAKING[service.ledger_config.chain]
        ):
            raise ValueError("No staking slots available")

        if service.chain_data.token > -1:
            self.logger.info("Syncing service state")
            info = sftxb.info(token_id=service.chain_data.token)
            service.chain_data.on_chain_state = OnChainState(info["service_state"])
            service.chain_data.instances = info["instances"]
            service.chain_data.multisig = info["multisig"]
            service.store()
        self.logger.info(f"Service state: {service.chain_data.on_chain_state.name}")

        if user_params.use_staking:
            self.logger.info("Checking staking compatibility")
            if service.chain_data.on_chain_state in (
                OnChainState.NOTMINTED,
                OnChainState.MINTED,
            ):
                required_olas = (
                    user_params.olas_cost_of_bond + user_params.olas_required_to_stake
                )
            elif service.chain_data.on_chain_state == OnChainState.ACTIVATED:
                required_olas = user_params.olas_required_to_stake
            else:
                required_olas = 0

            balance = (
                registry_contracts.erc20.get_instance(
                    ledger_api=sftxb.ledger_api,
                    contract_address=OLAS[service.ledger_config.chain],
                )
                .functions.balanceOf(wallet.safe)
                .call()
            )
            if balance < required_olas:
                raise ValueError(
                    "You don't have enough olas to stake, "
                    f"address: {wallet.safe}; required olas: {required_olas}; your balance: {balance}"
                )

        if service.chain_data.on_chain_state == OnChainState.NOTMINTED:
            self.logger.info("Minting service")
            receipt = (
                sftxb.new_tx()
                .add(
                    sftxb.get_mint_tx_data(
                        package_path=service.service_path,
                        agent_id=user_params.agent_id,
                        number_of_slots=service.helper.config.number_of_agents,
                        cost_of_bond=(
                            user_params.olas_cost_of_bond
                            if user_params.use_staking
                            else user_params.cost_of_bond
                        ),
                        threshold=user_params.threshold,
                        nft=IPFSHash(user_params.nft),
                        update_token=service.chain_data.token if update else None,
                        token=(
                            OLAS[service.ledger_config.chain]
                            if user_params.use_staking
                            else None
                        ),
                    )
                )
                .settle()
            )
            event_data, *_ = t.cast(
                t.Tuple,
                registry_contracts.service_registry.process_receipt(
                    ledger_api=sftxb.ledger_api,
                    contract_address="0x9338b5153AE39BB89f50468E608eD9d764B755fD",
                    event="CreateService",
                    receipt=receipt,
                ).get("events"),
            )
            service.chain_data.token = event_data["args"]["serviceId"]
            service.chain_data.on_chain_state = OnChainState.MINTED
            service.store()

        info = sftxb.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state == OnChainState.MINTED:
            cost_of_bond = user_params.cost_of_bond
            if user_params.use_staking:
                token_utility = "0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8"  # nosec
                olas_token = "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f"  # nosec
                self.logger.info(
                    f"Approving OLAS as bonding token from {wallet.safe} to {token_utility}"
                )
                cost_of_bond = (
                    registry_contracts.service_registry_token_utility.get_agent_bond(
                        ledger_api=sftxb.ledger_api,
                        contract_address=token_utility,
                        service_id=service.chain_data.token,
                        agent_id=user_params.agent_id,
                    ).get("bond")
                )
                sftxb.new_tx().add(
                    sftxb.get_olas_approval_data(
                        spender=token_utility,
                        amount=cost_of_bond,
                        olas_contract=olas_token,
                    )
                ).settle()
                token_utility_allowance = (
                    registry_contracts.erc20.get_instance(
                        ledger_api=sftxb.ledger_api,
                        contract_address=olas_token,
                    )
                    .functions.allowance(
                        wallet.safe,
                        token_utility,
                    )
                    .call()
                )
                self.logger.info(
                    f"Approved {token_utility_allowance} OLAS from {wallet.safe} to {token_utility}"
                )
                cost_of_bond = 1

            self.logger.info("Activating service")
            sftxb.new_tx().add(
                sftxb.get_activate_data(
                    service_id=service.chain_data.token,
                    cost_of_bond=cost_of_bond,
                )
            ).settle()
            service.chain_data.on_chain_state = OnChainState.ACTIVATED
            service.store()

        info = sftxb.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state == OnChainState.ACTIVATED:
            cost_of_bond = user_params.cost_of_bond
            if user_params.use_staking:
                token_utility = "0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8"  # nosec
                olas_token = "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f"  # nosec
                self.logger.info(
                    f"Approving OLAS as bonding token from {wallet.safe} to {token_utility}"
                )
                cost_of_bond = (
                    registry_contracts.service_registry_token_utility.get_agent_bond(
                        ledger_api=sftxb.ledger_api,
                        contract_address=token_utility,
                        service_id=service.chain_data.token,
                        agent_id=user_params.agent_id,
                    ).get("bond")
                )
                sftxb.new_tx().add(
                    sftxb.get_olas_approval_data(
                        spender=token_utility,
                        amount=cost_of_bond,
                        olas_contract=olas_token,
                    )
                ).settle()
                token_utility_allowance = (
                    registry_contracts.erc20.get_instance(
                        ledger_api=sftxb.ledger_api,
                        contract_address=olas_token,
                    )
                    .functions.allowance(
                        wallet.safe,
                        token_utility,
                    )
                    .call()
                )
                self.logger.info(
                    f"Approved {token_utility_allowance} OLAS from {wallet.safe} to {token_utility}"
                )
                cost_of_bond = 1

            self.logger.info(
                f"Registering service: {service.chain_data.token} -> {instances}"
            )
            sftxb.new_tx().add(
                sftxb.get_register_instances_data(
                    service_id=service.chain_data.token,
                    instances=instances,
                    agents=[user_params.agent_id for _ in instances],
                    cost_of_bond=cost_of_bond,
                )
            ).settle()
            service.chain_data.on_chain_state = OnChainState.REGISTERED
            service.keys = keys
            service.store()

        info = sftxb.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state == OnChainState.REGISTERED:
            self.logger.info("Deploying service")
            sftxb.new_tx().add(
                sftxb.get_deploy_data(
                    service_id=service.chain_data.token,
                    reuse_multisig=update,
                )
            ).settle()
            service.chain_data.on_chain_state = OnChainState.DEPLOYED
            service.store()

        info = sftxb.info(token_id=service.chain_data.token)
        service.keys = keys
        service.chain_data = OnChainData(
            token=service.chain_data.token,
            instances=info["instances"],
            multisig=info["multisig"],
            staked=False,
            on_chain_state=service.chain_data.on_chain_state,
            user_params=service.chain_data.user_params,
        )
        service.store()

    def terminate_service_on_chain(self, hash: str) -> None:
        """
        Terminate service on-chain

        :param hash: Service hash
        """
        service = self.create_or_load(hash=hash)
        ocm = self.get_on_chain_manager(service=service)
        info = ocm.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state != OnChainState.DEPLOYED:
            self.logger.info("Cannot terminate service")
            return

        self.logger.info("Terminating service")
        ocm.terminate(
            service_id=service.chain_data.token,
            token=(
                OLAS[service.ledger_config.chain]
                if service.chain_data.user_params.use_staking
                else None
            ),
        )
        service.chain_data.on_chain_state = OnChainState.TERMINATED
        service.store()

    def terminate_service_on_chain_from_safe(self, hash: str) -> None:
        """
        Terminate service on-chain

        :param hash: Service hash
        """
        service = self.create_or_load(hash=hash)
        sftxb = self.get_eth_safe_tx_builder(service=service)
        info = sftxb.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state != OnChainState.DEPLOYED:
            self.logger.info("Cannot terminate service")
            return

        self.logger.info("Terminating service")
        sftxb.new_tx().add(
            sftxb.get_terminate_data(
                service_id=service.chain_data.token,
            )
        ).settle()
        service.chain_data.on_chain_state = OnChainState.TERMINATED
        service.store()

    def unbond_service_on_chain(self, hash: str) -> None:
        """
        Unbond service on-chain

        :param hash: Service hash
        """
        service = self.create_or_load(hash=hash)
        ocm = self.get_on_chain_manager(service=service)
        info = ocm.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state != OnChainState.TERMINATED:
            self.logger.info("Cannot unbond service")
            return

        self.logger.info("Unbonding service")
        ocm.unbond(
            service_id=service.chain_data.token,
            token=(
                OLAS[service.ledger_config.chain]
                if service.chain_data.user_params.use_staking
                else None
            ),
        )
        service.chain_data.on_chain_state = OnChainState.UNBONDED
        service.store()

    def unbond_service_on_chain_from_safe(self, hash: str) -> None:
        """
        Terminate service on-chain

        :param hash: Service hash
        """
        service = self.create_or_load(hash=hash)
        sftxb = self.get_eth_safe_tx_builder(service=service)
        info = sftxb.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state != OnChainState.TERMINATED:
            self.logger.info("Cannot unbond service")
            return

        self.logger.info("Unbonding service")
        sftxb.new_tx().add(
            sftxb.get_unbond_data(
                service_id=service.chain_data.token,
            )
        ).settle()
        service.chain_data.on_chain_state = OnChainState.TERMINATED
        service.store()

    def stake_service_on_chain(self, hash: str) -> None:
        """
        Stake service on-chain

        :param hash: Service hash
        """
        service = self.create_or_load(hash=hash)
        if not service.chain_data.user_params.use_staking:
            self.logger.info("Cannot stake service, `use_staking` is set to false")
            return

        ocm = self.get_on_chain_manager(service=service)
        info = ocm.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state != OnChainState.DEPLOYED:
            self.logger.info("Cannot stake service, it's not in deployed state")
            return

        state = ocm.staking_status(
            service_id=service.chain_data.token,
            staking_contract=STAKING[service.ledger_config.chain],
        )
        self.logger.info(f"Checking staking status for: {service.chain_data.token}")
        if state == StakingState.STAKED:
            self.logger.info(f"{service.chain_data.token} is already staked")
            service.chain_data.staked = True
            service.store()
            return

        if state == StakingState.EVICTED:
            self.logger.info(f"{service.chain_data.token} has been evicted")
            service.chain_data.staked = True
            service.store()
            self.unstake_service_on_chain(hash=hash)

        self.logger.info(f"Staking service: {service.chain_data.token}")
        ocm.stake(
            service_id=service.chain_data.token,
            service_registry=CONTRACTS[service.ledger_config.chain]["service_registry"],
            staking_contract=STAKING[service.ledger_config.chain],
        )
        service.chain_data.staked = True
        service.store()

    def stake_service_on_chain_from_safe(self, hash: str) -> None:
        """
        Stake service on-chain

        :param hash: Service hash
        """
        service = self.create_or_load(hash=hash)
        if not service.chain_data.user_params.use_staking:
            self.logger.info("Cannot stake service, `use_staking` is set to false")
            return

        sftxb = self.get_eth_safe_tx_builder(service=service)
        info = sftxb.info(token_id=service.chain_data.token)
        service.chain_data.on_chain_state = OnChainState(info["service_state"])

        if service.chain_data.on_chain_state != OnChainState.DEPLOYED:
            self.logger.info("Cannot stake service, it's not in deployed state")
            return

        state = sftxb.staking_status(
            service_id=service.chain_data.token,
            staking_contract=STAKING[service.ledger_config.chain],
        )
        self.logger.info(f"Checking staking status for: {service.chain_data.token}")
        if state == StakingState.STAKED:
            self.logger.info(f"{service.chain_data.token} is already staked")
            service.chain_data.staked = True
            service.store()
            return

        if state == StakingState.EVICTED:
            self.logger.info(f"{service.chain_data.token} has been evicted")
            service.chain_data.staked = True
            service.store()
            self.unstake_service_on_chain_from_safe(hash=hash)

        self.logger.info(f"Approving staking: {service.chain_data.token}")
        sftxb.new_tx().add(
            sftxb.get_staking_approval_data(
                service_id=service.chain_data.token,
                service_registry=CONTRACTS[service.ledger_config.chain][
                    "service_registry"
                ],
                staking_contract=STAKING[service.ledger_config.chain],
            )
        ).settle()

        self.logger.info(f"Staking service: {service.chain_data.token}")
        sftxb.new_tx().add(
            sftxb.get_staking_data(
                service_id=service.chain_data.token,
                staking_contract=STAKING[service.ledger_config.chain],
            )
        ).settle()
        service.chain_data.staked = True
        service.store()

    def unstake_service_on_chain(self, hash: str) -> None:
        """
        Unbond service on-chain

        :param hash: Service hash
        """
        service = self.create_or_load(hash=hash)
        if not service.chain_data.user_params.use_staking:
            self.logger.info("Cannot unstake service, `use_staking` is set to false")
            return

        ocm = self.get_on_chain_manager(service=service)
        state = ocm.staking_status(
            service_id=service.chain_data.token,
            staking_contract=STAKING[service.ledger_config.chain],
        )
        self.logger.info(
            f"Staking status for service {service.chain_data.token}: {state}"
        )
        if state not in {StakingState.STAKED, StakingState.EVICTED}:
            self.logger.info("Cannot unstake service, it's not staked")
            service.chain_data.staked = False
            service.store()
            return

        self.logger.info(f"Unstaking service: {service.chain_data.token}")
        ocm.unstake(
            service_id=service.chain_data.token,
            staking_contract=STAKING[service.ledger_config.chain],
        )
        service.chain_data.staked = False
        service.store()

    def unstake_service_on_chain_from_safe(self, hash: str) -> None:
        """
        Unbond service on-chain

        :param hash: Service hash
        """
        service = self.create_or_load(hash=hash)
        if not service.chain_data.user_params.use_staking:
            self.logger.info("Cannot unstake service, `use_staking` is set to false")
            return

        sftxb = self.get_eth_safe_tx_builder(service=service)
        state = sftxb.staking_status(
            service_id=service.chain_data.token,
            staking_contract=STAKING[service.ledger_config.chain],
        )
        self.logger.info(
            f"Staking status for service {service.chain_data.token}: {state}"
        )
        if state not in {StakingState.STAKED, StakingState.EVICTED}:
            self.logger.info("Cannot unstake service, it's not staked")
            service.chain_data.staked = False
            service.store()
            return

        self.logger.info(f"Unstaking service: {service.chain_data.token}")
        sftxb.new_tx().add(
            sftxb.get_unstaking_data(
                service_id=service.chain_data.token,
                staking_contract=STAKING[service.ledger_config.chain],
            )
        ).settle()
        service.chain_data.staked = False
        service.store()

    def fund_service(  # pylint: disable=too-many-arguments
        self,
        hash: str,
        rpc: t.Optional[str] = None,
        agent_topup: t.Optional[float] = None,
        safe_topup: t.Optional[float] = None,
        agent_fund_threshold: t.Optional[float] = None,
        safe_fund_treshold: t.Optional[float] = None,
        from_safe: bool = True,
    ) -> None:
        """Fund service if required."""
        service = self.create_or_load(hash=hash)
        wallet = self.wallet_manager.load(ledger_type=service.ledger_config.type)
        ledger_api = wallet.ledger_api(chain_type=service.ledger_config.chain, rpc=rpc)
        agent_fund_threshold = (
            agent_fund_threshold
            or service.chain_data.user_params.fund_requirements.agent
        )

        for key in service.keys:
            agent_balance = ledger_api.get_balance(address=key.address)
            self.logger.info(f"Agent {key.address} balance: {agent_balance}")
            self.logger.info(f"Required balance: {agent_fund_threshold}")
            if agent_balance < agent_fund_threshold:
                self.logger.info("Funding agents")
                to_transfer = (
                    agent_topup
                    or service.chain_data.user_params.fund_requirements.agent
                )
                self.logger.info(f"Transferring {to_transfer} units to {key.address}")
                wallet.transfer(
                    to=key.address,
                    amount=int(to_transfer),
                    chain_type=service.ledger_config.chain,
                    from_safe=from_safe,
                )

        safe_balanace = ledger_api.get_balance(service.chain_data.multisig)
        safe_fund_treshold = (
            safe_fund_treshold or service.chain_data.user_params.fund_requirements.safe
        )
        self.logger.info(f"Safe {service.chain_data.multisig} balance: {safe_balanace}")
        self.logger.info(f"Required balance: {safe_fund_treshold}")
        if safe_balanace < safe_fund_treshold:
            self.logger.info("Funding safe")
            to_transfer = (
                safe_topup or service.chain_data.user_params.fund_requirements.safe
            )
            self.logger.info(
                f"Transferring {to_transfer} units to {service.chain_data.multisig}"
            )
            wallet.transfer(
                to=t.cast(str, service.chain_data.multisig),
                amount=int(to_transfer),
                chain_type=service.ledger_config.chain,
            )

    async def funding_job(
        self,
        hash: str,
        loop: t.Optional[asyncio.AbstractEventLoop] = None,
        from_safe: bool = True,
    ) -> None:
        """Start a background funding job."""
        loop = loop or asyncio.get_event_loop()
        service = self.create_or_load(hash=hash)
        with ThreadPoolExecutor() as executor:
            while True:
                try:
                    await loop.run_in_executor(
                        executor,
                        self.fund_service,
                        hash,  # Service hash
                        PUBLIC_RPCS[service.ledger_config.chain],  # RPC
                        100000000000000000,  # agent_topup
                        2000000000000000000,  # safe_topup
                        50000000000000000,  # agent_fund_threshold
                        500000000000000000,  # safe_fund_treshold
                        from_safe,
                    )
                except Exception:  # pylint: disable=broad-except
                    logging.info(
                        f"Error occured while funding the service\n{traceback.format_exc()}"
                    )
                await asyncio.sleep(60)

    async def healthcheck_job(
        self,
        hash: str,
    ) -> None:
        """Start a background funding job."""
        failed_health_checks = 0

        while True:
            try:
                # Check the service health
                healthy = await check_service_health()
                # Restart the service if the health failed 5 times in a row
                if not healthy:
                    failed_health_checks += 1
                else:
                    failed_health_checks = 0
                if failed_health_checks >= 4:
                    self.stop_service_locally(hash=hash)
                    self.deploy_service_locally(hash=hash)

            except Exception:  # pylint: disable=broad-except
                logging.info(
                    f"Error occured while checking the service health\n{traceback.format_exc()}"
                )
            await asyncio.sleep(30)

    def deploy_service_locally(self, hash: str, force: bool = True) -> Deployment:
        """
        Deploy service locally

        :param hash: Service hash
        :param force: Remove previous deployment and start a new one.
        :return: Deployment instance
        """
        deployment = self.create_or_load(hash=hash).deployment
        deployment.build(force=force)
        deployment.start()
        return deployment

    def stop_service_locally(self, hash: str, delete: bool = False) -> Deployment:
        """
        Stop service locally

        :param hash: Service hash
        :param delete: Delete local deployment.
        :return: Deployment instance
        """
        deployment = self.create_or_load(hash=hash).deployment
        deployment.stop()
        if delete:
            deployment.delete()
        return deployment

    def update_service(
        self,
        old_hash: str,
        new_hash: str,
        rpc: t.Optional[str] = None,
        on_chain_user_params: t.Optional[OnChainUserParams] = None,
        from_safe: bool = True,  # pylint: disable=unused-argument
    ) -> Service:
        """Update a service."""
        old_service = self.create_or_load(
            hash=old_hash,
        )
        # TODO code for updating service commented until safe swap transaction is implemented
        # This is a temporary fix that will only work for services that have not started the
        # update flow. Services having started the update flow must need to manually change
        # the Safe owner to the Operator.
        # (  # noqa: E800
        #     self.unstake_service_on_chain_from_safe  # noqa: E800
        #     if from_safe  # noqa: E800
        #     else self.unstake_service_on_chain  # noqa: E800
        # )(  # noqa: E800
        #     hash=old_hash,  # noqa: E800
        # )  # noqa: E800
        # (  # noqa: E800
        #     self.terminate_service_on_chain_from_safe  # noqa: E800
        #     if from_safe  # noqa: E800
        #     else self.terminate_service_on_chain  # noqa: E800
        # )(  # noqa: E800
        #     hash=old_hash,  # noqa: E800
        # )  # noqa: E800
        # (  # noqa: E800
        #     self.unbond_service_on_chain_from_safe  # noqa: E800
        #     if from_safe  # noqa: E800
        #     else self.unbond_service_on_chain  # noqa: E800
        # )(  # noqa: E800
        #     hash=old_hash,  # noqa: E800
        # )  # noqa: E800

        # owner, *_ = old_service.chain_data.instances  # noqa: E800
        # if from_safe:  # noqa: E800
        #     sftx = self.get_eth_safe_tx_builder(service=old_service)  # noqa: E800
        #     sftx.new_tx().add(  # noqa: E800
        #         sftx.get_swap_data(  # noqa: E800
        #             service_id=old_service.chain_data.token,  # noqa: E800
        #             multisig=old_service.chain_data.multisig,  # noqa: E800
        #             owner_key=str(self.keys_manager.get(key=owner).private_key),  # noqa: E800
        #         )  # noqa: E800
        #     ).settle()  # noqa: E800
        # else:  # noqa: E800
        #     ocm = self.get_on_chain_manager(service=old_service)  # noqa: E800
        #     ocm.swap(  # noqa: E800
        #         service_id=old_service.chain_data.token,  # noqa: E800
        #         multisig=old_service.chain_data.multisig,  # noqa: E800
        #         owner_key=str(self.keys_manager.get(key=owner).private_key),  # noqa: E800
        #     )  # noqa: E800

        new_service = self.create_or_load(
            hash=new_hash,
            rpc=rpc or old_service.ledger_config.rpc,
            on_chain_user_params=on_chain_user_params
            or old_service.chain_data.user_params,
        )
        new_service.keys = old_service.keys
        new_service.chain_data = old_service.chain_data
        new_service.ledger_config = old_service.ledger_config
        new_service.chain_data.on_chain_state = OnChainState.NOTMINTED
        new_service.store()
        old_service.delete()
        return new_service
