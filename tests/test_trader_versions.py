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
"""This module contains tests."""

from pathlib import Path

import requests
import yaml

BASE_URL = "https://raw.githubusercontent.com/valory-xyz/trader/{}/packages/packages.json"
TARGET_SERVICE = "service/valory/trader_pearl/0.1.0"
TRADER_YAML = Path("templates/trader.yaml")


def test_trader_version_match() -> None:
    """Check that the trader versions match the package.json"""
    with TRADER_YAML.open("r", encoding="utf-8") as stream:
        trader_template = yaml.safe_load(stream)

    assert (
        "configuration" in trader_template and "hash" in trader_template,
        "Trader template does not contain configuration key!",
    )

    tag = trader_template["configuration"]["trader_version"]
    expected_hash = trader_template["hash"]

    response_body = requests.get(BASE_URL.format(tag)).json()
    actual_hash = response_body["dev"][TARGET_SERVICE]

    assert actual_hash == expected_hash, "Trader versions do not match!"
