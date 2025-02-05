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
"""Claim staking rewards."""

import json
import logging
import os
import sys
import warnings
from typing import TYPE_CHECKING

from operate.constants import OPERATE_HOME, SAFE_WEBAPP_URL
from operate.operate_types import LedgerType
from operate.quickstart.run_service import (
    ask_password_if_needed,
    configure_local_config,
    get_service,
    load_local_config,
)
from operate.utils.common import print_section, print_title


if TYPE_CHECKING:
    from operate.cli import OperateApp

warnings.filterwarnings("ignore", category=UserWarning)


def claim_staking_rewards(operate: "OperateApp", config_path: str) -> None:
    """Claim staking rewards."""

    with open(config_path, "r") as config_file:
        template = json.load(config_file)

    print_section(f"Claim staking rewards for {template['name']}")

    # check if agent was started before
    path = OPERATE_HOME / "local_config.json"
    if not path.exists():
        print("No previous agent setup found. Exiting.")
        return

    print(
        "This script will claim the OLAS staking rewards "
        "accrued in the current staking contract and transfer them to your service safe."
    )
    _continue = input("Do you want to continue (yes/no)? ").strip().lower()

    if _continue not in ("y", "yes"):
        sys.exit(0)

    print("")

    config = configure_local_config(template)
    manager = operate.service_manager()
    service = get_service(manager, template)
    ask_password_if_needed(operate, config)

    # reload manger and config after setting operate.password
    manager = operate.service_manager()
    config = load_local_config()
    os.environ["CUSTOM_CHAIN_RPC"] = config.rpc[config.principal_chain]
    try:
        tx_hash = manager.claim_on_chain_from_safe(
            service_config_id=service.service_config_id,
            chain=config.principal_chain,
        )
    except RuntimeError as e:
        print(
            "The transaction was reverted. "
            "This may be caused because your service does not have rewards to claim.\n"
        )
        logging.error(e)
        return

    wallet = operate.wallet_manager.load(ledger_type=LedgerType.ETHEREUM)
    service_safe_address = service.chain_configs[
        config.principal_chain
    ].chain_data.multisig
    print_title(f"Claim transaction done. Hash: {tx_hash}")
    print(f"Claimed staking transferred to your service Safe {service_safe_address}.\n")
    print(
        f"You can use your Master EOA (address {wallet.crypto.address}) to connect your Safe at"
        f"{SAFE_WEBAPP_URL}{service_safe_address}"
    )
