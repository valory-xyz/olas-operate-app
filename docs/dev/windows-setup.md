# Setting up Pearl for development on Windows

- Development on Windows is experimental, but included here for reference.
- Please report any issues you encounter while setting up the project on Windows.
- You must be able to run PowerShell as an administrator to install the system dependencies.

### Installing system dependencies

## 1. Chocolatey

Chocolatey is a package manager for Windows, allowing you to install packages from the command line.

```powershell
# run as administrator
# https://chocolatey.org/install

Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

## 2. Node Version Manager (NVM)

NVM is a version manager for Node.js, allowing you to switch between different versions of Node.js.

```powershell
# run as administrator
choco install nvm
```

## 3. Node.js v20

```powershell
# run as administrator
nvm install 20
nvm use 20
```

## 4. Yarn

Yarn is the package manager used for dependency management of the Electron app and NextJS frontend.

```powershell
npm install --global yarn
```

## 5. Python 3.10

```powershell
# run as administrator
choco install python3.10
```

## 6. Pipx

```powershell
# run as administrator
python3.10 -m pip install pipx
```

## 7. Poetry

```powershell
# run as administrator
pipx install poetry==1.8.5
```

If prompted to add `poetry` to your PATH, follow the prompt.

### Installing project dependencies

The `install-deps` script will install the dependencies for all parts of the project.
The Electron app, the NextJS frontend, and the Python backend.

```powershell
# run from the project root
poetry shell
yarn install-deps
```

### Setup the .env file

Duplicate the `.env.example` file and rename it to `.env`.

```powershell
# run from the project root
cp .env.example .env
```

Then fill in the required environment variables.

- `NODE_ENV` - Set to `development` for development. `production` is only used for production builds built through the release script.
- RPC endpoints are now per-chain. Provide HTTPS RPC URLs for the chains you plan to use:
  - `GNOSIS_RPC`
  - `BASE_RPC`
  - `OPTIMISM_RPC`
  - `ETHEREUM_RPC`
  - `MODE_RPC`
  - `POLYGON_RPC`
  - `CELO_RPC`

Example `.env` snippet:

```env
# Set only the chains you need; leave others unset or blank
GNOSIS_RPC=https://...
BASE_RPC=https://...
OPTIMISM_RPC=https://...
ETHEREUM_RPC=https://...
MODE_RPC=https://...
POLYGON_RPC=https://...
CELO_RPC=https://...
```

### Run the project

```powershell
yarn dev
```
