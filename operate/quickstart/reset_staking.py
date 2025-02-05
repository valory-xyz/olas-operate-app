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
from typing import TYPE_CHECKING

from operate.constants import OPERATE_HOME
from operate.quickstart.run_service import configure_local_config, get_service
from operate.utils.common import ask_yes_or_no, print_title


if TYPE_CHECKING:
    from operate.cli import OperateApp


def reset_staking(operate: "OperateApp", config_path: str) -> None:
    """Reset staking."""
    with open(config_path, "r") as config_file:
        template = json.load(config_file)

    print_title(f"Reset your staking program preference")

    # check if agent was started before
    path = OPERATE_HOME / "local_config.json"
    if not path.exists():
        print("No previous agent setup found. Exiting.")
        return

    config = configure_local_config(template)
    manager = operate.service_manager()

    print(
        f"Your current staking program preference is set to '{config.staking_vars['STAKING_PROGRAM']}'."
    )
    print(
        "You can reset your preference. "
        "However, your agent might not be able to switch between staking contracts "
        "until it has been staked for a minimum staking period in the current program."
    )
    if not ask_yes_or_no("Do you want to reset your staking program preference?"):
        print("Cancelled.")
        return

    config.staking_vars = None
    config.store()
    config = configure_local_config(template)
    manager.update(
        service_config_id=manager.json[0]["service_config_id"],
        service_template=template,
    )
