const http = require('http');
const https = require('https');
const { logger } = require('./logger');
const fs = require('fs');
const path = require('path');
const { paths } = require('./constants');
const { session } = require('electron');
const tls = require('tls');
const { Agent, request } = require('undici');

const stringifyJson = (e) =>
  JSON.stringify(e, Object.getOwnPropertyNames(e), 2);

/**
 * Load the self-signed certificate for localhost HTTPS requests
 */
const loadLocalCertificate = () => {
  try {
    const certPath = path.join(paths.dotOperateDirectory, 'ssl', 'cert.pem');
    if (fs.existsSync(certPath)) {
      const cert = fs.readFileSync(certPath);

      // Add the certificate to Node.js's trusted CA store at runtime
      const originalCreateSecureContext = tls.createSecureContext;
      tls.createSecureContext = (options = {}) => {
        const context = originalCreateSecureContext(options);
        context.context.addCACert(cert);
        return context;
      };

      logger.electron('TLS patched to trust local certificate');
    }
  } catch (error) {
    logger.electron(
      `Failed to read local certificate: ${stringifyJson(error)}`,
    );
  }
};

/**
 * Checks if a URL is reachable.
 */
const checkUrl = (url) => {
  return new Promise((resolve) => {
    logger.electron(`Checking URL in agent window: ${url}`);

    // Choose the correct module based on the protocol
    const client = url.startsWith('https') ? https : http;

    const request = client.request(url, { method: 'HEAD' }, (response) => {
      resolve(response.statusCode >= 200 && response.statusCode < 300);
    });

    request.on('error', () => resolve(false));
    request.end();
  });
};

/**
 * Configure session to handle self-signed certificates for localhost
 * This is the Electron equivalent of setting { ca: localCert } in Node.js HTTPS agent
 * @link docs: https://www.electronjs.org/docs/latest/api/session#sessetcertificateverifyprocproc
 */
const configureSessionCertificates = () => {
  const defaultSession = session.defaultSession;

  // Configure certificate verification - this is the Electron equivalent of the CA approach
  defaultSession.setCertificateVerifyProc((request, callback) => {
    const { hostname } = request;

    if (hostname === 'localhost') {
      // For localhost, trust the certificate (equivalent to having it as a trusted CA)
      // We know we control this endpoint and have generated the certificate
      callback(0);
      return;
    }

    // For all other hostnames, use Chromium's default certificate validation
    callback(-3);
  });
};

const secureFetch = async (url, options = {}) => {
  const certPath = path.join(paths.dotOperateDirectory, 'ssl', 'cert.pem');
  if (!fs.existsSync(certPath)) {
    throw new Error('SSL certificate not found');
  }

  const cert = fs.readFileSync(certPath, 'utf-8');
  const agent = new Agent({
    connect: {
      ca: cert,
      rejectUnauthorized: false, // TODO: To figure out how to handle this properly
    },
  });

  const { body } = await request(url, {
    method: options.method || 'GET',
    dispatcher: agent,
    ...options,
  });

  return body;
};

module.exports = {
  checkUrl,
  configureSessionCertificates,
  loadLocalCertificate,
  stringifyJson,
  secureFetch,
};
