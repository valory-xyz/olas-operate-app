const http = require('http');
const https = require('https');
const { logger } = require('./logger');

const checkUrl = (url) => {
  return new Promise((resolve) => {
    logger.electron(`Checking URL in agent window: ${url}`);

    // Choose the correct module based on the protocol
    const client = url.startsWith('https') ? https : http;

    const request = client.request(url, { method: 'HEAD' }, (response) => {
      resolve(response.statusCode >= 200 && response.statusCode < 300);
    });

    request.on('error', () => resolve(false)); // Resolve as false if request fails
    request.end();
  });
};

module.exports = { checkUrl };
