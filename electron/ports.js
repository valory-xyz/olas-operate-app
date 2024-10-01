const net = require('net');
const { ERROR_ADDRESS_IN_USE } = require('./constants');

function findAvailablePort({ startPort, endPort, excludePorts = [] }) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;

    const tryPort = (port) => {
      if (excludePorts.includes(port)) {
        if (currentPort < endPort) {
          tryPort(++currentPort);
        } else {
          reject(
            new Error(
              `Unable to find an available port between ${startPort} and ${endPort} excluding specified ports.`,
            ),
          );
        }
        return;
      }

      const server = net.createServer();

      server.listen(port, () => {
        server.close(() => {
          resolve(port);
        });
      });

      server.on('error', (err) => {
        if (err.code === ERROR_ADDRESS_IN_USE && currentPort < endPort) {
          // Try the next port if the current one is in use or excluded
          tryPort(++currentPort);
        } else {
          reject(
            new Error(
              `Unable to find an available port between ${startPort} and ${endPort} excluding specified ports.`,
            ),
          );
        }
      });
    };

    tryPort(currentPort);
  });
}

/**
 * Checks if a port is available.
 * @param {number} port - The port to check.
 * @returns {Promise<boolean>} Whether the port is available.
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.on('error', () => {
      resolve(false);
    });
  });
}

module.exports = {
  findAvailablePort,
  isPortAvailable,
};
