/**
 * This script is used to build the electron app **with notarization**. It is used for the final build and release process.
 */
require('dotenv').config();
const build = require('electron-builder').build;

const { publishOptions } = require('./electron/constants');


function artifactName() {
  const env = process.env.NODE_ENV;
  const prefix = env === 'production' ? '' : 'dev-';
  return prefix + '${productName}-${version}-${platform}-${arch}.${ext}';
}

const main = async () => {
  console.log('Building...');

  /** @type import {CliOptions} from "electron-builder" */
  await build({
    publish: 'onTag',
    config: {
      appId: 'xyz.valory.olas-operate-app',
      artifactName: artifactName(),
      productName: 'Pearl',
      files: ['electron/**/*', 'package.json'],
      directories: {
        output: 'dist',
      },
      nsis: {
        oneClick: false,
      },
      win: {
        publish: publishOptions,
        icon: 'electron/assets/icons/splash-robot-head-dock.png',
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
