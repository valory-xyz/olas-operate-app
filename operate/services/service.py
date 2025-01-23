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

"""Service as HTTP resource."""

import json
import os
import platform
import shutil
import subprocess  # nosec
import sys
import tempfile
import time
import typing as t
import uuid
from copy import copy
from dataclasses import dataclass
from json import JSONDecodeError
from pathlib import Path
from traceback import print_exc

from aea.configurations.constants import (
    DEFAULT_LEDGER,
    LEDGER,
    PRIVATE_KEY,
    PRIVATE_KEY_PATH_SCHEMA,
    SKILL,
)
from aea.helpers.yaml_utils import yaml_dump, yaml_load, yaml_load_all
from aea_cli_ipfs.ipfs_utils import IPFSTool
from autonomy.cli.helpers.deployment import run_deployment, stop_deployment
from autonomy.configurations.loader import apply_env_variables, load_service_config
from autonomy.deploy.base import BaseDeploymentGenerator
from autonomy.deploy.base import ServiceBuilder as BaseServiceBuilder
from autonomy.deploy.constants import (
    AGENT_KEYS_DIR,
    BENCHMARKS_DIR,
    DEFAULT_ENCODING,
    LOG_DIR,
    PERSISTENT_DATA_DIR,
    TM_STATE_DIR,
    VENVS_DIR,
)
from autonomy.deploy.generators.docker_compose.base import DockerComposeGenerator
from docker import from_env

from operate.constants import (
    DEPLOYMENT,
    DEPLOYMENT_JSON,
    DOCKER_COMPOSE_YAML,
    KEYS_JSON,
    ZERO_ADDRESS,
)
from operate.keys import Keys
from operate.operate_http.exceptions import NotAllowed
from operate.operate_types import (
    Chain,
    ChainConfig,
    ChainConfigs,
    DeployedNodes,
    DeploymentConfig,
    DeploymentStatus,
    EnvVariables,
    LedgerConfig,
    LedgerConfigs,
    OnChainData,
    OnChainState,
    OnChainUserParams,
    ServiceEnvProvisionType,
    ServiceTemplate,
)
from operate.resource import LocalResource
from operate.services.deployment_runner import run_host_deployment, stop_host_deployment
from operate.services.utils import tendermint


# pylint: disable=no-member,redefined-builtin,too-many-instance-attributes,too-many-locals

SAFE_CONTRACT_ADDRESS = "safe_contract_address"
ALL_PARTICIPANTS = "all_participants"
CONSENSUS_THRESHOLD = "consensus_threshold"
DELETE_PREFIX = "delete_"
SERVICE_CONFIG_VERSION = 5
SERVICE_CONFIG_PREFIX = "sc-"

NON_EXISTENT_MULTISIG = "0xm"
NON_EXISTENT_TOKEN = -1

DEFAULT_TRADER_ENV_VARS = {
    "GNOSIS_LEDGER_RPC": {
        "name": "Gnosis ledger RPC",
        "description": "",
        "value": "",
        "provision_type": "computed",
    },
    "STAKING_CONTRACT_ADDRESS": {
        "name": "Staking contract address",
        "description": "",
        "value": "",
        "provision_type": "computed",
    },
    "MECH_MARKETPLACE_CONFIG": {
        "name": "Mech marketplace configuration",
        "description": "",
        "value": "",
        "provision_type": "computed",
    },
    "MECH_ACTIVITY_CHECKER_CONTRACT": {
        "name": "Mech activity checker contract",
        "description": "",
        "value": "",
        "provision_type": "computed",
    },
    "MECH_CONTRACT_ADDRESS": {
        "name": "Mech contract address",
        "description": "",
        "value": "",
        "provision_type": "computed",
    },
    "MECH_REQUEST_PRICE": {
        "name": "Mech request price",
        "description": "",
        "value": "10000000000000000",
        "provision_type": "computed",
    },
    "USE_MECH_MARKETPLACE": {
        "name": "Use Mech marketplace",
        "description": "",
        "value": "False",
        "provision_type": "computed",
    },
    "REQUESTER_STAKING_INSTANCE_ADDRESS": {
        "name": "Requester staking instance address",
        "description": "",
        "value": "",
        "provision_type": "computed",
    },
    "PRIORITY_MECH_ADDRESS": {
        "name": "Priority Mech address",
        "description": "",
        "value": "",
        "provision_type": "computed",
    },
}


