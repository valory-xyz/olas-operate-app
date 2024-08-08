
define setup_env
    $(eval ENV_FILE := $(1).env)
    @echo " - setup env $(ENV_FILE)"
    $(eval include $(1).env)
    $(eval export)
endef


./trader/:
	pwd
	git clone https://github.com/valory-xyz/trader.git

./dist/aea_win.exe: ./trader/
	mkdir -p dist
	cd trader && poetry install && poetry run pyinstaller --collect-data eth_account --collect-all aea --collect-all autonomy --collect-all operate --collect-all aea_ledger_ethereum --collect-all aea_ledger_cosmos --collect-all aea_ledger_ethereum_flashbots --hidden-import aea_ledger_ethereum --hidden-import aea_ledger_cosmos --hidden-import aea_ledger_ethereum_flashbots --hidden-import grpc --hidden-import openapi_core --collect-all google.protobuf --collect-all openapi_core --collect-all openapi_spec_validator --collect-all asn1crypto --hidden-import py_ecc --hidden-import pytz --onefile pyinstaller/trader_bin.py --name trader_win
	cp -f trader/dist/trader_win.exe ./dist/aea_win.exe
	pwd


./dist/tendermint_win.exe: ./operate
	pwd
	poetry install && poetry run pyinstaller operate/services/utils/tendermint.py --onefile --name tendermint_win


./dist/pearl_win.exe: ./dist/aea_win.exe ./dist/tendermint_win.exe
	pwd
	poetry install && poetry run pyinstaller --collect-data eth_account --collect-all aea --collect-all coincurve --collect-all autonomy --collect-all operate --collect-all aea_ledger_ethereum --collect-all aea_ledger_cosmos --collect-all aea_ledger_ethereum_flashbots --hidden-import aea_ledger_ethereum --hidden-import aea_ledger_cosmos --hidden-import aea_ledger_ethereum_flashbots operate/pearl.py --add-binary dist/aea_win.exe:.  --add-binary dist/tendermint_win.exe:. --onefile --name pearl_win


.PHONY: build
build: ./dist/pearl_win.exe
	$(call setup_env, prod)
	echo ${DEV_RPC}
	mkdir -p ./electron/bins
	cp -f dist/pearl_win.exe ./electron/bins/pearl_win.exe
	echo ${NODE_ENV}
	NODE_ENV=${NODE_ENV} DEV_RPC=${DEV_RPC} FORK_URL=${FORK_URL} yarn build:frontend
	node build-win.js


.PHONY: build-tenderly
build-tenderly:  ./dist/pearl_win.exe
	$(call setup_env, dev-tenderly)
	echo ${DEV_RPC}
	cp -f dist/pearl_win.exe ./electron/bins/pearl_win.exe
	echo ${NODE_ENV}
	NODE_ENV=${NODE_ENV} DEV_RPC=${DEV_RPC} FORK_URL=${FORK_URL} yarn build:frontend
	node build-win-tenderly.js