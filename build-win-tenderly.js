/**
 * This script is used to build the electron app **with notarization**. It is used for the final build and release process.
 */
require('dotenv').config();
const build = require('electron-builder').build;

const { publishOptions } = require('./electron/constants');

const main = async () => {
  console.log('Building...');

  /** @type import {CliOptions} from "electron-builder" */
  await build({
    publish: 'onTag',
    config: {
      appId: 'xyz.valory.olas-pearl-optimus',
      artifactName: '${productName}-${version}-${platform}-${arch}-tenderly.${ext}',
      productName: 'Pearl (Optimus)',
      files: ['electron/**/*', 'package.json'],
      directories: {
        output: 'dist',
      },
      nsis: {
        oneClick: false,
      },
      extraResources: [
        {
          from: 'electron/bins',
          to: 'bins',
          filter: ['**/*'],
        },
      ],
      
    },
  });
};

main().then(() => {
  console.log('Build & Notarize complete');
}).catch(() => {
  throw new Error('Failed to build and notarize.');
});