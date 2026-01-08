<h1 align="center">
<b>Pearl</b>
</h1>

A cross-platform desktop application used to run autonomous agents powered by the OLAS Network.

## Getting Started

### For Users

#### Downloading the latest release

**Note:** The release pages also contain Source Code `.zip` files. These are not intended for general use. Ignore them unless you're a developer!

- Go to the [Releases](https://github.com/valory-xyz/olas-operate-app/releases) page.
- Download the latest release for your operating system.
  - If you're on Windows, download the `.exe` file.
  - If you're on MacOS, download the `.dmg` file.
    - Both Intel x64 and Apple Silicon ARM64 builds are available.
- Install the application by running the downloaded file.

### For Developers

#### Setting up your development environment

- [Ubuntu Setup Guide](docs/dev/ubuntu-setup.md)
- [MacOS Setup Guide](docs/dev/macos-setup.md)
- [Windows Setup Guide](docs/dev/windows-setup.md)

#### Setting up a development RPC endpoint

- [RPC Setup Guide](docs/dev/rpcs.md)

#### Customizing the service hash

If you want to use a specific service hash, for testing purposes, follow these steps:

1. `./frontend/constants/serviceTemplates.ts`: Ensure that the hash you want to use is correctly referenced in the appropriate service template `hash`.
2. `./frontend/constants/serviceTemplates.ts`: Ensure the service template has corresponding to the hash you update service_version and agent_release.repository.version (you can run `scripts/js/check_service_templates.ts` to check it)
3. `./frontend/config/agents.ts`: Ensure that the corresponding service has `isAgentEnabled: true`.

## Project Dependencies

There are three parts to the project: the Electron app (CommonJS), the NextJS frontend (TypeScript), and the Python backend/middleware.

- [Electron dependencies](package.json)
- [Frontend dependencies](frontend/package.json)
- [Backend dependencies](pyproject.toml)

## License

- [Apache 2.0](LICENSE)

## Security

- [Security Policy](SECURITY.md)
