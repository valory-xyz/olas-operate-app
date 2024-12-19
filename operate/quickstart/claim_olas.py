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
"""Claim OLAS rewards."""

import json
import logging
from typing import TYPE_CHECKING
import warnings

from operate.constants import OPERATE_HOME, SAFE_WEBAPP_URL
from operate.operate_types import LedgerType
from operate.quickstart.run_service import ask_password_if_needed, configure_local_config, get_service, load_local_config
from operate.utils.common import print_section, print_title

if TYPE_CHECKING:
    from operate.cli import OperateApp

warnings.filterwarnings("ignore", category=UserWarning)


def claim_olas(operate: "OperateApp", config_path: str) -> None:
    """Claim OLAS rewards."""

    with open(config_path, "r") as config_file:
        template = json.load(config_file)

    print_section(f"Claim OLAS rewards for {template['name']}")

    # check if agent was started before
    path = OPERATE_HOME / "local_config.json"
    if not path.exists():
        print("No previous agent setup found. Exiting.")
        return

    config = configure_local_config(template)
    manager = operate.service_manager()
    service = get_service(manager, template)
    ask_password_if_needed(operate, config)

    # reload manger and config after setting operate.password
    manager = operate.service_manager()
    config = load_local_config()
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
    service_safe_address = service.chain_configs[config.principal_chain].chain_data.multisig
    print_title(f"Claim transaction done. Hash: {tx_hash}")
    print(f"Claimed OLAS transferred to your service Safe {service_safe_address}.\n")
    print(
        f"You can use your Master EOA (address {wallet.crypto.address}) to connect your Safe at"
        f"{SAFE_WEBAPP_URL}{service_safe_address}"
    )
