# ------------------------------------------------------------------------------
#
#   Copyright 2023-2024 Valory AG
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
"""Terminate on-chain service."""

import json
from typing import TYPE_CHECKING

from operate.constants import OPERATE_HOME
from operate.operate_types import OnChainState
from operate.quickstart.run_service import (
    ask_password_if_needed,
    configure_local_config,
    ensure_enough_funds,
    get_service,
)
from operate.utils.common import ask_yes_or_no, print_section, print_title


if TYPE_CHECKING:
    from operate.cli import OperateApp


def terminate_service(operate: "OperateApp", config_path: str) -> None:
    """Terminate service."""

    with open(config_path, "r") as config_file:
        template = json.load(config_file)

    print_title(f"Terminate {template['name']} on-chain service")

    # check if agent was started before
    path = OPERATE_HOME / "local_config.json"
    if not path.exists():
        print("No previous agent setup found. Exiting.")
        return

    if not ask_yes_or_no(
        "Please, ensure that your service is stopped (./stop_service.sh) before proceeding. "
        "Do you want to continue?"
    ):
        print("Cancelled.")
        return

    config = configure_local_config(template)
    ask_password_if_needed(operate, config)
    manager = operate.service_manager()
    service = get_service(manager, template)
    ensure_enough_funds(operate, service)
    manager.terminate_service_on_chain_from_safe(
        service_config_id=service.service_config_id,
        chain=config.principal_chain,
    )

    if (
        manager._get_on_chain_state(service, config.principal_chain)
        == OnChainState.PRE_REGISTRATION
    ):
        service_id = service.chain_configs[config.principal_chain].chain_data.token
        print(
            f"\nService {service_id} is now terminated and unbonded (i.e., it is on PRE-REGISTRATION state)."
            f"You can check this on https://registry.olas.network/{config.principal_chain}/services/{service_id}."
            "In order to deploy your on-chain service again, please run the service again'."
        )

    print()
    print_section(f"{template['name']} service terminated")
