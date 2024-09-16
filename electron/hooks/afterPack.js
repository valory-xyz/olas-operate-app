const { promises: fs } = require('fs');
const log = (...messages) => console.log(...messages);

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') {
    return context;
  }
  const troublesome_files = [
    `dist/mac-arm64/Olas Operate.app/Contents/Resources/app.asar.unpacked/node_modules/electron-sudo/dist/bin/applet.app/Contents/MacOS/applet/LICENSE`,
  ];

  try {
    log('\n\n🪝 afterPack hook triggered: ');
    await Promise.all(
      troublesome_files.map((file) => {
        log(`Deleting ${file}`);
        return fs.rm(file);
      }),
    );
    log('Cleaned up LICENSE files\n\n');
    return context;
  } catch (e) {
    log(`afterPack issue: `, e);
  }
};
