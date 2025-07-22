const http = require('http');
const https = require('https');
const { Agent } = require('undici');
const { logger } = require('./logger');

/**
 * Checks if a URL is reachable.
 */
const checkUrl = (url) => {
  return new Promise((resolve) => {
    logger.electron(`Checking URL in agent window: ${url}`);

    // Choose the correct module based on the protocol
    const client = url.startsWith('https') ? https : http;

    const urlObj = new URL(url);
    const options = { method: 'HEAD' };

    // Use custom agent for localhost HTTPS requests only
    if (urlObj.hostname === 'localhost' && urlObj.protocol === 'https:') {
      options.agent = new https.Agent({
        rejectUnauthorized: false,
      });
    }

    const request = client.request(url, options, (response) => {
      resolve(response.statusCode >= 200 && response.statusCode < 300);
    });

    request.on('error', () => resolve(false));
    request.end();
  });
};


/**
 * Fetches a URL with custom handling for localhost HTTPS requests.
 * This function uses the undici library's Agent for Node.js fetch.
 */
const safeFetch = (url, options = {}) => {
  const urlObj = new URL(url);

  // Use custom agent for localhost HTTPS requests only
  if (urlObj.hostname === 'localhost' && urlObj.protocol === 'https:') {
    return fetch(url, {
      ...options,
      // For Node.js fetch, we need to use dispatcher instead of agent
      dispatcher: new Agent({
        connect: {
          rejectUnauthorized: false
        }
      })
    });
  }

  // Use normal fetch for all other requests
  return fetch(url, options);
};

module.exports = { checkUrl, safeFetch };
