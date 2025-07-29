// // test-https.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const { paths } = require('./constants');

const certPath = path.join(paths.dotOperateDirectory, 'ssl', 'cert.pem');
const cert = fs.readFileSync(certPath, 'utf8');

// // Split certificate in case of multiple certificates
// const caCerts = cert
//   .split(/(?=-----BEGIN CERTIFICATE-----)/)
//   .filter((cert) => cert.includes('-----BEGIN CERTIFICATE-----'))
//   .map((cert) => cert.trim());

// console.log('Number of certificates:', caCerts.length);
// console.log('First certificate (100 chars):', caCerts[0].slice(0, 100));

// const options = {
//   hostname: 'localhost',
//   port: 8000,
//   path: '/api',
//   method: 'GET',
//   ca: caCerts,
//   rejectUnauthorized: true,
// };

// const req = https.request(options, (res) => {
//   console.log('Status:', res.statusCode);
//   let data = '';
//   res.on('data', (chunk) => (data += chunk));
//   res.on('end', () => console.log('Response:', data));
// });

// req.on('error', (e) =>
//   console.error('Error:', {
//     message: e.message,
//     code: e.code,
//     stack: e.stack,
//   }),
// );
// req.end();

// test-https-shutdown.js

// const certPath =
//   '/Users/mohandas/work/open-source-valory/olas-operate-app/.operate/ssl/cert.pem';
// const cert = fs.readFileSync(certPath, 'utf8');

const caCerts = cert
  .split(/(?=-----BEGIN CERTIFICATE-----)/)
  .filter((cert) => cert.includes('-----BEGIN CERTIFICATE-----'))
  .map((cert) => cert.trim());

console.log('Number of certificates:', caCerts.length);
console.log('First certificate (100 chars):', caCerts[0].slice(0, 100));

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/shutdown',
  method: 'GET',
  ca: caCerts,
  rejectUnauthorized: true,
  servername: 'localhost', // Added for SNI
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => console.log('Response:', data));
});

req.on('error', (e) =>
  console.error('Error:', {
    message: e.message,
    code: e.code,
    stack: e.stack,
  }),
);
req.end();
