# Execute this script in a poetry environment (poetry shell, poetry install)
# cp next.config.mjs frontend/next.config.mjs

# Services.ts
source .env
export DEV_RPC=$GNOSIS_RPC
export NODE_ENV=development
cd frontend
yarn install
cd ..


yarn install
yarn start