/**
 * This script is used to build the electron app **with notarization**. It is used for the final build and release process.
 */
require('dotenv').config();
const build = require('electron-builder').build;

const { publishOptions } = require('./electron/constants');

/**
 * Get the artifact name for the build based on the environment.
 * @returns {string}
 */
function artifactName() {
  const env = process.env.NODE_ENV;
  const prefix = env === 'production' ? '' : 'dev-';
  return prefix + '${productName}-${version}-${platform}-${arch}.${ext}';
}

const main = async () => {
  console.log('Building...');

  /** @type import {CliOptions} from "electron-builder" */
  return await build({
    publish: 'onTag',
    config: {
      appId: 'xyz.valory.olas-operate-app',
      artifactName: artifactName(),
      productName: 'Pearl',
      files: ['electron/**/*', 'package.json'],
      directories: {
        output: 'dist',
      },
      extraResources: [
        {
          from: 'electron/bins',
          to: 'bins',
          filter: ['**/*'],
        },
        {
          from: '.env',
          to: '.env'
        },
      ],
      cscKeyPassword: process.env.CSC_KEY_PASSWORD,
      cscLink: process.env.CSC_LINK,
      mac: {
        target: [
          {
            target: 'dmg',
            arch: [process.env.ARCH], // ARCH env is set during release CI
          },
        ],
        publish: publishOptions,
        category: 'public.app-category.utilities',
        icon: 'electron/assets/icons/splash-robot-head-dock.png',
        hardenedRuntime: true,
        gatekeeperAssess: false,
        entitlements: 'electron/entitlements.mac.plist',
        entitlementsInherit: 'electron/entitlements.mac.plist',
        signIgnore: [
          '.*/_internal/.*',
          '.*/bins/middleware/pearl.*'
        ],
      },
    },
  });
};

main().then((res) => {
  console.log('\n✅ Build complete!');
  console.log('📦 Result type:', typeof res);
  console.log('📦 Result keys:', Object.keys(res || {}));
  console.log('📦 Result:', res);
  console.log('\n🎉 Build & Notarize complete!\n');
}).catch((e) => {
  console.error('\n❌ Build failed!');
  console.error('💥 Error type:', typeof e);
  console.error('💥 Error message:', e?.message || 'No message');
  console.error('💥 Error code:', e?.code || 'No code');
  console.error('💥 Error stack:', e?.stack || 'No stack');
  console.error('💥 Error details:', e);
  console.error('\n');
  throw new Error('Failed to build and notarize.');
});
