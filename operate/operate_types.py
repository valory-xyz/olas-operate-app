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
import os
import typing as t
from dataclasses import dataclass

from autonomy.chain.config import ChainType
from autonomy.chain.constants import CHAIN_NAME_TO_CHAIN_ID
from typing_extensions import TypedDict

from operate.resource import LocalResource


_ACTIONS = {
    "status": 0,
    "build": 1,
    "deploy": 2,
    "stop": 3,
}

CHAIN_NAME_TO_CHAIN_ID["solana"] = 900

_CHAIN_ID_TO_CHAIN_NAME = {
    chain_id: chain_name for chain_name, chain_id in CHAIN_NAME_TO_CHAIN_ID.items()
}


class LedgerType(str, enum.Enum):
    """Ledger type enum."""

    ETHEREUM = "ethereum"
    SOLANA = "solana"

    @property
    def config_file(self) -> str:
        """Config filename."""
        return f"{self.name.lower()}.json"

    @property
    def key_file(self) -> str:
        """Key filename."""
        return f"{self.name.lower()}.txt"

    @classmethod
    def from_id(cls, chain_id: int) -> "LedgerType":
        """Load from chain ID."""
        return Chain(_CHAIN_ID_TO_CHAIN_NAME[chain_id]).ledger_type


# Dynamically create the Chain enum from the ChainType
# TODO: Migrate this to open-autonomy and remove this modified version of Chain here and use the one from open-autonomy
# This version of open-autonomy must support the LedgerType to support SOLANA in the future
# If solana support is not fuly implemented, decide to keep this half-baked feature.
#
# TODO: Once the above issue is properly implemented in Open Autonomy, remove the following
# lines from tox.ini:
#
#    exclude = ^(operate/operate_types\.py|scripts/setup_wallet\.py|operate/ledger/profiles\.py|operate/ledger/__init__\.py|operate/wallet/master\.py|operate/services/protocol\.py|operate/services/manage\.py|operate/cli\.py)$
#
#    [mypy-operate.*]
#    follow_imports = skip  # noqa
#
# These lines were itroduced to resolve mypy issues with the temporary Chain/ChainType solution.
Chain = enum.Enum(
    "Chain",
    [(member.name, member.value) for member in ChainType]
    + [
        ("SOLANA", "solana"),
    ],
)


class ChainMixin:
    """Mixin for some new functions in the ChainType class."""

    @property
    def id(self) -> t.Optional[int]:
        """Chain ID"""
        if self == Chain.CUSTOM:
            chain_id = os.environ.get("CUSTOM_CHAIN_ID")
            if chain_id is None:
                return None
            return int(chain_id)
        return CHAIN_NAME_TO_CHAIN_ID[self.value]

    @property
    def ledger_type(self) -> LedgerType:
        """Ledger type."""
        if self in (Chain.SOLANA,):
            return LedgerType.SOLANA
        return LedgerType.ETHEREUM

    @classmethod
    def from_string(cls, chain: str) -> "Chain":
        """Load from string."""
        return Chain(chain.lower())

    @classmethod
    def from_id(cls, chain_id: int) -> "Chain":
        """Load from chain ID."""
        return Chain(_CHAIN_ID_TO_CHAIN_NAME[chain_id])


# Add the ChainMixin methods to the Chain enum
for name in dir(ChainMixin):
    if not name.startswith("__"):
        setattr(Chain, name, getattr(ChainMixin, name))


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
    chain: Chain


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
    agent_id: int
    threshold: int
    use_staking: bool
    use_mech_marketplace: bool
    cost_of_bond: int
    fund_requirements: t.Dict[str, FundRequirementsTemplate]
    fallback_chain_params: t.Optional[t.Dict]


class ServiceEnvProvisionType(str, enum.Enum):
    """Service environment variable provision type."""

    FIXED = "fixed"
    USER = "user"
    COMPUTED = "computed"


class EnvVariableAttributes(TypedDict):
    """Service environment variable template."""

    name: str
    description: str
    value: str
    provision_type: ServiceEnvProvisionType


ConfigurationTemplates = t.Dict[str, ConfigurationTemplate]
EnvVariables = t.Dict[str, EnvVariableAttributes]


class ServiceTemplate(TypedDict, total=False):
    """Service template."""

    name: str
    hash: str
    image: str
    description: str
    service_version: str
    home_chain: str
    configurations: ConfigurationTemplates
    env_variables: EnvVariables


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


OnChainTokenRequirements = t.Dict[str, OnChainFundRequirements]


@dataclass
class OnChainUserParams(LocalResource):
    """On-chain user params."""

    staking_program_id: str
    nft: str
    threshold: int
    agent_id: int
    use_staking: bool
    use_mech_marketplace: bool
    cost_of_bond: int
    fund_requirements: OnChainTokenRequirements

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


class FundingConfig(TypedDict):
    """Funding config."""

    topup: int
    threshold: int


class AssetFundingValues(TypedDict):
    """Asset Funding values."""

    agent: FundingConfig
    safe: FundingConfig


FundingValues = t.Dict[str, AssetFundingValues]  # str is the asset address
