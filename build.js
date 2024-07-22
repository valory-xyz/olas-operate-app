/**
 * This script is used to build, release, code sign and notarize the app.
 * It is used for the final build and release process.
 */
import { build } from "electron-builder"

const publishOptions = {
  provider: 'github',
  owner: 'valory-xyz',
  repo: 'olas-operate-app',
  releaseType: 'draft',
  token: process.env.GH_TOKEN,
  private: false,
  publishAutoUpdate: true,
};

const main = async () => {
  console.log("Building... ");

  /** @type import {CliOptions} from "electron-builder" */
  await build({
    publish: "onTag",
    config: {
      appId: "xyz.valory.olas-operate-app",
      artifactName: "${productName}-${version}-${platform}-${arch}.${ext}",
      productName: "Pearl",
      files: ["./electron/**/*", "./package.json", "./app-update.yml"],
      directories: {
        output: "./dist",
      },
      extraResources: [
        {
          from: "./electron/bins",
          to: "bins",
          filter: ["**/*"],
        },
      ],
      cscKeyPassword: process.env.CSC_KEY_PASSWORD,
      cscLink: process.env.CSC_LINK,
      mac: {
        target: [
          {
            target: "default",
            arch: ["arm64", "x64"],
          },
        ],
        publish: publishOptions,
        category: "./public.app-category.utilities",
        icon: "./electron/assets/icons/splash-robot-head-dock.png",
        hardenedRuntime: true,
        gatekeeperAssess: false,
        entitlements: "./electron/entitlements.mac.plist",
        entitlementsInherit: "./electron/entitlements.mac.plist",
        notarize: {
          teamId: process.env.APPLETEAMID,
        },        
      },
    },
  });
};

main()
  .then((response) => {
    console.log("Build & Notarize complete");
  })
  .catch((e) => console.error(e));
