//@ts-check

/**
 * This script is used to build the electron app **with notarization**. It is used for the final build and release process.
 */
require('dotenv').config();
const build = require('electron-builder').build;

const main = async () => {
  console.log('Building...');

  /** @type {import('electron-builder').CliOptions}  */
  await build({
    publish: 'onTag',
    config: {
      appId: 'xyz.valory.olas-operate-app',
      artifactName: '${productName}-${version}-${platform}-${arch}-tenderly.${ext}',
      productName: 'Pearl',
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

main().then((response) => { console.log('Build & Notarize complete'); }).catch((e) => console.error(e));
