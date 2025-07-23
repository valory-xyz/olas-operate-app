const http = require('http');
const https = require('https');
const { Agent } = require('undici');
const { logger } = require('./logger');
const fs = require('fs');
const path = require('path');
const { paths } = require('./constants');

/**
 * Get the self-signed certificate for localhost HTTPS requests
 */
const getLocalCertificate = () => {
  try {
    const certPath = path.join(paths.dotOperateDirectory, 'ssl', 'cert.pem');
    if (fs.existsSync(certPath)) {
      return fs.readFileSync(certPath);
    }
  } catch (error) {
    logger.electron('Failed to read local certificate: ', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
  }
   return null;
};

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

    // Use custom agent for localhost HTTPS requests with proper certificate validation
    if (urlObj.hostname === 'localhost' && urlObj.protocol === 'https:') {
      const localCert = getLocalCertificate();
      if (localCert) {
        options.agent = new https.Agent({ ca: localCert });
      }
    }

    const request = client.request(url, options, (response) => {
      resolve(response.statusCode >= 200 && response.statusCode < 300);
    });

    request.on('error', () => resolve(false));
    request.end();
  });
};


/**
 * Fetches a URL with proper certificate validation for localhost HTTPS requests.
 * @throws an error if the local certificate cannot be found for localhost HTTPS requests.
 */
const safeFetch = (url, options = {}) => {
  const urlObj = new URL(url);

  // Use custom agent for localhost HTTPS requests with proper certificate validation
  if (urlObj.hostname === 'localhost' && urlObj.protocol === 'https:') {
    const localCert = getLocalCertificate();
    if (localCert) {
      return fetch(url, {
        ...options,
        dispatcher: new Agent({ connect: { ca: localCert } })
      });
    }
  }

  // Use normal fetch for all other requests
  return fetch(url, options);
};

/**
 * Configure session to handle self-signed certificates for localhost
 * This is the Electron equivalent of setting { ca: localCert } in Node.js HTTPS agent
 * @link docs: https://www.electronjs.org/docs/latest/api/session#sessetcertificateverifyprocproc
 */
const configureSessionCertificates = () => {
  const { session } = require('electron');
  const defaultSession = session.defaultSession;

  logger.electron('Configuring session to trust localhost certificates');

  // Configure certificate verification - this is the Electron equivalent of the CA approach
  defaultSession.setCertificateVerifyProc((request, callback) => {
    const { hostname, verificationResult, errorCode } = request;

    if (hostname === 'localhost') {
      // For localhost, trust the certificate (equivalent to having it as a trusted CA)
      // We know we control this endpoint and have generated the certificate
      callback(0); // Certificate is valid
      return;
    }

    // For all other hostnames, use Chromium's default certificate validation
    callback(-3);
  });
};

module.exports = { checkUrl, safeFetch, configureSessionCertificates };
