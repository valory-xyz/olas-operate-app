// @ts-check
/**
 * This script is used to build the electron app **with notarization**. It is used for the final build and release process.
 */
require('dotenv').config();
const build = require('electron-builder').build;

const { githubPublishOptions } = require('./electron/constants/config');


function artifactName() {
  const env = process.env.NODE_ENV;
  const prefix = env === 'production' ? '' : 'dev-';
  return prefix + '${productName}-${version}-${platform}-${arch}.${ext}';
}

const main = async () => {
  console.log('Building...');

  /** @type {import('electron-builder').CliOptions} */
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
      detectUpdateChannel: false,
      nsis: {
        oneClick: false,
      },
      win: {
        publish: githubPublishOptions,
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

main().then((response) => { console.log('Build & Notarize complete'); }).catch((e) => console.error(e));
