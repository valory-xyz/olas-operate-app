# Setting up Pearl for development on MacOS

### System dependencies

## 1. Brew

Brew is a package manager for MacOS, allowing you to install packages from the command line.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## 2. Node Version Manager (NVM)

NVM is a version manager for Node.js, allowing you to switch between different versions of Node.js.

```bash
brew install nvm
```

Set up NVM for console usage. Dependant on the shell, you should edit the config file to contain the following code.

If you're using Bash or Zsh, you might add them to your `~/.bash_profile`, `~/.bashrc`, or `~/.zshrc` file:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
```

Close and reopen Terminal, or run `source ~/.bash_profile`, `source ~/.zshrc`, or `source ~/.bashrc` to reload the shell configuration.

## 3. Node.js

```bash
nvm install
nvm use
```

## 4. Yarn

Yarn is the package manager used for dependency management of the Electron app and NextJS frontend.

```bash
npm install --global yarn
```

## 5. Python

Use Python 3.10 for the project.

```bash
brew install python@3.10
```

## 6. Pipx

```bash
brew install pipx
```

## 7. Poetry

```bash
pipx install poetry==1.8.5
```

If prompted to add the `poetry` command to your shell's config file, accept the prompt.

### Installing project dependencies

The `install-deps` script will install the dependencies for all parts of the project.
The Electron app, the NextJS frontend, and the Python backend.

```bash
yarn install-deps
```

### Setup the .env file

Duplicate the `.env.example` file and rename it to `.env`.

```bash
cp .env.example .env
```

Then fill in the required environment variables.

- `NODE_ENV` - Set to `development` for development. `production` is only used for production builds built through the release script.
- RPC endpoints are per-chain. Provide HTTPS RPC URLs for the chains you plan to use:
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

```bash
yarn dev
```
