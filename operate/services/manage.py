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
import json
import logging
import os
import shutil
import time
import traceback
import typing as t
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from pathlib import Path

import requests
from aea.helpers.base import IPFSHash
from aea.helpers.logging import setup_logger
from aea_ledger_ethereum import EthereumCrypto
from autonomy.chain.base import registry_contracts

from operate.constants import WRAPPED_NATIVE_ASSET, ZERO_ADDRESS
from operate.keys import Key, KeysManager
from operate.ledger import PUBLIC_RPCS
from operate.ledger.profiles import CONTRACTS, OLAS, STAKING, WXDAI
from operate.operate_types import Chain, FundingValues, LedgerConfig, ServiceTemplate
from operate.services.protocol import EthSafeTxBuilder, OnChainManager, StakingState
from operate.services.service import (
    ChainConfig,
    DELETE_PREFIX,
    Deployment,
    NON_EXISTENT_TOKEN,
    OnChainData,
    OnChainState,
    SERVICE_CONFIG_PREFIX,
    Service,
)
from operate.services.utils.memeooorr import get_twitter_cookies
from operate.utils.gnosis import NULL_ADDRESS, drain_signer, get_asset_balance
from operate.utils.gnosis import transfer as transfer_from_safe
from operate.utils.gnosis import transfer_erc20_from_safe
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
URI_HASH_POSITION = 7
IPFS_GATEWAY = "https://gateway.autonolas.tech/ipfs/"


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

    def _get_all_services(self) -> t.List[Service]:
        services = []
        for path in self.path.iterdir():
            if not path.name.startswith(SERVICE_CONFIG_PREFIX):
                continue
            try:
                service = Service.load(path=path)
                services.append(service)
            except ValueError as e:
                raise e
            except Exception as e:  # pylint: disable=broad-except
                self.logger.error(
                    f"Failed to load service: {path.name}. Exception {e}: {traceback.format_exc()}"
                )
                # Rename the invalid path
                timestamp = int(time.time())
                invalid_path = path.parent / f"invalid_{timestamp}_{path.name}"
                os.rename(path, invalid_path)
                self.logger.info(
                    f"Renamed invalid service: {path.name} to {invalid_path.name}"
                )

        return services

    @property
    def json(self) -> t.List[t.Dict]:
        """Returns the list of available services."""
        return [service.json for service in self._get_all_services()]

    def exists(self, service_config_id: str) -> bool:
        """Check if service exists."""
        return (self.path / service_config_id).exists()

    def get_on_chain_manager(self, ledger_config: LedgerConfig) -> OnChainManager:
        """Get OnChainManager instance."""
        return OnChainManager(
            rpc=ledger_config.rpc,
            wallet=self.wallet_manager.load(ledger_config.chain.ledger_type),
            contracts=CONTRACTS[ledger_config.chain],
        )

    def get_eth_safe_tx_builder(self, ledger_config: LedgerConfig) -> EthSafeTxBuilder:
        """Get EthSafeTxBuilder instance."""
        return EthSafeTxBuilder(
            rpc=ledger_config.rpc,
            wallet=self.wallet_manager.load(ledger_config.chain.ledger_type),
            contracts=CONTRACTS[ledger_config.chain],
        )

    def load_or_create(
        self,
        hash: str,
        service_template: t.Optional[ServiceTemplate] = None,
        keys: t.Optional[t.List[Key]] = None,
    ) -> Service:
        """
        Create or load a service

        :param hash: Service hash
        :param service_template: Service template
        :param keys: Keys
        :return: Service instance
        """
        path = self.path / hash
        if path.exists():
            service = Service.load(path=path)

            if service_template is not None:
                service.update_user_params_from_template(
                    service_template=service_template
                )

            return service

        if service_template is None:
            raise ValueError(
                "'service_template' cannot be None when creating a new service"
            )

        service = Service.new(
            keys=keys or [],
            storage=self.path,
            service_template=service_template,
        )

        if not service.keys:
            service.keys = [
                self.keys_manager.get(self.keys_manager.create())
                for _ in range(service.helper.config.number_of_agents)
            ]
            service.store()

        return service

    def load(
        self,
        service_config_id: str,
    ) -> Service:
        """
        Load a service

        :param service_id: Service id
        :return: Service instance
        """
        path = self.path / service_config_id
        return Service.load(path=path)

    def create(
        self,
        service_template: ServiceTemplate,
        keys: t.Optional[t.List[Key]] = None,
    ) -> Service:
        """
        Create a service

        :param service_template: Service template
        :param keys: Keys
        :return: Service instance
        """
        service = Service.new(
            keys=keys or [],
            storage=self.path,
            service_template=service_template,
        )

        if not service.keys:
            service.keys = [
                self.keys_manager.get(self.keys_manager.create())
                for _ in range(service.helper.config.number_of_agents)
            ]
            service.store()

        return service

    def _get_on_chain_state(self, service: Service, chain: str) -> OnChainState:
        chain_config = service.chain_configs[chain]
        chain_data = chain_config.chain_data
        ledger_config = chain_config.ledger_config
        if chain_data.token == NON_EXISTENT_TOKEN:
            service_state = OnChainState.NON_EXISTENT
            chain_data.on_chain_state = service_state
            service.store()
            return service_state

        sftxb = self.get_eth_safe_tx_builder(ledger_config=ledger_config)
        info = sftxb.info(token_id=chain_data.token)
        service_state = OnChainState(info["service_state"])
        chain_data.on_chain_state = service_state
        service.store()
        return service_state

    def _get_on_chain_metadata(self, chain_config: ChainConfig) -> t.Dict:
        chain_data = chain_config.chain_data
        ledger_config = chain_config.ledger_config
        if chain_data.token == NON_EXISTENT_TOKEN:
            return {}

        sftxb = self.get_eth_safe_tx_builder(ledger_config=ledger_config)
        info = sftxb.info(token_id=chain_data.token)
        config_hash = info["config_hash"]
        res = requests.get(f"{IPFS_GATEWAY}f01701220{config_hash}", timeout=30)
        if res.status_code == 200:
            return res.json()
        raise ValueError(
            f"Something went wrong while trying to get the on-chain metadata from IPFS: {res}"
        )

    def deploy_service_onchain(  # pylint: disable=too-many-statements,too-many-locals
        self,
        service_config_id: str,
    ) -> None:
        """Deploy service on-chain"""
        # TODO This method has not been thoroughly reviewed. Deprecated usage in favour of Safe version.

        service = self.load(service_config_id=service_config_id)
        for chain in service.chain_configs.keys():
            self._deploy_service_onchain(
                service_config_id=service_config_id,
                chain=chain,
            )

    def _deploy_service_onchain(  # pylint: disable=too-many-statements,too-many-locals
        self,
        service_config_id: str,
        chain: str,
    ) -> None:
        """Deploy as service on-chain"""
        # TODO This method has not been thoroughly reviewed. Deprecated usage in favour of Safe version.

        self.logger.info(f"_deploy_service_onchain {chain=}")
        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        user_params = chain_config.chain_data.user_params
        keys = service.keys
        instances = [key.address for key in keys]
        ocm = self.get_on_chain_manager(ledger_config=ledger_config)

        # TODO fix this
        os.environ["CUSTOM_CHAIN_RPC"] = ledger_config.rpc
        os.environ[
            "OPEN_AUTONOMY_SUBGRAPH_URL"
        ] = "https://subgraph.autonolas.tech/subgraphs/name/autonolas-staging"

        current_agent_id = None
        if chain_data.token > -1:
            self.logger.info("Syncing service state")
            info = ocm.info(token_id=chain_data.token)
            chain_data.on_chain_state = OnChainState(info["service_state"])
            chain_data.instances = info["instances"]
            chain_data.multisig = info["multisig"]
            service.store()
        self.logger.info(f"Service state: {chain_data.on_chain_state.name}")

        if user_params.use_staking:
            staking_params = ocm.get_staking_params(
                staking_contract=STAKING[ledger_config.chain][
                    user_params.staking_program_id
                ],
            )
        else:  # TODO fix this - using pearl beta params
            staking_params = dict(  # nosec
                agent_ids=[25],
                service_registry="0x9338b5153AE39BB89f50468E608eD9d764B755fD",  # nosec
                staking_token="0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f",  # nosec
                service_registry_token_utility="0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8",  # nosec
                min_staking_deposit=20000000000000000000,
                activity_checker="0x155547857680A6D51bebC5603397488988DEb1c8",  # nosec
            )

        if user_params.use_staking:
            self.logger.info("Checking staking compatibility")

            # TODO: Missing check when the service is currently staked in a program, but needs to be staked
            # in a different target program. The In this case, balance = currently staked balance + safe balance

            if chain_data.on_chain_state in (
                OnChainState.NON_EXISTENT,
                OnChainState.PRE_REGISTRATION,
            ):
                required_olas = (
                    staking_params["min_staking_deposit"]
                    + staking_params["min_staking_deposit"]  # bond = staking
                )
            elif chain_data.on_chain_state == OnChainState.ACTIVE_REGISTRATION:
                required_olas = staking_params["min_staking_deposit"]
            else:
                required_olas = 0

            balance = (
                registry_contracts.erc20.get_instance(
                    ledger_api=ocm.ledger_api,
                    contract_address=OLAS[ledger_config.chain],
                )
                .functions.balanceOf(ocm.crypto.address)
                .call()
            )
            if balance < required_olas:
                raise ValueError(
                    "You don't have enough olas to stake, "
                    f"required olas: {required_olas}; your balance {balance}"
                )

        on_chain_metadata = self._get_on_chain_metadata(chain_config=chain_config)
        on_chain_hash = on_chain_metadata.get("code_uri", "")[URI_HASH_POSITION:]
        on_chain_description = on_chain_metadata.get("description")

        current_agent_bond = staking_params[
            "min_staking_deposit"
        ]  # TODO fixme, read from service registry token utility contract
        is_first_mint = (
            self._get_on_chain_state(service=service, chain=chain)
            == OnChainState.NON_EXISTENT
        )
        is_update = (
            (not is_first_mint)
            and (on_chain_hash is not None)
            and (
                on_chain_hash != service.hash
                or current_agent_id != staking_params["agent_ids"][0]
                or current_agent_bond != staking_params["min_staking_deposit"]
                or on_chain_description != service.description
            )
        )
        current_staking_program = self._get_current_staking_program(
            chain_data, ledger_config, ocm  # type: ignore  # FIXME
        )

        self.logger.info(f"{current_staking_program=}")
        self.logger.info(f"{user_params.staking_program_id=}")
        self.logger.info(f"{on_chain_hash=}")
        self.logger.info(f"{service.hash=}")
        self.logger.info(f"{current_agent_id=}")
        self.logger.info(f"{staking_params['agent_ids'][0]=}")
        self.logger.info(f"{is_first_mint=}")
        self.logger.info(f"{is_update=}")

        if chain_data.on_chain_state == OnChainState.NON_EXISTENT:
            self.logger.info("Minting service")
            chain_data.token = t.cast(
                int,
                ocm.mint(
                    package_path=service.service_path,
                    agent_id=staking_params["agent_ids"][0],
                    number_of_slots=service.helper.config.number_of_agents,
                    cost_of_bond=(
                        staking_params["min_staking_deposit"]
                        if user_params.use_staking
                        else user_params.cost_of_bond
                    ),
                    threshold=user_params.threshold,
                    nft=IPFSHash(user_params.nft),
                    update_token=chain_data.token if is_update else None,
                    token=(
                        OLAS[ledger_config.chain] if user_params.use_staking else None
                    ),
                    metadata_description=service.description,
                ).get("token"),
            )
            chain_data.on_chain_state = OnChainState.PRE_REGISTRATION
            service.store()

        info = ocm.info(token_id=chain_data.token)
        chain_data.on_chain_state = OnChainState(info["service_state"])

        if chain_data.on_chain_state == OnChainState.PRE_REGISTRATION:
            self.logger.info("Activating service")
            ocm.activate(
                service_id=chain_data.token,
                token=(OLAS[ledger_config.chain] if user_params.use_staking else None),
            )
            chain_data.on_chain_state = OnChainState.ACTIVE_REGISTRATION
            service.store()

        info = ocm.info(token_id=chain_data.token)
        chain_data.on_chain_state = OnChainState(info["service_state"])

        if chain_data.on_chain_state == OnChainState.ACTIVE_REGISTRATION:
            self.logger.info("Registering agent instances")
            agent_id = staking_params["agent_ids"][0]
            ocm.register(
                service_id=chain_data.token,
                instances=instances,
                agents=[agent_id for _ in instances],
                token=(OLAS[ledger_config.chain] if user_params.use_staking else None),
            )
            chain_data.on_chain_state = OnChainState.FINISHED_REGISTRATION
            service.store()

        info = ocm.info(token_id=chain_data.token)
        chain_data.on_chain_state = OnChainState(info["service_state"])

        if chain_data.on_chain_state == OnChainState.FINISHED_REGISTRATION:
            self.logger.info("Deploying service")
            ocm.deploy(
                service_id=chain_data.token,
                reuse_multisig=is_update,
                token=(OLAS[ledger_config.chain] if user_params.use_staking else None),
            )
            chain_data.on_chain_state = OnChainState.DEPLOYED
            service.store()

        info = ocm.info(token_id=chain_data.token)
        chain_data = OnChainData(
            token=chain_data.token,
            instances=info["instances"],
            multisig=info["multisig"],
            staked=False,
            on_chain_state=chain_data.on_chain_state,
            user_params=chain_data.user_params,
        )
        service.store()

    def deploy_service_onchain_from_safe(  # pylint: disable=too-many-statements,too-many-locals
        self,
        service_config_id: str,
    ) -> None:
        """Deploy as service on-chain"""

        service = self.load(service_config_id=service_config_id)
        for chain in service.chain_configs.keys():
            self._deploy_service_onchain_from_safe(
                service_config_id=service_config_id,
                chain=chain,
            )

    def _deploy_service_onchain_from_safe(  # pylint: disable=too-many-statements,too-many-locals
        self,
        service_config_id: str,
        chain: str,
    ) -> None:
        """Deploy service on-chain"""

        self.logger.info(f"_deploy_service_onchain_from_safe {chain=}")
        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        user_params = chain_config.chain_data.user_params
        keys = service.keys
        instances = [key.address for key in keys]
        wallet = self.wallet_manager.load(ledger_config.chain.ledger_type)
        sftxb = self.get_eth_safe_tx_builder(ledger_config=ledger_config)
        safe = wallet.safes[Chain(chain)]
        # TODO fix this
        os.environ["CUSTOM_CHAIN_RPC"] = ledger_config.rpc

        current_agent_id = None
        if chain_data.token > -1:
            self.logger.info("Syncing service state")
            info = sftxb.info(token_id=chain_data.token)
            chain_data.on_chain_state = OnChainState(info["service_state"])
            chain_data.instances = info["instances"]
            chain_data.multisig = info["multisig"]
            current_agent_id = info["canonical_agents"][0]  # TODO Allow multiple agents
            service.store()
        self.logger.info(f"Service state: {chain_data.on_chain_state.name}")

        if user_params.use_staking:
            staking_params = sftxb.get_staking_params(
                staking_contract=STAKING[ledger_config.chain][
                    user_params.staking_program_id
                ],
            )
        else:
            staking_params = dict(  # nosec
                staking_contract=NULL_ADDRESS,
                agent_ids=[user_params.agent_id],
                service_registry="0x9338b5153AE39BB89f50468E608eD9d764B755fD",  # nosec
                staking_token=NULL_ADDRESS,  # nosec
                service_registry_token_utility="0xa45E64d13A30a51b91ae0eb182e88a40e9b18eD8",  # nosec
                min_staking_deposit=20000000000000000000,
                activity_checker=NULL_ADDRESS,  # nosec
                agent_mech="0x77af31De935740567Cf4fF1986D04B2c964A786a",  # nosec
            )

        # TODO A customized, arbitrary computation mechanism should be devised.
        env_var_to_value = {}
        if chain == service.home_chain:
            env_var_to_value.update(
                {
                    "ETHEREUM_LEDGER_RPC": PUBLIC_RPCS[Chain.ETHEREUM],
                    "GNOSIS_LEDGER_RPC": PUBLIC_RPCS[Chain.GNOSIS],
                    "BASE_LEDGER_RPC": PUBLIC_RPCS[Chain.BASE],
                    "CELO_LEDGER_RPC": PUBLIC_RPCS[Chain.CELO],
                    "OPTIMISM_LEDGER_RPC": PUBLIC_RPCS[Chain.OPTIMISTIC],
                    "MODE_LEDGER_RPC": PUBLIC_RPCS[Chain.MODE],
                    "STAKING_CONTRACT_ADDRESS": staking_params.get("staking_contract"),
                    "STAKING_TOKEN_CONTRACT_ADDRESS": staking_params.get(
                        "staking_contract"
                    ),
                    "MECH_MARKETPLACE_CONFIG": (
                        f'{{"mech_marketplace_address":"0x4554fE75c1f5576c1d7F765B2A036c199Adae329",'
                        f'"priority_mech_address":"{staking_params.get("agent_mech")}",'
                        f'"priority_mech_staking_instance_address":"0x998dEFafD094817EF329f6dc79c703f1CF18bC90",'
                        f'"priority_mech_service_id":975,'
                        f'"requester_staking_instance_address":"{staking_params.get("staking_contract")}",'
                        f'"response_timeout":300}}'
                    ),
                    "MECH_ACTIVITY_CHECKER_CONTRACT": staking_params.get(
                        "activity_checker"
                    ),
                    "MECH_CONTRACT_ADDRESS": staking_params.get("agent_mech"),
                    "MECH_REQUEST_PRICE": "10000000000000000",
                    "USE_MECH_MARKETPLACE": str(
                        "mech_marketplace"
                        in service.chain_configs[
                            service.home_chain
                        ].chain_data.user_params.staking_program_id
                    ),
                    "REQUESTER_STAKING_INSTANCE_ADDRESS": staking_params.get(
                        "staking_contract"
                    ),
                    "PRIORITY_MECH_ADDRESS": staking_params.get("agent_mech"),
                }
            )

        # TODO: yet another agent specific logic for memeooorr, which should be abstracted
        if all(
            var in service.env_variables
            for var in [
                "TWIKIT_USERNAME",
                "TWIKIT_EMAIL",
                "TWIKIT_PASSWORD",
                "TWIKIT_COOKIES",
                "TWIKIT_COOKIES_PATH",
            ]
        ):
            # TODO: This is possibly not a good idea: we are setting up a computed variable based on
            # the value passed in the template.
            db_path = (
                service.path
                / "persistent_data"
                / service.env_variables["TWIKIT_USERNAME"]["value"]
                / "memeooorr.db"
            )
            cookies_path = (
                service.path
                / "persistent_data"
                / service.env_variables["TWIKIT_USERNAME"]["value"]
                / "twikit_cookies.json"
            )

            # Patch: Move existing configurations to the new location
            old_db_path = service.path / "persistent_data" / "memeooorr.db"
            old_cookies_path = service.path / "persistent_data" / "twikit_cookies.json"

            for old_path, new_path in [
                (old_db_path, db_path),
                (old_cookies_path, cookies_path),
            ]:
                if old_path.exists():
                    self.logger.info(f"Moving {old_path} -> {new_path}")
                    new_path.parent.mkdir(parents=True, exist_ok=True)
                    try:
                        os.rename(old_path, new_path)
                    except OSError:
                        self.logger.info("Fallback to shutil.move")
                        shutil.move(str(old_path), str(new_path))
                        time.sleep(3)
            # End patch

            env_var_to_value.update(
                {
                    "TWIKIT_COOKIES": get_twitter_cookies(
                        username=service.env_variables["TWIKIT_USERNAME"]["value"],
                        email=service.env_variables["TWIKIT_EMAIL"]["value"],
                        password=service.env_variables["TWIKIT_PASSWORD"]["value"],
                        cookies=service.env_variables["TWIKIT_COOKIES"]["value"],
                        cookies_path=cookies_path,
                    ),
                    "TWIKIT_COOKIES_PATH": str(cookies_path),
                    "DB_PATH": str(db_path),
                }
            )

        service.update_env_variables_values(env_var_to_value)

        if user_params.use_staking:
            self.logger.info("Checking staking compatibility")

            # TODO: Missing check when the service is currently staked in a program, but needs to be staked
            # in a different target program. The In this case, balance = currently staked balance + safe balance

            if chain_data.on_chain_state in (
                OnChainState.NON_EXISTENT,
                OnChainState.PRE_REGISTRATION,
            ):
                required_olas = (
                    staking_params["min_staking_deposit"]
                    + staking_params["min_staking_deposit"]  # bond = staking
                )
            elif chain_data.on_chain_state == OnChainState.ACTIVE_REGISTRATION:
                required_olas = staking_params["min_staking_deposit"]
            else:
                required_olas = 0

            balance = (
                registry_contracts.erc20.get_instance(
                    ledger_api=sftxb.ledger_api,
                    contract_address=OLAS[ledger_config.chain],
                )
                .functions.balanceOf(safe)
                .call()
            )
            if balance < required_olas:
                raise ValueError(
                    "You don't have enough olas to stake, "
                    f"address: {safe}; required olas: {required_olas}; your balance: {balance}"
                )

        # TODO Handle this in a more graceful way.
        agent_id = (
            staking_params["agent_ids"][0]
            if staking_params["agent_ids"]
            else user_params.agent_id
        )
        staking_params["agent_ids"] = [agent_id]

        on_chain_metadata = self._get_on_chain_metadata(chain_config=chain_config)
        on_chain_hash = on_chain_metadata.get("code_uri", "")[URI_HASH_POSITION:]
        on_chain_description = on_chain_metadata.get("description")

        current_agent_bond = sftxb.get_agent_bond(
            service_id=chain_data.token, agent_id=staking_params["agent_ids"][0]
        )

        is_first_mint = (
            self._get_on_chain_state(service=service, chain=chain)
            == OnChainState.NON_EXISTENT
        )

        is_update = (
            (not is_first_mint)
            and (on_chain_hash is not None)
            and (
                # TODO Discuss how to manage on-chain hash updates with staking programs.
                # on_chain_hash != service.hash or  # noqa
                current_agent_id != staking_params["agent_ids"][0]
                # TODO This has to be removed for Optimus (needs to be properly implemented). Needs to be put back for Trader!
                or current_agent_bond != staking_params["min_staking_deposit"]
                or on_chain_description != service.description
            )
        )
        current_staking_program = self._get_current_staking_program(
            chain_data, ledger_config, sftxb
        )

        self.logger.info(f"{chain_data.token=}")
        self.logger.info(f"{current_staking_program=}")
        self.logger.info(f"{user_params.staking_program_id=}")
        self.logger.info(f"{on_chain_hash=}")
        self.logger.info(f"{service.hash=}")
        self.logger.info(f"{current_agent_id=}")
        self.logger.info(f"{staking_params['agent_ids'][0]=}")
        self.logger.info(f"{current_agent_bond=}")
        self.logger.info(f"{staking_params['min_staking_deposit']=}")
        self.logger.info(f"{is_first_mint=}")
        self.logger.info(f"{is_update=}")

        if is_update:
            self.terminate_service_on_chain_from_safe(
                service_config_id=service_config_id, chain=chain
            )
            # Update service
            if (
                self._get_on_chain_state(service=service, chain=chain)
                == OnChainState.PRE_REGISTRATION
            ):
                self.logger.info("Updating service")
                receipt = (
                    sftxb.new_tx()
                    .add(
                        sftxb.get_mint_tx_data(
                            package_path=service.service_path,
                            agent_id=agent_id,
                            number_of_slots=service.helper.config.number_of_agents,
                            cost_of_bond=(
                                staking_params["min_staking_deposit"]
                                if user_params.use_staking
                                else user_params.cost_of_bond
                            ),
                            threshold=user_params.threshold,
                            nft=IPFSHash(user_params.nft),
                            update_token=chain_data.token,
                            token=(
                                staking_params["staking_token"]
                                if user_params.use_staking
                                else None
                            ),
                            metadata_description=service.description,
                        )
                    )
                    .settle()
                )
                event_data, *_ = t.cast(
                    t.Tuple,
                    registry_contracts.service_registry.process_receipt(
                        ledger_api=sftxb.ledger_api,
                        contract_address=staking_params["service_registry"],
                        event="UpdateService",
                        receipt=receipt,
                    ).get("events"),
                )
                chain_data.on_chain_state = OnChainState.PRE_REGISTRATION
                service.store()

        # Mint service
        if (
            self._get_on_chain_state(service=service, chain=chain)
            == OnChainState.NON_EXISTENT
        ):
            if user_params.use_staking and not sftxb.staking_slots_available(
                staking_contract=STAKING[ledger_config.chain][
                    user_params.staking_program_id
                ]
            ):
                raise ValueError("No staking slots available")

            self.logger.info("Minting service")
            receipt = (
                sftxb.new_tx()
                .add(
                    sftxb.get_mint_tx_data(
                        package_path=service.service_path,
                        agent_id=agent_id,
                        number_of_slots=service.helper.config.number_of_agents,
                        cost_of_bond=(
                            staking_params["min_staking_deposit"]
                            if user_params.use_staking
                            else user_params.cost_of_bond
                        ),
                        threshold=user_params.threshold,
                        nft=IPFSHash(user_params.nft),
                        update_token=None,
                        token=(
                            staking_params["staking_token"]
                            if user_params.use_staking
                            else None
                        ),
                        metadata_description=service.description,
                    )
                )
                .settle()
            )
            event_data, *_ = t.cast(
                t.Tuple,
                registry_contracts.service_registry.process_receipt(
                    ledger_api=sftxb.ledger_api,
                    contract_address=staking_params["service_registry"],
                    event="CreateService",
                    receipt=receipt,
                ).get("events"),
            )
            chain_data.token = event_data["args"]["serviceId"]
            chain_data.on_chain_state = OnChainState.PRE_REGISTRATION
            service.store()

        if (
            self._get_on_chain_state(service=service, chain=chain)
            == OnChainState.PRE_REGISTRATION
        ):
            # TODO Verify that this is incorrect: cost_of_bond = staking_params["min_staking_deposit"]
            cost_of_bond = user_params.cost_of_bond
            if user_params.use_staking:
                token_utility = staking_params["service_registry_token_utility"]
                olas_token = staking_params["staking_token"]
                self.logger.info(
                    f"Approving OLAS as bonding token from {safe} to {token_utility}"
                )
                cost_of_bond = (
                    registry_contracts.service_registry_token_utility.get_agent_bond(
                        ledger_api=sftxb.ledger_api,
                        contract_address=token_utility,
                        service_id=chain_data.token,
                        agent_id=agent_id,
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
                        safe,
                        token_utility,
                    )
                    .call()
                )
                self.logger.info(
                    f"Approved {token_utility_allowance} OLAS from {safe} to {token_utility}"
                )
                cost_of_bond = 1

            self.logger.info("Activating service")
            sftxb.new_tx().add(
                sftxb.get_activate_data(
                    service_id=chain_data.token,
                    cost_of_bond=cost_of_bond,
                )
            ).settle()
            chain_data.on_chain_state = OnChainState.ACTIVE_REGISTRATION
            service.store()

        if (
            self._get_on_chain_state(service=service, chain=chain)
            == OnChainState.ACTIVE_REGISTRATION
        ):
            cost_of_bond = user_params.cost_of_bond
            if user_params.use_staking:
                token_utility = staking_params["service_registry_token_utility"]
                olas_token = staking_params["staking_token"]
                self.logger.info(
                    f"Approving OLAS as bonding token from {safe} to {token_utility}"
                )
                cost_of_bond = (
                    registry_contracts.service_registry_token_utility.get_agent_bond(
                        ledger_api=sftxb.ledger_api,
                        contract_address=token_utility,
                        service_id=chain_data.token,
                        agent_id=agent_id,
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
                        safe,
                        token_utility,
                    )
                    .call()
                )
                self.logger.info(
                    f"Approved {token_utility_allowance} OLAS from {safe} to {token_utility}"
                )
                cost_of_bond = 1

            self.logger.info(
                f"Registering agent instances: {chain_data.token} -> {instances}"
            )
            sftxb.new_tx().add(
                sftxb.get_register_instances_data(
                    service_id=chain_data.token,
                    instances=instances,
                    agents=[agent_id for _ in instances],
                    cost_of_bond=cost_of_bond,
                )
            ).settle()
            chain_data.on_chain_state = OnChainState.FINISHED_REGISTRATION
            service.store()

        if (
            self._get_on_chain_state(service=service, chain=chain)
            == OnChainState.FINISHED_REGISTRATION
        ):
            self.logger.info("Deploying service")

            reuse_multisig = True
            info = sftxb.info(token_id=chain_data.token)
            if info["multisig"] == NULL_ADDRESS:
                reuse_multisig = False

            self.logger.info(f"{reuse_multisig=}")

            messages = sftxb.get_deploy_data_from_safe(
                service_id=chain_data.token,
                reuse_multisig=reuse_multisig,
                master_safe=safe,
            )
            tx = sftxb.new_tx()
            for message in messages:
                tx.add(message)
            tx.settle()

            chain_data.on_chain_state = OnChainState.DEPLOYED
            service.store()

        # Update local Service
        info = sftxb.info(token_id=chain_data.token)
        chain_data.instances = info["instances"]
        chain_data.multisig = info["multisig"]
        chain_data.on_chain_state = OnChainState(info["service_state"])

        # TODO: this is a patch for modius, to be standardized
        staking_chain = None
        for chain_, config in service.chain_configs.items():
            if config.chain_data.user_params.use_staking:
                staking_chain = chain_
                break

        service.update_env_variables_values(
            {
                "SAFE_CONTRACT_ADDRESSES": json.dumps(
                    {
                        chain: config.chain_data.multisig
                        for chain, config in service.chain_configs.items()
                    },
                    separators=(",", ":"),
                ),
                "STAKING_CHAIN": staking_chain,
            }
        )
        service.store()

        if user_params.use_staking:
            self.stake_service_on_chain_from_safe(
                service_config_id=service_config_id, chain=chain
            )

    def terminate_service_on_chain(
        self, service_config_id: str, chain: t.Optional[str] = None
    ) -> None:
        """Terminate service on-chain"""
        # TODO This method has not been thoroughly reviewed. Deprecated usage in favour of Safe version.

        self.logger.info("terminate_service_on_chain")
        service = self.load(service_config_id=service_config_id)

        chain_config = service.chain_configs[chain or service.home_chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        ocm = self.get_on_chain_manager(ledger_config=ledger_config)
        info = ocm.info(token_id=chain_data.token)
        chain_data.on_chain_state = OnChainState(info["service_state"])

        if chain_data.on_chain_state != OnChainState.DEPLOYED:
            self.logger.info("Cannot terminate service")
            return

        self.logger.info("Terminating service")
        ocm.terminate(
            service_id=chain_data.token,
            token=(
                OLAS[ledger_config.chain]
                if chain_data.user_params.use_staking
                else None
            ),
        )
        chain_data.on_chain_state = OnChainState.TERMINATED_BONDED
        service.store()

    def terminate_service_on_chain_from_safe(  # pylint: disable=too-many-locals
        self,
        service_config_id: str,
        chain: str,
        withdrawal_address: t.Optional[str] = None,
    ) -> None:
        """Terminate service on-chain"""

        self.logger.info("terminate_service_on_chain_from_safe")
        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        keys = service.keys
        instances = [key.address for key in keys]
        wallet = self.wallet_manager.load(ledger_config.chain.ledger_type)
        safe = wallet.safes[Chain(chain)]  # type: ignore

        # TODO fixme
        os.environ["CUSTOM_CHAIN_RPC"] = ledger_config.rpc

        sftxb = self.get_eth_safe_tx_builder(ledger_config=ledger_config)
        info = sftxb.info(token_id=chain_data.token)
        chain_data.on_chain_state = OnChainState(info["service_state"])

        # Determine if the service is staked in a known staking program
        current_staking_program = self._get_current_staking_program(
            chain_data, ledger_config, sftxb
        )
        is_staked = current_staking_program is not None

        can_unstake = False
        if current_staking_program is not None:
            can_unstake = sftxb.can_unstake(
                service_id=chain_data.token,
                staking_contract=STAKING[ledger_config.chain][current_staking_program],
            )

        # Cannot unstake, terminate flow.
        if is_staked and not can_unstake and withdrawal_address is None:
            self.logger.info("Service cannot be terminated on-chain: cannot unstake.")
            return

        # Unstake the service if applies
        if is_staked and (can_unstake or withdrawal_address is not None):
            self.unstake_service_on_chain_from_safe(
                service_config_id=service_config_id,
                chain=chain,
                staking_program_id=current_staking_program,
            )

        if self._get_on_chain_state(service=service, chain=chain) in (
            OnChainState.ACTIVE_REGISTRATION,
            OnChainState.FINISHED_REGISTRATION,
            OnChainState.DEPLOYED,
        ):
            self.logger.info("Terminating service")
            sftxb.new_tx().add(
                sftxb.get_terminate_data(
                    service_id=chain_data.token,
                )
            ).settle()

        if (
            self._get_on_chain_state(service=service, chain=chain)
            == OnChainState.TERMINATED_BONDED
        ):
            self.logger.info("Unbonding service")
            sftxb.new_tx().add(
                sftxb.get_unbond_data(
                    service_id=chain_data.token,
                )
            ).settle()

        # Swap service safe
        current_safe_owners = sftxb.get_service_safe_owners(service_id=chain_data.token)
        counter_current_safe_owners = Counter(s.lower() for s in current_safe_owners)
        counter_instances = Counter(s.lower() for s in instances)

        if withdrawal_address is not None:
            # we don't drain signer yet, because the owner swapping tx may need to happen
            self.drain_service_safe(
                service_config_id=service_config_id,
                withdrawal_address=withdrawal_address,
            )

        if counter_current_safe_owners == counter_instances:
            if withdrawal_address is None:
                self.logger.info("Service funded for safe swap")
                self.fund_service(
                    service_config_id=service_config_id,
                    rpc=ledger_config.rpc,
                    funding_values={
                        ZERO_ADDRESS: {
                            "agent": {
                                "topup": chain_data.user_params.fund_requirements[
                                    ZERO_ADDRESS
                                ].agent,
                                "threshold": chain_data.user_params.fund_requirements[
                                    ZERO_ADDRESS
                                ].agent,
                            },
                            "safe": {"topup": 0, "threshold": 0},
                        }
                    },
                )

            self.logger.info("Swapping Safe owners")
            sftxb.swap(  # noqa: E800
                service_id=chain_data.token,  # noqa: E800
                multisig=chain_data.multisig,  # TODO this can be read from the registry
                owner_key=str(
                    self.keys_manager.get(
                        key=current_safe_owners[0]
                    ).private_key  # TODO allow multiple owners
                ),  # noqa: E800
                new_owner_address=safe
                if safe
                else wallet.crypto.address,  # TODO it should always be safe address
            )  # noqa: E800

        if withdrawal_address is not None:
            # drain xDAI from service signer key
            drain_signer(
                ledger_api=self.wallet_manager.load(
                    ledger_config.chain.ledger_type
                ).ledger_api(chain=ledger_config.chain, rpc=ledger_config.rpc),
                crypto=EthereumCrypto(
                    private_key_path=service.path
                    / "deployment"
                    / "ethereum_private_key.txt",
                ),
                withdrawal_address=withdrawal_address,
                chain_id=ledger_config.chain.id,
            )
            self.logger.info(f"{service.name} signer drained")

    @staticmethod
    def _get_current_staking_program(
        chain_data: OnChainData, ledger_config: LedgerConfig, sftxb: EthSafeTxBuilder
    ) -> t.Optional[str]:
        if chain_data.token == NON_EXISTENT_TOKEN:
            return None

        current_staking_program = None
        for staking_program in STAKING[ledger_config.chain]:
            state = sftxb.staking_status(
                service_id=chain_data.token,
                staking_contract=STAKING[ledger_config.chain][staking_program],
            )
            if state in (StakingState.STAKED, StakingState.EVICTED):
                current_staking_program = staking_program
        return current_staking_program

    def unbond_service_on_chain(
        self, service_config_id: str, chain: t.Optional[str] = None
    ) -> None:
        """Unbond service on-chain"""
        # TODO This method has not been thoroughly reviewed. Deprecated usage in favour of Safe version.

        service = self.load(service_config_id=service_config_id)

        chain_config = service.chain_configs[chain or service.home_chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        ocm = self.get_on_chain_manager(ledger_config=ledger_config)
        info = ocm.info(token_id=chain_data.token)
        chain_data.on_chain_state = OnChainState(info["service_state"])

        if chain_data.on_chain_state != OnChainState.TERMINATED_BONDED:
            self.logger.info("Cannot unbond service")
            return

        self.logger.info("Unbonding service")
        ocm.unbond(
            service_id=chain_data.token,
            token=(
                OLAS[ledger_config.chain]
                if chain_data.user_params.use_staking
                else None
            ),
        )
        chain_data.on_chain_state = OnChainState.UNBONDED
        service.store()

    def stake_service_on_chain(self, hash: str) -> None:
        """
        Stake service on-chain

        :param hash: Service hash
        """
        raise NotImplementedError

    def stake_service_on_chain_from_safe(  # pylint: disable=too-many-statements,too-many-locals
        self, service_config_id: str, chain: str
    ) -> None:
        """Stake service on-chain"""

        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        user_params = chain_data.user_params
        target_staking_program = user_params.staking_program_id
        target_staking_contract = STAKING[ledger_config.chain][target_staking_program]
        sftxb = self.get_eth_safe_tx_builder(ledger_config=ledger_config)

        # TODO fixme
        os.environ["CUSTOM_CHAIN_RPC"] = ledger_config.rpc

        # Determine if the service is staked in a known staking program
        current_staking_program = self._get_current_staking_program(
            chain_data, ledger_config, sftxb
        )
        is_staked = current_staking_program is not None
        current_staking_contract = (
            STAKING[ledger_config.chain][current_staking_program]
            if current_staking_program is not None
            else None
        )

        # perform the unstaking flow if necessary
        if is_staked:
            can_unstake = sftxb.can_unstake(
                chain_config.chain_data.token, current_staking_contract  # type: ignore  # TODO fix mypy
            )
            if not chain_config.chain_data.user_params.use_staking and can_unstake:
                self.logger.info(
                    f"Use staking is set to false, but service {chain_config.chain_data.token} is staked and can be unstaked. Unstaking..."
                )
                self.unstake_service_on_chain_from_safe(
                    service_config_id=service_config_id,
                    chain=chain,
                    staking_program_id=current_staking_program,
                )

            info = sftxb.info(token_id=chain_config.chain_data.token)
            chain_config.chain_data.on_chain_state = OnChainState(info["service_state"])
            staking_state = sftxb.staking_status(
                service_id=chain_data.token,
                staking_contract=current_staking_contract,  # type: ignore  # TODO fix mypy
            )

            if staking_state == StakingState.EVICTED and can_unstake:
                self.logger.info(
                    f"Service {chain_config.chain_data.token} has been evicted and can be unstaked. Unstaking..."
                )
                self.unstake_service_on_chain_from_safe(
                    service_config_id=service_config_id,
                    chain=chain,
                    staking_program_id=current_staking_program,
                )

            if (
                staking_state == StakingState.STAKED
                and can_unstake
                and not sftxb.staking_rewards_available(current_staking_contract)  # type: ignore  # TODO fix mypy
            ):
                self.logger.info(
                    f"There are no rewards available, service {chain_config.chain_data.token} "
                    f"is already staked and can be unstaked. Unstaking..."
                )
                self.unstake_service_on_chain_from_safe(
                    service_config_id=service_config_id,
                    chain=chain,
                    staking_program_id=current_staking_program,
                )

            if (
                staking_state == StakingState.STAKED
                and current_staking_program != target_staking_program
                and can_unstake
            ):
                self.logger.info(
                    f"{chain_config.chain_data.token} is staked in a different staking program. Unstaking..."
                )
                self.unstake_service_on_chain_from_safe(
                    service_config_id=service_config_id,
                    chain=chain,
                    staking_program_id=current_staking_program,
                )

        staking_state = sftxb.staking_status(
            service_id=chain_config.chain_data.token,
            staking_contract=target_staking_contract,
        )
        self.logger.info("Checking conditions to stake.")

        staking_rewards_available = sftxb.staking_rewards_available(
            target_staking_contract
        )
        staking_slots_available = sftxb.staking_slots_available(target_staking_contract)
        on_chain_state = self._get_on_chain_state(service=service, chain=chain)
        current_staking_program = self._get_current_staking_program(
            chain_data, ledger_config, sftxb
        )

        self.logger.info(
            f"use_staking={chain_config.chain_data.user_params.use_staking}"
        )
        self.logger.info(f"{staking_state=}")
        self.logger.info(f"{staking_rewards_available=}")
        self.logger.info(f"{staking_slots_available=}")
        self.logger.info(f"{on_chain_state=}")
        self.logger.info(f"{current_staking_program=}")
        self.logger.info(f"{target_staking_program=}")

        if (
            chain_config.chain_data.user_params.use_staking
            and staking_state == StakingState.UNSTAKED
            and staking_rewards_available
            and staking_slots_available
            and on_chain_state == OnChainState.DEPLOYED
        ):
            self.logger.info(f"Approving staking: {chain_config.chain_data.token}")
            sftxb.new_tx().add(
                sftxb.get_staking_approval_data(
                    service_id=chain_config.chain_data.token,
                    service_registry=CONTRACTS[ledger_config.chain]["service_registry"],
                    staking_contract=target_staking_contract,
                )
            ).settle()

            self.logger.info(f"Staking service: {chain_config.chain_data.token}")
            sftxb.new_tx().add(
                sftxb.get_staking_data(
                    service_id=chain_config.chain_data.token,
                    staking_contract=target_staking_contract,
                )
            ).settle()
            chain_config.chain_data.staked = True
            service.store()

        current_staking_program = self._get_current_staking_program(
            chain_data, ledger_config, sftxb
        )
        self.logger.info(f"{target_staking_program=}")
        self.logger.info(f"{current_staking_program=}")

    def unstake_service_on_chain(
        self, service_config_id: str, chain: t.Optional[str] = None
    ) -> None:
        """Unbond service on-chain"""
        # TODO This method has not been thoroughly reviewed. Deprecated usage in favour of Safe version.

        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[chain or service.home_chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        ocm = self.get_on_chain_manager(ledger_config=ledger_config)
        if not chain_data.user_params.use_staking:
            self.logger.info("Cannot unstake service, `use_staking` is set to false")
            return

        state = ocm.staking_status(
            service_id=chain_data.token,
            staking_contract=STAKING[ledger_config.chain],  # type: ignore  # TODO fix mypy
        )
        self.logger.info(f"Staking status for service {chain_data.token}: {state}")
        if state not in {StakingState.STAKED, StakingState.EVICTED}:
            self.logger.info("Cannot unstake service, it's not staked")
            chain_data.staked = False
            service.store()
            return

        self.logger.info(f"Unstaking service: {chain_data.token}")
        ocm.unstake(
            service_id=chain_data.token,
            staking_contract=STAKING[ledger_config.chain],  # type: ignore  # TODO fix mypy
        )
        chain_data.staked = False
        service.store()

    def unstake_service_on_chain_from_safe(
        self,
        service_config_id: str,
        chain: str,
        staking_program_id: t.Optional[str] = None,
        force: bool = False,
    ) -> None:
        """Unbond service on-chain"""

        self.logger.info("unstake_service_on_chain_from_safe")
        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data

        if staking_program_id is None:
            self.logger.info(
                "Cannot unstake service, `staking_program_id` is set to None"
            )
            return

        if not chain_data.user_params.use_staking:
            self.logger.info("Cannot unstake service, `use_staking` is set to false")
            return

        sftxb = self.get_eth_safe_tx_builder(ledger_config=ledger_config)
        state = sftxb.staking_status(
            service_id=chain_data.token,
            staking_contract=STAKING[ledger_config.chain][staking_program_id],
        )
        self.logger.info(f"Staking status for service {chain_data.token}: {state}")
        if state not in {StakingState.STAKED, StakingState.EVICTED}:
            self.logger.info("Cannot unstake service, it's not staked")
            chain_data.staked = False
            service.store()
            return

        self.logger.info(f"Unstaking service: {chain_data.token}")
        sftxb.new_tx().add(
            sftxb.get_unstaking_data(
                service_id=chain_data.token,
                staking_contract=STAKING[ledger_config.chain][staking_program_id],
                force=force,
            )
        ).settle()
        chain_data.staked = False
        service.store()

    def fund_service(  # pylint: disable=too-many-arguments,too-many-locals
        self,
        service_config_id: str,
        rpc: t.Optional[str] = None,
        funding_values: t.Optional[FundingValues] = None,
        from_safe: bool = True,
    ) -> None:
        """Fund service if required."""
        service = self.load(service_config_id=service_config_id)

        for chain in service.chain_configs.keys():
            self.logger.info(f"Funding {chain=}")
            self.fund_service_single_chain(
                service_config_id=service_config_id,
                rpc=rpc,
                funding_values=funding_values,
                from_safe=from_safe,
                chain=chain,
            )

    def fund_service_single_chain(  # pylint: disable=too-many-arguments,too-many-locals
        self,
        service_config_id: str,
        rpc: t.Optional[str] = None,
        funding_values: t.Optional[FundingValues] = None,
        from_safe: bool = True,
        chain: str = "gnosis",
    ) -> None:
        """Fund service if required."""

        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        wallet = self.wallet_manager.load(ledger_config.chain.ledger_type)
        ledger_api = wallet.ledger_api(
            chain=ledger_config.chain, rpc=rpc or ledger_config.rpc
        )

        for (
            asset_address,
            fund_requirements,
        ) in chain_data.user_params.fund_requirements.items():
            asset_funding_values = (
                funding_values.get(asset_address)
                if funding_values is not None
                else None
            )
            agent_fund_threshold = (
                asset_funding_values["agent"]["threshold"]
                if asset_funding_values is not None
                else fund_requirements.agent
            )

            for key in service.keys:
                agent_balance = get_asset_balance(
                    ledger_api=ledger_api,
                    contract_address=asset_address,
                    address=key.address,
                )
                self.logger.info(
                    f"[FUNDING_JOB] Agent {key.address} Asset: {asset_address} balance: {agent_balance}"
                )
                if agent_fund_threshold > 0:
                    self.logger.info(
                        f"[FUNDING_JOB] Required balance: {agent_fund_threshold}"
                    )
                    if agent_balance < agent_fund_threshold:
                        self.logger.info("[FUNDING_JOB] Funding agents")
                        target_balance = (
                            asset_funding_values["agent"]["topup"]
                            if asset_funding_values is not None
                            else fund_requirements.agent
                        )
                        transferable_balance = get_asset_balance(
                            ledger_api=ledger_api,
                            contract_address=asset_address,
                            address=wallet.safes[ledger_config.chain],
                        )
                        to_transfer = max(
                            min(transferable_balance, target_balance - agent_balance), 0
                        )
                        self.logger.info(
                            f"[FUNDING_JOB] Transferring {to_transfer} asset ({asset_address}) to {key.address}"
                        )
                        wallet.transfer_asset(
                            asset=asset_address,
                            to=key.address,
                            amount=int(to_transfer),
                            chain=ledger_config.chain,
                            from_safe=from_safe,
                            rpc=rpc or ledger_config.rpc,
                        )

            safe_balance = get_asset_balance(
                ledger_api=ledger_api,
                contract_address=asset_address,
                address=chain_data.multisig,
            )
            if asset_address == ZERO_ADDRESS:
                # also count the balance of the wrapped native asset
                safe_balance += get_asset_balance(
                    ledger_api=ledger_api,
                    contract_address=WRAPPED_NATIVE_ASSET.get(chain, asset_address),
                    address=chain_data.multisig,
                )

            safe_fund_treshold = (
                asset_funding_values["safe"]["threshold"]
                if asset_funding_values is not None
                else fund_requirements.safe
            )
            self.logger.info(
                f"[FUNDING_JOB] Safe {chain_data.multisig} Asset: {asset_address} balance: {safe_balance}"
            )
            self.logger.info(f"[FUNDING_JOB] Required balance: {safe_fund_treshold}")
            if safe_balance < safe_fund_treshold:
                self.logger.info("[FUNDING_JOB] Funding safe")
                target_balance = (
                    asset_funding_values["safe"]["topup"]
                    if asset_funding_values is not None
                    else fund_requirements.safe
                )
                transferable_balance = get_asset_balance(
                    ledger_api=ledger_api,
                    contract_address=asset_address,
                    address=wallet.safes[ledger_config.chain],
                )
                to_transfer = max(
                    min(transferable_balance, target_balance - safe_balance), 0
                )

                # TODO Possibly remove this logging
                self.logger.info(f"{transferable_balance=}")
                self.logger.info(f"{target_balance=}")
                self.logger.info(f"{safe_balance=}")
                self.logger.info(f"{to_transfer=}")

                if to_transfer > 0:
                    self.logger.info(
                        f"[FUNDING_JOB] Transferring {to_transfer} asset ({asset_address}) to {chain_data.multisig}"
                    )
                    # TODO: This is a temporary fix
                    # we avoid the error here because there is a seperate prompt on the UI
                    # when not enough funds are present, and the FE doesn't let the user to start the agent.
                    # Ideally this error should be allowed, and then the FE should ask the user for more funds.
                    with suppress(RuntimeError):
                        wallet.transfer_asset(
                            asset=asset_address,
                            to=t.cast(str, chain_data.multisig),
                            amount=int(to_transfer),
                            chain=ledger_config.chain,
                            rpc=rpc or ledger_config.rpc,
                        )

    # TODO This method is possibly not used anymore
    def fund_service_erc20(  # pylint: disable=too-many-arguments,too-many-locals
        self,
        service_config_id: str,
        token: str,
        rpc: t.Optional[str] = None,
        agent_topup: t.Optional[float] = None,
        safe_topup: t.Optional[float] = None,
        agent_fund_threshold: t.Optional[float] = None,
        safe_fund_treshold: t.Optional[float] = None,
        from_safe: bool = True,
        chain: str = "gnosis",
    ) -> None:
        """Fund service if required."""
        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[chain]
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        wallet = self.wallet_manager.load(ledger_config.chain.ledger_type)
        ledger_api = wallet.ledger_api(
            chain=ledger_config.chain, rpc=rpc or ledger_config.rpc
        )
        agent_fund_threshold = (
            agent_fund_threshold
            or chain_data.user_params.fund_requirements[ZERO_ADDRESS].agent
        )

        for key in service.keys:
            agent_balance = ledger_api.get_balance(address=key.address)
            self.logger.info(f"Agent {key.address} balance: {agent_balance}")
            self.logger.info(f"Required balance: {agent_fund_threshold}")
            if agent_balance < agent_fund_threshold:
                self.logger.info("Funding agents")
                to_transfer = (
                    agent_topup
                    or chain_data.user_params.fund_requirements[ZERO_ADDRESS].agent
                )
                self.logger.info(f"Transferring {to_transfer} units to {key.address}")
                wallet.transfer_erc20(
                    token=token,
                    to=key.address,
                    amount=int(to_transfer),
                    chain=ledger_config.chain,
                    from_safe=from_safe,
                    rpc=rpc or ledger_config.rpc,
                )

        safe_balance = (
            registry_contracts.erc20.get_instance(ledger_api, token)
            .functions.balanceOf(chain_data.multisig)
            .call()
        )
        safe_fund_treshold = (
            safe_fund_treshold
            or chain_data.user_params.fund_requirements[ZERO_ADDRESS].safe
        )
        self.logger.info(f"Safe {chain_data.multisig} balance: {safe_balance}")
        self.logger.info(f"Required balance: {safe_fund_treshold}")
        if safe_balance < safe_fund_treshold:
            self.logger.info("Funding safe")
            to_transfer = (
                safe_topup
                or chain_data.user_params.fund_requirements[ZERO_ADDRESS].safe
            )
            self.logger.info(
                f"Transferring {to_transfer} units to {chain_data.multisig}"
            )
            wallet.transfer_erc20(
                token=token,
                to=t.cast(str, chain_data.multisig),
                amount=int(to_transfer),
                chain=ledger_config.chain,
                rpc=rpc or ledger_config.rpc,
            )

    def drain_service_safe(
        self,
        service_config_id: str,
        withdrawal_address: str,
    ) -> None:
        """Drain the funds out of the service safe."""
        self.logger.info(f"Draining the safe of service: {hash}")
        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[service.home_chain]  # TODO rest of chains
        ledger_config = chain_config.ledger_config
        chain_data = chain_config.chain_data
        wallet = self.wallet_manager.load(ledger_config.chain.ledger_type)
        ledger_api = wallet.ledger_api(chain=ledger_config.chain, rpc=ledger_config.rpc)
        ethereum_crypto = EthereumCrypto(
            private_key_path=service.path / "deployment" / "ethereum_private_key.txt",
        )

        # drain OLAS and wxDAI from service safe
        for token_name, token_address in (
            ("OLAS", OLAS[ledger_config.chain]),
            ("wxDAI", WXDAI[ledger_config.chain]),
        ):
            token_instance = registry_contracts.erc20.get_instance(
                ledger_api=ledger_api,
                contract_address=token_address,
            )
            balance = token_instance.functions.balanceOf(chain_data.multisig).call()
            if balance == 0:
                self.logger.info(
                    f"No {token_name} to drain from service safe: {chain_data.multisig}"
                )
                continue

            self.logger.info(
                f"Draining {balance} {token_name} out of service safe: {chain_data.multisig}"
            )
            transfer_erc20_from_safe(
                ledger_api=ledger_api,
                crypto=ethereum_crypto,
                safe=chain_data.multisig,
                token=token_address,
                to=withdrawal_address,
                amount=balance,
            )

        # drain xDAI from service safe
        balance = ledger_api.get_balance(chain_data.multisig)
        if balance == 0:
            self.logger.info(
                f"No xDAI to drain from service safe: {chain_data.multisig}"
            )
        else:
            self.logger.info(
                f"Draining {balance} xDAI out of service safe: {chain_data.multisig}"
            )
            transfer_from_safe(
                ledger_api=ledger_api,
                crypto=ethereum_crypto,
                safe=chain_data.multisig,
                to=withdrawal_address,
                amount=balance,
            )

        self.logger.info(f"{service.name} safe drained ({service_config_id=})")

    async def funding_job(
        self,
        service_config_id: str,
        loop: t.Optional[asyncio.AbstractEventLoop] = None,
        from_safe: bool = True,
    ) -> None:
        """Start a background funding job."""
        loop = loop or asyncio.get_event_loop()
        service = self.load(service_config_id=service_config_id)
        chain_config = service.chain_configs[service.home_chain]
        ledger_config = chain_config.ledger_config
        with ThreadPoolExecutor() as executor:
            while True:
                try:
                    await loop.run_in_executor(
                        executor,
                        self.fund_service,
                        service_config_id,  # Service id
                        PUBLIC_RPCS[ledger_config.chain],  # RPC
                        {
                            asset_address: {
                                "agent": {
                                    "topup": fund_requirements.agent,
                                    "threshold": int(fund_requirements.agent / 2),
                                },
                                "safe": {
                                    "topup": fund_requirements.safe,
                                    "threshold": int(fund_requirements.safe / 2),
                                },
                            }
                            for asset_address, fund_requirements in chain_config.chain_data.user_params.fund_requirements.items()
                        },
                        from_safe,
                    )
                except Exception:  # pylint: disable=broad-except
                    logging.info(
                        f"Error occured while funding the service\n{traceback.format_exc()}"
                    )
                await asyncio.sleep(60)

    def deploy_service_locally(
        self,
        service_config_id: str,
        force: bool = True,
        chain: t.Optional[str] = None,
        use_docker: bool = False,
    ) -> Deployment:
        """
        Deploy service locally

        :param hash: Service hash
        :param force: Remove previous deployment and start a new one.
        :param chain: Chain to set runtime parameters on the deployment (home_chain if not provided).
        :param use_docker: Use a Docker Compose deployment (True) or Host deployment (False).
        :return: Deployment instance
        """
        service = self.load(service_config_id=service_config_id)

        deployment = service.deployment
        deployment.build(
            use_docker=use_docker, force=force, chain=chain or service.home_chain
        )
        deployment.start(use_docker=use_docker)
        return deployment

    def stop_service_locally(
        self, service_config_id: str, delete: bool = False, use_docker: bool = False
    ) -> Deployment:
        """
        Stop service locally

        :param service_id: Service id
        :param delete: Delete local deployment.
        :return: Deployment instance
        """
        deployment = self.load(service_config_id=service_config_id).deployment
        deployment.stop(use_docker)
        if delete:
            deployment.delete()
        return deployment

    def log_directories(self) -> None:
        """Log directories."""
        directories = [f"  - {str(p)}" for p in self.path.iterdir() if p.is_dir()]
        directories_str = "\n".join(directories)
        self.logger.info(f"Directories in {self.path}\n: {directories_str}")

    def update(
        self,
        service_config_id: str,
        service_template: ServiceTemplate,
        allow_different_service_public_id: bool = False,
        partial_update: bool = True,
    ) -> Service:
        """Update a service."""

        self.logger.info(f"Updating {service_config_id=}")
        service = self.load(service_config_id=service_config_id)
        service.update(
            service_template=service_template,
            allow_different_service_public_id=allow_different_service_public_id,
            partial_update=partial_update,
        )
        return service

    def update_all_matching(
        self,
        service_template: ServiceTemplate,
    ) -> t.List[t.Dict]:
        """Update all services with service id matching the service id from the template hash."""

        self.logger.info("update_all_matching")
        self.logger.info(f"{service_template['hash']=}")
        updated_services: t.List[t.Dict] = []
        for service in self._get_all_services():
            try:
                service.update(service_template=service_template)
                updated_services.append(service.json)
                self.logger.info(
                    f"Updated service_config_id={service.service_config_id}"
                )
            except ValueError:
                self.logger.info(
                    f"Not updated service_config_id={service.service_config_id}"
                )

        return updated_services

    def migrate_service_configs(self) -> None:
        """Migrate old service config formats to new ones, if applies."""

        bafybei_count = sum(
            1 for path in self.path.iterdir() if path.name.startswith("bafybei")
        )
        if bafybei_count > 1:
            self.log_directories()
            raise RuntimeError(
                f"Your services folder contains {bafybei_count} folders starting with 'bafybei'. This is an unintended situation. Please contact support."
            )

        paths = list(self.path.iterdir())
        for path in paths:
            try:
                if path.name.startswith(DELETE_PREFIX):
                    shutil.rmtree(path)
                    self.logger.info(f"Deleted folder: {path.name}")

                if path.name.startswith(SERVICE_CONFIG_PREFIX) or path.name.startswith(
                    "bafybei"
                ):
                    self.logger.info(f"migrate_service_configs {str(path)}")
                    migrated = Service.migrate_format(path)
                    if migrated:
                        self.logger.info(f"Folder {str(path)} has been migrated.")
            except Exception as e:  # pylint: disable=broad-except
                self.logger.error(
                    f"Failed to migrate service: {path.name}. Exception {e}: {traceback.format_exc()}"
                )
                # Rename the invalid path
                timestamp = int(time.time())
                invalid_path = path.parent / f"invalid_{timestamp}_{path.name}"
                os.rename(path, invalid_path)
                self.logger.info(
                    f"Renamed invalid service: {path.name} to {invalid_path.name}"
                )