def mkdirs(build_dir: Path) -> None:
    """Build necessary directories."""
    build_dir.mkdir(exist_ok=True)
    for dir_path in [
        (PERSISTENT_DATA_DIR,),
        (PERSISTENT_DATA_DIR, LOG_DIR),
        (PERSISTENT_DATA_DIR, TM_STATE_DIR),
        (PERSISTENT_DATA_DIR, BENCHMARKS_DIR),
        (PERSISTENT_DATA_DIR, VENVS_DIR),
        (AGENT_KEYS_DIR,),
    ]:
        path = Path(build_dir, *dir_path)
        path.mkdir()
        try:
            os.chown(path, 1000, 1000)
        except (PermissionError, AttributeError):
            continue


def remove_service_network(service_name: str, force: bool = True) -> None:
    """Remove service network cache."""
    client = from_env()
    network_names = (
        f"deployment_service_{service_name}_localnet",
        f"abci_build_service_{service_name}_localnet",
    )
    for network in client.networks.list(greedy=True):
        if network.attrs["Name"] not in network_names:
            continue

        if force:
            for container in network.attrs["Containers"]:
                print(f"Killing {container}")
                client.api.kill(container=container)

        print("Deleting network: " + network.attrs["Name"])
        client.api.remove_network(net_id=network.attrs["Id"])


# TODO: Backport to autonomy
class ServiceBuilder(BaseServiceBuilder):
    """Service builder patch."""

    def try_update_runtime_params(
        self,
        multisig_address: t.Optional[str] = None,
        agent_instances: t.Optional[t.List[str]] = None,
        consensus_threshold: t.Optional[int] = None,
        service_id: t.Optional[int] = None,
    ) -> None:
        """Try and update setup parameters."""

        param_overrides: t.List[t.Tuple[str, t.Any]] = []
        if multisig_address is not None:
            param_overrides.append(
                (SAFE_CONTRACT_ADDRESS, multisig_address),
            )

        if agent_instances is not None:
            param_overrides.append(
                (ALL_PARTICIPANTS, agent_instances),
            )

        if consensus_threshold is not None:
            param_overrides.append(
                (CONSENSUS_THRESHOLD, consensus_threshold),
            )

        overrides = copy(self.service.overrides)
        for override in overrides:
            (
                override,
                component_id,
                has_multiple_overrides,
            ) = self.service.process_metadata(
                configuration=override,
            )

            if component_id.component_type.value == SKILL:
                self._try_update_setup_data(
                    data=param_overrides,
                    override=override,
                    skill_id=component_id.public_id,
                    has_multiple_overrides=has_multiple_overrides,
                )
                self._try_update_tendermint_params(
                    override=override,
                    skill_id=component_id.public_id,
                    has_multiple_overrides=has_multiple_overrides,
                )
                if service_id is not None:
                    if has_multiple_overrides:
                        os.environ["ON_CHAIN_SERVICE_ID"] = str(service_id)
                    else:
                        override["models"]["params"]["args"][
                            "on_chain_service_id"
                        ] = service_id

            override["type"] = component_id.package_type.value
            override["public_id"] = str(component_id.public_id)

        self.service.overrides = overrides


class ServiceHelper:
    """Service config helper."""

    def __init__(self, path: Path) -> None:
        """Initialize object."""
        self.path = path
        self.config = load_service_config(service_path=path)
        self.config.overrides = apply_env_variables(
            self.config.overrides, os.environ.copy()
        )

    def ledger_configs(self) -> LedgerConfigs:
        """Get ledger configs."""
        ledger_configs = {}
        for override in self.config.overrides:
            if (
                override["type"] == "connection"
                and "valory/ledger" in override["public_id"]
            ):
                for _, config in override["config"]["ledger_apis"].items():
                    # TODO chain name is inferred from the chain_id. The actual id provided on service.yaml is ignored.
                    chain = Chain.from_id(chain_id=config["chain_id"])  # type: ignore
                    ledger_configs[chain.value] = LedgerConfig(
                        rpc=config["address"],
                        chain=chain,
                    )
        return ledger_configs

    def deployment_config(self) -> DeploymentConfig:
        """Returns deployment config."""
        return DeploymentConfig(self.config.json.get("deployment", {}))  # type: ignore


