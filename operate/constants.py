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

"""Constants."""

from pathlib import Path

from operate.operate_types import Chain


OPERATE = ".operate"
OPERATE_HOME = Path.cwd() / OPERATE
CONFIG = "config.json"
SERVICES = "services"
KEYS = "keys"
DEPLOYMENT = "deployment"
DEPLOYMENT_JSON = "deployment.json"
CONFIG = "config.json"
KEY = "key"
KEYS = "keys"
KEYS_JSON = "keys.json"
DOCKER_COMPOSE_YAML = "docker-compose.yaml"
SERVICE_YAML = "service.yaml"
STAKED_BONDING_TOKEN = "OLAS"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

ON_CHAIN_INTERACT_TIMEOUT = 120.0
ON_CHAIN_INTERACT_RETRIES = 40
ON_CHAIN_INTERACT_SLEEP = 3.0

HEALTH_CHECK_URL = "http://127.0.0.1:8716/healthcheck"  # possible DNS issues on windows so use IP address
SAFE_WEBAPP_URL = "https://app.safe.global/home?safe=gno:"
TM_CONTROL_URL = "http://localhost:8080"
IPFS_ADDRESS = "https://gateway.autonolas.tech/ipfs/f01701220{hash}"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

# TODO: These links may break in the future, use a more robust approach
MECH_CONTRACT_JSON_URL = "https://raw.githubusercontent.com/valory-xyz/mech/refs/tags/v0.8.0/packages/valory/contracts/agent_mech/build/AgentMech.json"
STAKING_TOKEN_INSTANCE_ABI_PATH = "https://raw.githubusercontent.com/valory-xyz/trader/refs/tags/v0.23.0/packages/valory/contracts/staking_token/build/StakingToken.json"
MECH_ACTIVITY_CHECKER_JSON_URL = "https://raw.githubusercontent.com/valory-xyz/autonolas-staking-programmes/refs/heads/main/abis/0.8.25/SingleMechActivityChecker.json"
SERVICE_REGISTRY_TOKEN_UTILITY_JSON_URL = "https://raw.githubusercontent.com/valory-xyz/open-autonomy/refs/tags/v0.18.4/packages/valory/contracts/service_registry_token_utility/build/ServiceRegistryTokenUtility.json"
MECH_AGENT_FACTORY_JSON_URL = "https://raw.githubusercontent.com/valory-xyz/ai-registry-mech/main/abis/0.8.25/AgentFactory.json"
