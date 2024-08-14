#!/bin/bash

BIN_DIR="electron/bins/"
mkdir -p $BIN_DIR

trader_version=$(poetry run python -c "import yaml; config = yaml.safe_load(open('templates/trader.yaml')); print(config['configuration']['trader_version'])")

curl -L -o "${BIN_DIR}aea_bin_x64" "https://github.com/valory-xyz/trader/releases/download/${trader_version}/trader_bin_x64"

curl -L -o "${BIN_DIR}aea_bin_arm64" "https://github.com/valory-xyz/trader/releases/download/${trader_version}/trader_bin_arm64"
