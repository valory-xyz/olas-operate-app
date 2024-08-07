#!/bin/bash

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

BIN_DIR="electron/bins/"
mkdir -p $BIN_DIR

trader_version=$(poetry run python -c "import yaml; config = yaml.safe_load(open('templates/trader.yaml')); print(config['configuration']['trader_version'])")

curl -L -o "${BIN_DIR}aea_bin_x64" "https://github.com/valory-xyz/trader/releases/download/${trader_version}/trader_bin_x64"

curl -L -o "${BIN_DIR}aea_bin_arm64" "https://github.com/valory-xyz/trader/releases/download/${trader_version}/trader_bin_arm64"
