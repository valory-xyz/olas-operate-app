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

from operate.operate_types import Chain


OPERATE = ".operate"
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

ON_CHAIN_INTERACT_TIMEOUT = 120.0
ON_CHAIN_INTERACT_RETRIES = 40
ON_CHAIN_INTERACT_SLEEP = 3.0

HEALTH_CHECK_URL = "http://127.0.0.1:8716/healthcheck"  # possible DNS issues on windows so use IP address

TM_CONTROL_URL = "http://localhost:8080"
ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

WRAPPED_NATIVE_ASSET = {
    Chain.GNOSIS.value: "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d",
    Chain.OPTIMISTIC.value: "0x4200000000000000000000000000000000000006",
    Chain.MODE.value: "0x4200000000000000000000000000000000000006",
    Chain.BASE.value: "0x4200000000000000000000000000000000000006",
}