# TODO: Port back to open-autonomy
class HostDeploymentGenerator(BaseDeploymentGenerator):
    """Host deployment."""

    output_name: str = "runtime.json"
    deployment_type: str = "host"

    def generate_config_tendermint(self) -> "HostDeploymentGenerator":
        """Generate tendermint configuration."""
        tmhome = str(self.build_dir / "node")
        tendermint_executable = str(
            shutil.which("tendermint"),
        )
        tendermint_executable = str(
            Path(os.path.dirname(sys.executable)) / "tendermint"
        )
        if platform.system() == "Windows":
            tendermint_executable = str(
                Path(os.path.dirname(sys.executable)) / "tendermint.exe"
            )
        subprocess.run(  # pylint: disable=subprocess-run-check # nosec
            args=[
                tendermint_executable,
                "--home",
                tmhome,
                "init",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )

        # TODO: Dynamic port allocation
        params = {
            "TMHOME": tmhome,
            "TMSTATE": str(self.build_dir / "tm_state"),
            "P2P_LADDR": "tcp://localhost:26656",
            "RPC_LADDR": "tcp://localhost:26657",
            "PROXY_APP": "tcp://localhost:26658",
            "CREATE_EMPTY_BLOCKS": "true",
            "USE_GRPC": "false",
            "FLASK_APP": "tendermint:create_server",
        }
        (self.build_dir / "tendermint.json").write_text(
            json.dumps(params, indent=2),
            encoding="utf-8",
        )
        shutil.copy(
            tendermint.__file__.replace(".pyc", ".py"),
            self.build_dir / "tendermint.py",
        )
        return self

    def generate(
        self,
        image_version: t.Optional[str] = None,
        use_hardhat: bool = False,
        use_acn: bool = False,
    ) -> "HostDeploymentGenerator":
        """Generate agent and tendermint configurations"""
        agent = self.service_builder.generate_agent(agent_n=0)
        agent = {key: f"{value}" for key, value in agent.items()}
        (self.build_dir / "agent.json").write_text(
            json.dumps(agent, indent=2),
            encoding="utf-8",
        )
        return self

    def _populate_keys(self) -> None:
        """Populate the keys directory"""
        # TODO: Add multiagent support
        kp, *_ = t.cast(t.List[t.Dict[str, str]], self.service_builder.keys)
        key = kp[PRIVATE_KEY]
        ledger = kp.get(LEDGER, DEFAULT_LEDGER)
        keys_file = self.build_dir / PRIVATE_KEY_PATH_SCHEMA.format(ledger)
        keys_file.write_text(key, encoding=DEFAULT_ENCODING)

    def _populate_keys_multiledger(self) -> None:
        """Populate the keys directory with multiple set of keys"""

    def populate_private_keys(self) -> "DockerComposeGenerator":
        """Populate the private keys to the build directory for host mapping."""
        if self.service_builder.multiledger:
            self._populate_keys_multiledger()
        else:
            self._populate_keys()
        return self


@dataclass
class Deployment(LocalResource):
    """Deployment resource for a service."""

    status: DeploymentStatus
    nodes: DeployedNodes
    path: Path

    _file = "deployment.json"

    @staticmethod
    def new(path: Path) -> "Deployment":
        """
        Create a new deployment

        :param path: Path to service
        :return: Deployment object
        """
        deployment = Deployment(
            status=DeploymentStatus.CREATED,
            nodes=DeployedNodes(agent=[], tendermint=[]),
            path=path,
        )
        deployment.store()
        return deployment

    @classmethod
    def load(cls, path: Path) -> "Deployment":
        """Load a service"""
        return super().load(path)  # type: ignore

    def copy_previous_agent_run_logs(self) -> None:
        """Copy previous agent logs."""
        source_path = self.path / DEPLOYMENT / "agent" / "log.txt"
        destination_path = self.path / "prev_log.txt"
        if source_path.exists():
            shutil.copy(source_path, destination_path)

    def _build_docker(
        self,
        force: bool = True,
        chain: t.Optional[str] = None,
    ) -> None:
        """Build docker deployment."""
        service = Service.load(path=self.path)
        # Remove network from cache if exists, this will raise an error
        # if the service is still running so we can do an early exit
        remove_service_network(
            service_name=service.helper.config.name,
            force=force,
        )

        build = self.path / DEPLOYMENT
        if build.exists() and not force:
            return
        if build.exists() and force:
            self.copy_previous_agent_run_logs()
            shutil.rmtree(build)
        mkdirs(build_dir=build)

        keys_file = self.path / KEYS_JSON
        keys_file.write_text(
            json.dumps(
                [
                    {
                        "address": key.address,
                        "private_key": key.private_key,
                        "ledger": key.ledger.name.lower(),
                    }
                    for key in service.keys
                ],
                indent=4,
            ),
            encoding="utf-8",
        )
        try:
            service.consume_env_variables()
            builder = ServiceBuilder.from_dir(
                path=service.service_path,
                keys_file=keys_file,
                number_of_agents=len(service.keys),
            )
            builder.deplopyment_type = DockerComposeGenerator.deployment_type
            builder.try_update_abci_connection_params()

            if not chain:
                chain = service.home_chain

            chain_config = service.chain_configs[chain]
            chain_data = chain_config.chain_data

            builder.try_update_runtime_params(
                multisig_address=chain_data.multisig,
                agent_instances=chain_data.instances,
                service_id=chain_data.token,
                consensus_threshold=None,
            )

            # build deployment
            (
                DockerComposeGenerator(
                    service_builder=builder,
                    build_dir=build.resolve(),
                    use_tm_testnet_setup=True,
                )
                .generate()
                .generate_config_tendermint()
                .write_config()
                .populate_private_keys()
            )
        except Exception as e:
            shutil.rmtree(build)
            raise e

        with (build / DOCKER_COMPOSE_YAML).open("r", encoding="utf-8") as stream:
            deployment = yaml_load(stream=stream)

        self.nodes = DeployedNodes(
            agent=[
                service for service in deployment["services"] if "_abci_" in service
            ],
            tendermint=[
                service for service in deployment["services"] if "_tm_" in service
            ],
        )

        _volumes = []
        for volume, mount in (
            service.helper.deployment_config().get("volumes", {}).items()
        ):
            (build / volume).mkdir(exist_ok=True)
            _volumes.append(f"./{volume}:{mount}:Z")

        for node in deployment["services"]:
            if "abci" in node:
                deployment["services"][node]["volumes"].extend(_volumes)

        with (build / DOCKER_COMPOSE_YAML).open("w", encoding="utf-8") as stream:
            yaml_dump(data=deployment, stream=stream)

        self.status = DeploymentStatus.BUILT
        self.store()

    def _build_host(self, force: bool = True, chain: t.Optional[str] = None) -> None:
        """Build host depployment."""
        build = self.path / DEPLOYMENT
        if build.exists() and not force:
            return

        if build.exists() and force:
            stop_host_deployment(build_dir=build)
            try:
                # sleep needed to ensure all processes closed/killed otherwise it will block directory removal on windows
                time.sleep(3)
                self.copy_previous_agent_run_logs()
                shutil.rmtree(build)
            except:  # noqa  # pylint: disable=bare-except
                # sleep and try again. exception if fails
                print_exc()
                time.sleep(3)
                shutil.rmtree(build)

        service = Service.load(path=self.path)
        if service.helper.config.number_of_agents > 1:
            raise RuntimeError(
                "Host deployment currently only supports single agent deployments"
            )

        if not chain:
            chain = service.home_chain

        chain_config = service.chain_configs[chain]
        chain_data = chain_config.chain_data

        keys_file = self.path / KEYS_JSON
        keys_file.write_text(
            json.dumps(
                [
                    {
                        "address": key.address,
                        "private_key": key.private_key,
                        "ledger": key.ledger.name.lower(),
                    }
                    for key in service.keys
                ],
                indent=4,
            ),
            encoding="utf-8",
        )
        try:
            service.consume_env_variables()
            builder = ServiceBuilder.from_dir(
                path=service.service_path,
                keys_file=keys_file,
                number_of_agents=len(service.keys),
            )
            builder.deplopyment_type = HostDeploymentGenerator.deployment_type
            builder.try_update_abci_connection_params()
            builder.try_update_runtime_params(
                multisig_address=chain_data.multisig,
                agent_instances=chain_data.instances,
                service_id=chain_data.token,
                consensus_threshold=None,
            )

            (
                HostDeploymentGenerator(
                    service_builder=builder,
                    build_dir=build.resolve(),
                    use_tm_testnet_setup=True,
                )
                .generate_config_tendermint()
                .generate()
                .populate_private_keys()
            )

        except Exception as e:
            if build.exists():
                shutil.rmtree(build)
            raise e

        self.status = DeploymentStatus.BUILT
        self.store()

    def build(
        self,
        use_docker: bool = False,
        force: bool = True,
        chain: t.Optional[str] = None,
    ) -> None:
        """
        Build a deployment

        :param use_docker: Use a Docker Compose deployment (True) or Host deployment (False).
        :param force: Remove existing deployment and build a new one
        :param chain: Chain to set runtime parameters on the deployment (home_chain if not provided).
        :return: Deployment object
        """
        # TODO: Maybe remove usage of chain and use home_chain always?
        if use_docker:
            return self._build_docker(force=force, chain=chain)
        return self._build_host(force=force, chain=chain)

    def start(self, use_docker: bool = False) -> None:
        """Start the service"""
        if self.status != DeploymentStatus.BUILT:
            raise NotAllowed(
                f"The deployment is in {self.status}; It needs to be in {DeploymentStatus.BUILT} status"
            )

        self.status = DeploymentStatus.DEPLOYING
        self.store()

        try:
            if use_docker:
                run_deployment(build_dir=self.path / "deployment", detach=True)
            else:
                run_host_deployment(build_dir=self.path / "deployment")
        except Exception:
            self.status = DeploymentStatus.BUILT
            self.store()
            raise

        self.status = DeploymentStatus.DEPLOYED
        self.store()

    def stop(self, use_docker: bool = False, force: bool = False) -> None:
        """Stop the deployment."""
        if self.status != DeploymentStatus.DEPLOYED and not force:
            return

        self.status = DeploymentStatus.STOPPING
        self.store()

        if use_docker:
            stop_deployment(build_dir=self.path / "deployment")
        else:
            stop_host_deployment(build_dir=self.path / "deployment")

        self.status = DeploymentStatus.BUILT
        self.store()

    def delete(self) -> None:
        """Delete the deployment."""
        build = self.path / DEPLOYMENT
        shutil.rmtree(build)
        self.status = DeploymentStatus.DELETED
        self.store()


@dataclass
class Service(LocalResource):
    """Service class."""

    version: int
    service_config_id: str
    hash: str
    hash_history: t.Dict[int, str]
    keys: Keys
    home_chain: str
    chain_configs: ChainConfigs
    description: str
    env_variables: EnvVariables

    path: Path
    service_path: Path

    name: t.Optional[str] = None

    _helper: t.Optional[ServiceHelper] = None
    _deployment: t.Optional[Deployment] = None

    _file = "config.json"

    @classmethod
    def migrate_format(cls, path: Path) -> bool:  # pylint: disable=too-many-statements
        """Migrate the JSON file format if needed."""

        if not path.is_dir():
            return False

        if not path.name.startswith(SERVICE_CONFIG_PREFIX) and not path.name.startswith(
            "bafybei"
        ):
            return False

        if path.name.startswith("bafybei"):
            backup_name = f"backup_{int(time.time())}_{path.name}"
            backup_path = path.parent / backup_name
            shutil.copytree(path, backup_path)
            deployment_path = backup_path / "deployment"
            if deployment_path.is_dir():
                shutil.rmtree(deployment_path)

        with open(path / Service._file, "r", encoding="utf-8") as file:
            data = json.load(file)

        version = data.get("version", 0)
        if version > SERVICE_CONFIG_VERSION:
            raise RuntimeError(
                f"Service configuration in {path} has version {version}, which means it was created with a newer version of olas-operate-middleware. Only configuration versions <= {SERVICE_CONFIG_VERSION} are supported by this version of olas-operate-middleware."
            )

        # Complete missing env vars for trader
        if "trader" in data["name"].lower():
            data.setdefault("env_variables", {})

            for key, value in DEFAULT_TRADER_ENV_VARS.items():
                if key not in data["env_variables"]:
                    data["env_variables"][key] = value

            with open(path / Service._file, "w", encoding="utf-8") as file:
                json.dump(data, file, indent=2)

        if version == SERVICE_CONFIG_VERSION:
            return False

        # Migration steps for older versions
        if version == 0:
            new_data = {
                "version": 2,
                "hash": data.get("hash"),
                "keys": data.get("keys"),
                "home_chain_id": "100",  # This is the default value for version 2 - do not change, will be corrected below
                "chain_configs": {
                    "100": {  # This is the default value for version 2 - do not change, will be corrected below
                        "ledger_config": {
                            "rpc": data.get("ledger_config", {}).get("rpc"),
                            "type": data.get("ledger_config", {}).get("type"),
                            "chain": data.get("ledger_config", {}).get("chain"),
                        },
                        "chain_data": {
                            "instances": data.get("chain_data", {}).get(
                                "instances", []
                            ),
                            "token": data.get("chain_data", {}).get("token"),
                            "multisig": data.get("chain_data", {}).get("multisig"),
                            "staked": data.get("chain_data", {}).get("staked", False),
                            "on_chain_state": data.get("chain_data", {}).get(
                                "on_chain_state", 3
                            ),
                            "user_params": {
                                "staking_program_id": "pearl_alpha",
                                "nft": data.get("chain_data", {})
                                .get("user_params", {})
                                .get("nft"),
                                "threshold": data.get("chain_data", {})
                                .get("user_params", {})
                                .get("threshold"),
                                "use_staking": data.get("chain_data", {})
                                .get("user_params", {})
                                .get("use_staking"),
                                "cost_of_bond": data.get("chain_data", {})
                                .get("user_params", {})
                                .get("cost_of_bond"),
                                "fund_requirements": data.get("chain_data", {})
                                .get("user_params", {})
                                .get("fund_requirements", {}),
                                "agent_id": data.get("chain_data", {})
                                .get("user_params", {})
                                .get("agent_id", "14"),
                            },
                        },
                    }
                },
                "service_path": data.get("service_path", ""),
                "name": data.get("name", ""),
            }
            data = new_data

        if version < 4:
            # Add missing fields introduced in later versions, if necessary.
            for _, chain_data in data.get("chain_configs", {}).items():
                chain_data.setdefault("chain_data", {}).setdefault(
                    "user_params", {}
                ).setdefault("use_mech_marketplace", False)
                chain_data.setdefault("chain_data", {}).setdefault(
                    "user_params", {}
                ).setdefault("agent_id", 14)

            data["description"] = data.setdefault("description", data.get("name"))
            data["hash_history"] = data.setdefault(
                "hash_history", {int(time.time()): data["hash"]}
            )

            if "service_config_id" not in data:
                service_config_id = Service.get_new_service_config_id(path)
                new_path = path.parent / service_config_id
                data["service_config_id"] = service_config_id
                path = path.rename(new_path)

            old_to_new_ledgers = ["ethereum", "solana"]
            for key_data in data["keys"]:
                key_data["ledger"] = old_to_new_ledgers[key_data["ledger"]]

            old_to_new_chains = [
                "ethereum",
                "goerli",
                "gnosis",
                "solana",
                "optimistic",
                "base",
                "mode",
            ]
            new_chain_configs = {}
            for chain_id, chain_data in data["chain_configs"].items():
                chain_data["ledger_config"]["chain"] = old_to_new_chains[
                    chain_data["ledger_config"]["chain"]
                ]
                del chain_data["ledger_config"]["type"]
                new_chain_configs[Chain.from_id(int(chain_id)).value] = chain_data  # type: ignore

            data["chain_configs"] = new_chain_configs
            data["home_chain"] = data.setdefault("home_chain", Chain.from_id(int(data.get("home_chain_id", "100"))).value)  # type: ignore
            del data["home_chain_id"]

            if "env_variables" not in data:
                if data["name"] == "valory/trader_pearl":
                    data["env_variables"] = DEFAULT_TRADER_ENV_VARS
                else:
                    data["env_variables"] = {}

        if version < 5:
            new_chain_configs = {}
            for chain, chain_data in data["chain_configs"].items():
                fund_requirements = chain_data["chain_data"]["user_params"][
                    "fund_requirements"
                ]
                if ZERO_ADDRESS not in fund_requirements:
                    chain_data["chain_data"]["user_params"]["fund_requirements"] = {
                        ZERO_ADDRESS: fund_requirements
                    }

                new_chain_configs[chain] = chain_data  # type: ignore

            data["chain_configs"] = new_chain_configs

        data["version"] = SERVICE_CONFIG_VERSION

        # Redownload service path
        service_path = path / Path(data["service_path"]).name
        if service_path.exists() and service_path.is_dir():
            print("EXISTS")
            shutil.rmtree(service_path)

        service_path = Path(
            IPFSTool().download(
                hash_id=data["hash"],
                target_dir=path,
            )
        )
        data["service_path"] = str(service_path)

        with open(path / Service._file, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=2)

        return True

    @classmethod
    def load(cls, path: Path) -> "Service":
        """Load a service"""
        return super().load(path)  # type: ignore

    @property
    def helper(self) -> ServiceHelper:
        """Get service helper."""
        if self._helper is None:
            self._helper = ServiceHelper(path=self.service_path)
        return t.cast(ServiceHelper, self._helper)

    @property
    def deployment(self) -> Deployment:
        """Load deployment object for the service."""
        if not (self.path / DEPLOYMENT_JSON).exists():
            self._deployment = Deployment.new(path=self.path)
        try:
            self._deployment = Deployment.load(path=self.path)
        except JSONDecodeError:
            self._deployment = Deployment.new(path=self.path)
        return t.cast(Deployment, self._deployment)

    @staticmethod
    def new(  # pylint: disable=too-many-locals
        keys: Keys,
        service_template: ServiceTemplate,
        storage: Path,
    ) -> "Service":
        """Create a new service."""

        service_config_id = Service.get_new_service_config_id(storage)
        path = storage / service_config_id
        path.mkdir()
        service_path = Path(
            IPFSTool().download(
                hash_id=service_template["hash"],
                target_dir=path,
            )
        )

        ledger_configs = ServiceHelper(path=service_path).ledger_configs()

        chain_configs = {}
        for chain, config in service_template["configurations"].items():
            ledger_config = ledger_configs[chain]
            ledger_config.rpc = config["rpc"]

            chain_data = OnChainData(
                instances=[],
                token=NON_EXISTENT_TOKEN,
                multisig=NON_EXISTENT_MULTISIG,
                staked=False,
                on_chain_state=OnChainState.NON_EXISTENT,
                user_params=OnChainUserParams.from_json(config),  # type: ignore
            )

            chain_configs[chain] = ChainConfig(
                ledger_config=ledger_config,
                chain_data=chain_data,
            )

        current_timestamp = int(time.time())
        service = Service(
            version=SERVICE_CONFIG_VERSION,
            service_config_id=service_config_id,
            name=service_template["name"],
            description=service_template["description"],
            hash=service_template["hash"],
            keys=keys,
            home_chain=service_template["home_chain"],
            hash_history={current_timestamp: service_template["hash"]},
            chain_configs=chain_configs,
            path=service_path.parent,
            service_path=service_path,
            env_variables=service_template["env_variables"],
        )
        service.store()
        return service

    def service_public_id(self, include_version: bool = True) -> str:
        """Get the public id (based on the service hash)."""
        with (self.service_path / "service.yaml").open("r", encoding="utf-8") as fp:
            service_yaml, *_ = yaml_load_all(fp)

        public_id = f"{service_yaml['author']}/{service_yaml['name']}"

        if include_version:
            public_id += f":{service_yaml['version']}"

        return public_id

    @staticmethod
    def get_service_public_id(
        hash: str, temp_dir: t.Optional[Path] = None, include_version: bool = True
    ) -> str:
        """
        Get the service public ID from IPFS based on the hash.

        :param hash: The IPFS hash of the service.
        :param dir: Optional directory path where the temporary download folder will be created.
                    If None, a system-default temporary directory will be used.
        :return: The public ID of the service in the format "author/name:version".
        """
        with tempfile.TemporaryDirectory(dir=temp_dir) as path:
            package_path = Path(
                IPFSTool().download(
                    hash_id=hash,
                    target_dir=path,
                )
            )

            with (package_path / "service.yaml").open("r", encoding="utf-8") as fp:
                service_yaml, *_ = yaml_load_all(fp)

            public_id = f"{service_yaml['author']}/{service_yaml['name']}"

            if include_version:
                public_id += f":{service_yaml['version']}"

            return public_id

    @staticmethod
    def get_new_service_config_id(path: Path) -> str:
        """Get a new service config id that does not clash with any directory in path."""
        while True:
            service_config_id = f"{SERVICE_CONFIG_PREFIX}{uuid.uuid4()}"
            new_path = path.parent / service_config_id
            if not new_path.exists():
                return service_config_id

    def update(
        self,
        service_template: ServiceTemplate,
        allow_different_service_public_id: bool = False,
        partial_update: bool = False,
    ) -> None:
        """Update service."""

        target_hash = service_template.get("hash")
        if target_hash:
            target_service_public_id = Service.get_service_public_id(
                target_hash, self.path
            )

            if not allow_different_service_public_id and (
                self.service_public_id() != target_service_public_id
            ):
                raise ValueError(
                    f"Trying to update a service with a different public id: {self.service_public_id()=} {self.hash=} {target_service_public_id=} {target_hash=}."
                )

        self.hash = service_template.get("hash", self.hash)

        # hash_history - Only update if latest inserted hash is different
        if self.hash_history[max(self.hash_history.keys())] != self.hash:
            current_timestamp = int(time.time())
            self.hash_history[current_timestamp] = self.hash

        self.home_chain = service_template.get("home_chain", self.home_chain)
        self.description = service_template.get("description", self.description)
        self.name = service_template.get("name", self.name)

        shutil.rmtree(self.service_path)
        service_path = Path(
            IPFSTool().download(
                hash_id=self.hash,
                target_dir=self.path,
            )
        )
        self.service_path = service_path

        # env_variables
        if partial_update:
            for var, attrs in service_template.get("env_variables", {}).items():
                self.env_variables.setdefault(var, {}).update(attrs)
        else:
            self.env_variables = service_template["env_variables"]

        # chain_configs
        # TODO support remove chains for non-partial updates
        # TODO ensure all and only existing chains are passed for non-partial updates
        ledger_configs = ServiceHelper(path=self.service_path).ledger_configs()
        for chain, new_config in service_template.get("configurations", {}).items():
            if chain in self.chain_configs:
                # The template is providing a chain configuration that already
                # exists in this service - update only the user parameters.
                # This is to avoid losing on-chain data like safe, token, etc.
                if partial_update:
                    config = self.chain_configs[chain].chain_data.user_params.json
                    config.update(new_config)
                else:
                    config = new_config

                self.chain_configs[
                    chain
                ].chain_data.user_params = OnChainUserParams.from_json(
                    config  # type: ignore
                )
            else:
                # The template is providing a chain configuration that does
                # not currently exist in this service - copy all config as
                # when creating a new service.
                ledger_config = ledger_configs[chain]
                ledger_config.rpc = new_config["rpc"]

                chain_data = OnChainData(
                    instances=[],
                    token=NON_EXISTENT_TOKEN,
                    multisig=NON_EXISTENT_MULTISIG,
                    staked=False,
                    on_chain_state=OnChainState.NON_EXISTENT,
                    user_params=OnChainUserParams.from_json(new_config),  # type: ignore
                )

                self.chain_configs[chain] = ChainConfig(
                    ledger_config=ledger_config,
                    chain_data=chain_data,
                )

        self.store()

    def update_user_params_from_template(
        self, service_template: ServiceTemplate
    ) -> None:
        """Update user params from template."""
        for chain, config in service_template["configurations"].items():
            self.chain_configs[
                chain
            ].chain_data.user_params = OnChainUserParams.from_json(
                config  # type: ignore
            )

        self.store()

    def consume_env_variables(self) -> None:
        """Consume (apply) environment variables."""
        for env_var, attributes in self.env_variables.items():
            os.environ[env_var] = str(attributes["value"])

    def update_env_variables_values(
        self, env_var_to_value: t.Dict[str, t.Any], except_if_undefined: bool = False
    ) -> None:
        """
        Updates and stores the values of the env variables to override service.yaml on the deployment.

        This method does not apply the variables to the environment. Use consume_env_variables to apply the
        env variables.
        """

        updated = False
        for var, value in env_var_to_value.items():
            value_str = str(value)
            attributes = self.env_variables.get(var)
            if (
                attributes
                and self.env_variables[var]["provision_type"]
                == ServiceEnvProvisionType.COMPUTED
                and attributes["value"] != value_str
            ):
                attributes["value"] = value_str
                updated = True
            elif except_if_undefined:
                raise ValueError(
                    f"Trying to set value for an environment variable ({var}) not present on service configuration {self.service_config_id}."
                )

        if updated:
            self.store()

    def delete(self) -> None:
        """Delete a service."""
        parent_directory = self.path.parent
        new_path = parent_directory / f"{DELETE_PREFIX}{self.path.name}"
        shutil.move(self.path, new_path)
        shutil.rmtree(new_path)
