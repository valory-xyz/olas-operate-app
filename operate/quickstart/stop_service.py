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
"""Quickstop script."""

import json
from typing import TYPE_CHECKING
import warnings
import sys

from operate.constants import OPERATE_HOME
from operate.quickstart.run_service import configure_local_config, get_service
from operate.utils.common import print_section, print_title

if TYPE_CHECKING:
    from operate.cli import OperateApp

warnings.filterwarnings("ignore", category=UserWarning)


def stop_service(operate: "OperateApp", config_path: str) -> None:
    """Stop service."""

    with open(config_path, "r") as config_file:
        template = json.load(config_file)

    print_title(f"Stop {template['name']} Quickstart")

    # check if agent was started before
    path = OPERATE_HOME / "local_config.json"
    if not path.exists():
        print("No previous agent setup found. Exiting.")
        return

    configure_local_config(template)
    manager = operate.service_manager()
    service = get_service(manager, template)
    manager.stop_service_locally(service_config_id=service.service_config_id, delete=True, use_docker=True)

    print()
    print_section(f"{template['name']} service stopped")
