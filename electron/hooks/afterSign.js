const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config();

module.exports = async function (context) {
  const appOutDir = context.appOutDir;
  const appPath = path.join(
    appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );
  const resourcesPath = path.join(appPath, 'Contents', 'Resources');

  console.log('Signing extra binaries ...');

  if (os.platform() === 'darwin') {
    console.log('Signing for Mac ...');
    // Find all binaries in extraResources (bins folder)
    const binsDir = path.join(resourcesPath, 'bins');
    const binaries = fs.readdirSync(binsDir);

    binaries.forEach((binary) => {
      const binaryPath = path.join(binsDir, binary);

      // Sign the binary
      console.log(`Signing binary: ${binaryPath}`);
      execSync(
        `codesign --deep --force --verbose --sign "Developer ID Application: ${process.env.APPLETEAMID}" "${binaryPath}"`,
      );
    });

    // Optionally, deep-sign the entire app (if needed, after signing the binaries)
    // execSync(
    //   `codesign --deep --force --verify --verbose --sign "Developer ID Application: ${process.env.APPLETEAMID}" "${appPath}"`,
    // );
  }

  console.log('Signing extra binaries complete.');
};
