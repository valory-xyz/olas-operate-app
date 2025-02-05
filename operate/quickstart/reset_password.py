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
"""Reset password."""

from getpass import getpass
from typing import TYPE_CHECKING

from operate.account.user import UserAccount
from operate.operate_types import LedgerType
from operate.quickstart.run_service import ask_confirm_password
from operate.utils.common import print_section, print_title
from operate.wallet.master import EthereumMasterWallet


if TYPE_CHECKING:
    from operate.cli import OperateApp


def reset_password(operate: "OperateApp") -> None:
    """Reset password."""
    print_title("Reset your password")

    # check if agent was started before
    if not (operate._path / "user.json").exists():
        print("No previous agent setup found. Exiting.")
        return

    old_password = None
    while old_password is None:
        old_password = getpass("\nEnter local user account password [hidden input]: ")
        if operate.user_account.is_valid(password=old_password):
            break
        old_password = None
        print("Invalid password!")

    print_section("Update local user account")
    new_password = ask_confirm_password()
    print("Resetting password of user account...")
    UserAccount.new(
        password=old_password,
        path=operate._path / "user.json",
    ).update(
        old_password=old_password,
        new_password=new_password,
    )

    print('Resetting password of "ethereum" wallet...')
    operate.password = old_password
    operate.wallet_manager.password = old_password
    wallet: EthereumMasterWallet = operate.wallet_manager.load(
        ledger_type=LedgerType.ETHEREUM
    )
    wallet.update_password(password=new_password)

    print_section("Password reset done!")
