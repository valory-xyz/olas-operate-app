#!/bin/bash

BIN_DIR="electron/bins/"
mkdir -p $BIN_DIR

trader_version=$(poetry run python -c "import yaml; config = yaml.safe_load(open('templates/trader.yaml')); print(config['service_version'])")
optimus_version=$(poetry run python -c "import yaml; config = yaml.safe_load(open('templates/optimus.yaml')); print(config['service_version'])")


curl -L -o "${BIN_DIR}aea_bin_x64" "https://github.com/valory-xyz/optimus/releases/download/${optimus_version}/optimus_bin_x64"
curl -L -o "${BIN_DIR}aea_bin_arm64" "https://github.com/valory-xyz/optimus/releases/download/${optimus_version}/optimus_bin_arm64"
