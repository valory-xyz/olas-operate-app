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

cd "$(dirname "$0")"

BIN_DIR="electron/bins/"
ARCH=$(uname -m)

mkdir -p $BIN_DIR

poetry install

# Tendermint (собираем, но не копируем - используется отдельно)
poetry run pyinstaller operate/tendermint.py --onedir --name tendermint_${ARCH}

# Pearl - собираем во временную папку dist/
poetry run pyinstaller \
    --collect-data eth_account \
    --collect-all aea \
    --collect-all autonomy \
    --collect-all operate \
    --collect-all aea_ledger_ethereum \
    --collect-all aea_ledger_cosmos \
    --collect-all aea_ledger_ethereum_flashbots \
    --hidden-import aea_ledger_ethereum \
    --hidden-import aea_ledger_cosmos \
    --hidden-import aea_ledger_ethereum_flashbots \
    operate/pearl.py \
    --add-binary ${BIN_DIR}/aea_bin_x64:. \
    --add-binary ${BIN_DIR}/aea_bin_arm64:. \
    --onedir \
    --name pearl_${ARCH}

# Копируем результат в middleware
rm -rf ${BIN_DIR}/middleware
cp -r dist/pearl_${ARCH} ${BIN_DIR}/middleware

echo "Build complete. Middleware is in ${BIN_DIR}/middleware/"
