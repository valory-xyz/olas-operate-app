#!/usr/bin/env python3
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


from decimal import Decimal, ROUND_UP
from typing import Optional

import requests
from halo import Halo

from operate.constants import ZERO_ADDRESS
from operate.ledger.profiles import OLAS, USDC
from operate.operate_types import Chain


def print_box(text: str, margin: int = 1, character: str = "=") -> None:
    """Print text centered within a box."""

    lines = text.split("\n")
    text_length = max(len(line) for line in lines)
    length = text_length + 2 * margin

    border = character * length
    margin_str = " " * margin

    print()
    print(border)
    print(f"{margin_str}{text}{margin_str}")
    print(border)
    print()


def print_title(text: str) -> None:
    """Print title."""
    print_box(text, 4, "=")


def print_section(text: str) -> None:
    """Print section."""
    print_box(text, 1, "-")


def unit_to_wei(unit: float) -> int:
    """Convert unit to Wei."""
    return int(unit * 1e18)


CHAIN_TO_METADATA = {
    "gnosis": {
        "name": "Gnosis",
        "gasFundReq": unit_to_wei(0.5),  # fund for master wallet
        "staking_bonding_token": OLAS[Chain.GNOSIS],
        "token_data": {
            ZERO_ADDRESS: {
                "symbol": "xDAI",
                "decimals": 18,
            },
            USDC[Chain.GNOSIS]: {
                "symbol": "USDC",
                "decimals": 6,
            },
            OLAS[Chain.GNOSIS]: {
                "symbol": "OLAS",
                "decimals": 18,
            },
        },
        "gasParams": {
            # this means default values will be used
            "MAX_PRIORITY_FEE_PER_GAS": "",
            "MAX_FEE_PER_GAS": "",
        },
    },
    "mode": {
        "name": "Mode",
        "gasFundReq": unit_to_wei(0.005),  # fund for master wallet
        "staking_bonding_token": OLAS[Chain.MODE],
        "token_data": {
            ZERO_ADDRESS: {
                "symbol": "ETH",
                "decimals": 18,
            },
            USDC[Chain.MODE]: {
                "symbol": "USDC",
                "decimals": 6,
            },
            OLAS[Chain.MODE]: {
                "symbol": "OLAS",
                "decimals": 18,
            },
        },
        "gasParams": {
            # this means default values will be used
            "MAX_PRIORITY_FEE_PER_GAS": "",
            "MAX_FEE_PER_GAS": "",
        },
    },
    "optimistic": {
        "name": "Optimism",
        "gasFundReq": unit_to_wei(0.005),  # fund for master wallet
        "staking_bonding_token": OLAS[Chain.OPTIMISTIC],
        "token_data": {
            ZERO_ADDRESS: {
                "symbol": "ETH",
                "decimals": 18,
            },
            USDC[Chain.OPTIMISTIC]: {
                "symbol": "USDC",
                "decimals": 6,
            },
            OLAS[Chain.OPTIMISTIC]: {
                "symbol": "OLAS",
                "decimals": 18,
            },
        },
        "gasParams": {
            # this means default values will be used
            "MAX_PRIORITY_FEE_PER_GAS": "",
            "MAX_FEE_PER_GAS": "",
        },
    },
    "base": {
        "name": "Base",
        "gasFundReq": unit_to_wei(0.005),  # fund for master wallet
        "staking_bonding_token": OLAS[Chain.BASE],
        "token_data": {
            ZERO_ADDRESS: {
                "symbol": "ETH",
                "decimals": 18,
            },
            USDC[Chain.BASE]: {
                "symbol": "USDC",
                "decimals": 6,
            },
            OLAS[Chain.BASE]: {
                "symbol": "OLAS",
                "decimals": 18,
            },
        },
        "gasParams": {
            # this means default values will be used
            "MAX_PRIORITY_FEE_PER_GAS": "",
            "MAX_FEE_PER_GAS": "",
        },
    },
}


def wei_to_unit(wei: int, chain: str, token_address: str = ZERO_ADDRESS) -> float:
    """Convert Wei to unit."""
    unit: Decimal = (
        Decimal(str(wei))
        / 10 ** CHAIN_TO_METADATA[chain]["token_data"][token_address]["decimals"]
    )
    return unit.quantize(Decimal("0.000001"), rounding=ROUND_UP)


def wei_to_token(wei: int, chain: str, token_address: str = ZERO_ADDRESS) -> str:
    """Convert Wei to token."""
    return f"{wei_to_unit(wei, chain, token_address)} {CHAIN_TO_METADATA[chain]['token_data'][token_address]['symbol']}"


def ask_yes_or_no(question: str) -> bool:
    """Ask a yes/no question."""
    response = input(f"{question} (yes/no): ").strip().lower()
    return response in ["yes", "y"]


def check_rpc(rpc_url: Optional[str] = None) -> True:
    if rpc_url is None:
        return False

    spinner = Halo(text=f"Checking RPC...", spinner="dots")
    spinner.start()

    rpc_data = {
        "jsonrpc": "2.0",
        "method": "eth_newFilter",
        "params": ["invalid"],
        "id": 1,
    }

    try:
        response = requests.post(
            rpc_url, json=rpc_data, headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        rpc_response = response.json()
    except Exception as e:
        spinner.fail(f"Error: Failed to send RPC request: {e}")
        return False

    rpc_error_message = (
        rpc_response.get("error", {})
        .get("message", "exception processing rpc response")
        .lower()
    )

    if rpc_error_message == "exception processing rpc response":
        print(
            "Error: The received rpc response is malformed. Please verify the RPC address and/or rpc behavior."
        )
        print("  Received response:")
        print("  ", rpc_response)
        print("")
        spinner.fail("Terminating script.")
        return False
    elif rpc_error_message == "out of requests":
        print("Error: The provided rpc is out of requests.")
        spinner.fail("Terminating script.")
        return False
    elif (
        rpc_error_message == "the method eth_newfilter does not exist/is not available"
    ):
        print("Error: The provided RPC does not support 'eth_newFilter'.")
        spinner.fail("Terminating script.")
        return False
    elif rpc_error_message == "invalid params":
        spinner.succeed("RPC checks passed.")
        return True

    print("Error: Unknown rpc error.")
    print("  Received response:")
    print("  ", rpc_response)
    print("")
    spinner.fail("Terminating script.")
    return False
