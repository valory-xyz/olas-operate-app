# -*- coding: utf-8 -*-
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
"""Reset staking."""

import json
import os
from typing import TYPE_CHECKING

from operate.constants import OPERATE_HOME
from operate.quickstart.run_service import ask_password_if_needed, configure_local_config, ensure_enough_funds, get_service
from operate.utils.common import ask_yes_or_no, print_section, print_title
from operate.ledger.profiles import STAKING
from operate.operate_types import Chain

if TYPE_CHECKING:
    from operate.cli import OperateApp


def reset_staking(operate: "OperateApp", config_path: str) -> None:
    """Reset staking."""
    attended = os.environ.get("ATTENDED", "true").lower() == "true"

    with open(config_path, "r") as config_file:
        template = json.load(config_file)

    print_title(f"Reset your staking program preference")

    # check if agent was started before
    path = OPERATE_HOME / "local_config.json"
    if not path.exists():
        print("No previous agent setup found. Exiting.")
        return

    config = configure_local_config(template)
    current_program = config.staking_vars.get('STAKING_PROGRAM') if config.staking_vars else None

    if not current_program:
        print("No staking program preference found. Exiting.")
        return

    print(f"Your current staking program preference is set to '{current_program}'.\n")
    print(
        "You can reset your preference. "
        "However, your agent might not be able to switch between staking contracts "
        "until it has been staked for a minimum staking period in the current program.\n"
    )

    if attended and not ask_yes_or_no(
        "Please, ensure that your service is stopped (./stop_service.sh) before proceeding. "
        "Do you want to continue?"
    ):
        print("Cancelled.")
        return

    ask_password_if_needed(operate, config)
    manager = operate.service_manager()
    service = get_service(manager, template)
    ensure_enough_funds(operate, service)

    # Check if service can be unstaked from current program
    sftxb = manager.get_eth_safe_tx_builder(ledger_config=service.chain_configs[config.principal_chain].ledger_config)
    can_unstake = sftxb.can_unstake(
        service_id=service.chain_configs[config.principal_chain].chain_data.token,
        staking_contract=STAKING[getattr(Chain, config.principal_chain.upper())][current_program]    
    )

    if not can_unstake:
        print_section("Cannot Reset Staking Preference")
        print(
            "Your service cannot be unstaked at this time. This could be due to:\n"
            "- Minimum staking period not elapsed\n"
            "- Available rewards pending\n\n"
            "Please try again once the staking conditions allow unstaking."
        )
        return

    if attended and not ask_yes_or_no("Service can be unstaked. Would you like to proceed with unstaking and reset?"):
        print("Cancelled.")
        return

    # Unstake the service
    manager.unstake_service_on_chain_from_safe(
        service_config_id=service.service_config_id,
        chain=config.principal_chain,
        staking_program_id=current_program,
    )
    print_section("Service has been unstaked successfully")

    # Update local config and service template
    config.staking_vars = None
    config.store()
    config = configure_local_config(template)
    manager.update(
        service_config_id=manager.json[0]["service_config_id"],
        service_template=template,
    )
    print("\nStaking preference has been reset successfully.")
