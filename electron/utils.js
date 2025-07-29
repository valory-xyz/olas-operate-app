const http = require('http');
const https = require('https');
const { logger } = require('./logger');
const fs = require('fs');
const path = require('path');
const { paths } = require('./constants');
const { session } = require('electron');
const tls = require('tls');
// import { Agent, request } from 'undici';
const { Agent, request } = require('undici');

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

      console.log('✅ TLS patched');
    }
  } catch (error) {
    logger.electron(
      'Failed to read local certificate: ',
      JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
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

  logger.electron(
    '++++++++++++ Configuring session to trust localhost certificates ++++++++++++',
  );

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

const stringifyError = (e) =>
  JSON.stringify(e, Object.getOwnPropertyNames(e), 2);

// const tryFetching = (port) => {
//   return new Promise((resolve, reject) => {
//     console.log(`Trying to fetch from https://localhost:${port}/api`);
//     const certPath = path.join(paths.dotOperateDirectory, 'ssl', 'cert.pem');
//     const cert = fs.readFileSync(certPath);
//     const agent = new https.Agent({ ca: cert });

//     fetch(`https://localhost:${port}/api`, { agent })
//       .then((res) => res.text())
//       .then((responseText) => {
//         console.log(`Response from port ${port}: ${responseText}`);
//         resolve(responseText);
//       })
//       .catch((e) => {
//         console.error(`Error fetching from port ${port}: ${stringifyError(e)}`);
//         reject(e);
//       })
//       .finally(() => {
//         console.log(
//           `!!!!!!!!!!!!! Fetch attempt completed for port ${port}>>>>>>>>>>>>>>>>>>>>`,
//         );
//       });
//   });
// };

const tryFetching = async (port) => {
  // Print the fetch attempt in cyan color for visibility
  console.log(
    `\x1b[36mTrying to fetch from https://localhost:${port}/api\x1b[0m`,
  );

  const certPath = path.join(paths.dotOperateDirectory, 'ssl', 'cert.pem');
  const cert = fs.readFileSync(certPath, 'utf-8');

  const agent = new Agent({
    connect: {
      ca: cert, // Trust the self-signed cert
      rejectUnauthorized: false, // ✅ Validate cert — but trust our CA
    },
  });

  try {
    const { body } = await request(`http://localhost:${port}/api`, {
      method: 'GET',
      dispatcher: agent,
    });

    const responseText = await body.text();
    console.log(`\x1b[32mResponse from port ${port}: ${responseText}\x1b[0m`);
    return responseText;
  } catch (e) {
    console.error(
      `\x1b[31mError fetching from port ${port}: ${stringifyError(e)}\x1b[0m`,
    );
    throw e;
  } finally {
    console.log(
      `\x1b[32m!!!!!!!!!!!!! Fetch attempt completed for port ${port} >>>>>>>>>\x1b[0m`,
    );
  }
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
      rejectUnauthorized: false,
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
  tryFetching,
  stringifyError,
  secureFetch,
};
