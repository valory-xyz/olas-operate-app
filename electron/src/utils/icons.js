import { nativeImage } from 'electron';
import path from 'path';

const iconSize = { width: 16, height: 16 };

const TRAY_ICONS_PATHS = {
  LOGGED_OUT: path.join(
    import.meta.dirname,
    `../assets/icons/tray-logged-out.png`,
  ),
  LOW_GAS: path.join(import.meta.dirname, `../assets/icons/tray-low-gas.png`),
  PAUSED: path.join(import.meta.dirname, `../assets/icons/tray-paused.png`),
  RUNNING: path.join(import.meta.dirname, `../assets/icons/tray-running.png`),
};

const TRAY_ICONS = {
  LOGGED_OUT: nativeImage
    .createFromPath(TRAY_ICONS_PATHS.LOGGED_OUT)
    .resize(iconSize),
  LOW_GAS: nativeImage
    .createFromPath(TRAY_ICONS_PATHS.LOW_GAS)
    .resize(iconSize),
  PAUSED: nativeImage.createFromPath(TRAY_ICONS_PATHS.PAUSED).resize(iconSize),
  RUNNING: nativeImage
    .createFromPath(TRAY_ICONS_PATHS.RUNNING)
    .resize(iconSize),
};

export { TRAY_ICONS, TRAY_ICONS_PATHS };
