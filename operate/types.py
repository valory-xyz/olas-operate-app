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

"""Types module."""

import enum
import typing as t
from dataclasses import dataclass

from typing_extensions import TypedDict

from operate.resource import LocalResource


_ACTIONS = {
    "status": 0,
    "build": 1,
    "deploy": 2,
    "stop": 3,
}


_CHAIN_NAME_TO_ENUM = {
    "ethereum": 0,
    "goerli": 1,
    "gnosis": 2,
    "solana": 3,
    "optimism": 4,
    "base": 5,
}

_CHAIN_ID_TO_CHAIN_NAME = {
    1: "ethereum",
    5: "goerli",
    100: "gnosis",
    1399811149: "solana",
    10: "optimism",
    8453: "base",
}

_CHAIN_NAME_TO_ID = {val: key for key, val in _CHAIN_ID_TO_CHAIN_NAME.items()}

_LEDGER_TYPE_TO_ENUM = {
    "ethereum": 0,
    "solana": 1,
}


class LedgerType(enum.IntEnum):
    """Ledger type enum."""

    ETHEREUM = 0
    SOLANA = 1

    @classmethod
    def from_string(cls, chain: str) -> "LedgerType":
        """Load from string."""
        return cls(_LEDGER_TYPE_TO_ENUM[chain.lower()])

    @property
    def config_file(self) -> str:
        """Config filename."""
        return f"{self.name.lower()}.json"

    @property
    def key_file(self) -> str:
        """Key filename."""
        return f"{self.name.lower()}.txt"


class ChainType(enum.IntEnum):
    """Chain type enum."""

    ETHEREUM = 0
    GOERLI = 1
    GNOSIS = 2
    SOLANA = 3
    OPTIMISM = 4
    BASE = 5

    @property
    def id(self) -> int:
        """Returns chain id."""
        return _CHAIN_NAME_TO_ID[self.name.lower()]

    @classmethod
    def from_string(cls, chain: str) -> "ChainType":
        """Load from string."""
        return cls(_CHAIN_NAME_TO_ENUM[chain.lower()])

    @classmethod
    def from_id(cls, cid: int) -> "ChainType":
        """Load from chain ID."""
        return cls(_CHAIN_NAME_TO_ENUM[_CHAIN_ID_TO_CHAIN_NAME[cid]])


class Action(enum.IntEnum):
    """Action payload."""

    STATUS = 0
    BUILD = 1
    DEPLOY = 2
    STOP = 3

    @classmethod
    def from_string(cls, action: str) -> "Action":
        """Load from string."""
        return cls(_ACTIONS[action])


class DeploymentStatus(enum.IntEnum):
    """Status payload."""

    CREATED = 0
    BUILT = 1
    DEPLOYING = 2
    DEPLOYED = 3
    STOPPING = 4
    STOPPED = 5
    DELETED = 6


# TODO defined in aea.chain.base.OnChainState
class OnChainState(enum.IntEnum):
    """On-chain state."""

    NON_EXISTENT = 0
    PRE_REGISTRATION = 1
    ACTIVE_REGISTRATION = 2
    FINISHED_REGISTRATION = 3
    DEPLOYED = 4
    TERMINATED_BONDED = 5
    UNBONDED = 6  # TODO this is not an on-chain state https://github.com/valory-xyz/autonolas-registries/blob/main/contracts/ServiceRegistryL2.sol


class ContractAddresses(TypedDict):
    """Contracts templates."""

    service_manager: str
    service_registry: str
    service_registry_token_utility: str
    gnosis_safe_proxy_factory: str
    gnosis_safe_same_address_multisig: str
    multisend: str


@dataclass
class LedgerConfig(LocalResource):
    """Ledger config."""

    rpc: str
    type: LedgerType
    chain: ChainType


LedgerConfigs = t.Dict[str, LedgerConfig]


class DeploymentConfig(TypedDict):
    """Deployments template."""

    volumes: t.Dict[str, str]


class FundRequirementsTemplate(TypedDict):
    """Fund requirement template."""

    agent: int
    safe: int


class ConfigurationTemplate(TypedDict):
    """Configuration template."""

    staking_program_id: str
    nft: str
    rpc: str
    threshold: int
    use_staking: bool
    cost_of_bond: int
    fund_requirements: FundRequirementsTemplate
    fallback_chain_params: t.Optional[t.Dict]


ConfigurationTemplates = t.Dict[str, ConfigurationTemplate]


class ServiceTemplate(TypedDict):
    """Service template."""

    name: str
    hash: str
    image: str
    description: str
    service_version: str
    home_chain_id: str
    configurations: ConfigurationTemplates


@dataclass
class DeployedNodes(LocalResource):
    """Deployed nodes type."""

    agent: t.List[str]
    tendermint: t.List[str]


@dataclass
class OnChainFundRequirements(LocalResource):
    """On-chain fund requirements."""

    agent: float
    safe: float


@dataclass
class OnChainUserParams(LocalResource):
    """On-chain user params."""

    staking_program_id: str
    nft: str
    threshold: int
    use_staking: bool
    cost_of_bond: int
    fund_requirements: OnChainFundRequirements

    @classmethod
    def from_json(cls, obj: t.Dict) -> "OnChainUserParams":
        """Load a service"""
        return super().from_json(obj)  # type: ignore


@dataclass
class OnChainData(LocalResource):
    """On-chain data"""

    instances: t.List[str]  # Agent instances registered as safe owners
    token: int
    multisig: str
    staked: bool
    on_chain_state: OnChainState
    user_params: OnChainUserParams


@dataclass
class ChainConfig(LocalResource):
    """Chain config."""

    ledger_config: LedgerConfig
    chain_data: OnChainData

    @classmethod
    def from_json(cls, obj: t.Dict) -> "ChainConfig":
        """Load the chain config."""
        return super().from_json(obj)  # type: ignore


ChainConfigs = t.Dict[str, ChainConfig]
