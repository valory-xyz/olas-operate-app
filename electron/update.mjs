// @ts-check
import { MacUpdater } from 'electron-updater';

import { isDev } from './constants/env.mjs';
import { logger } from './utils/logger.mjs';

const macUpdater = new MacUpdater();

macUpdater.autoDownload = false;
macUpdater.autoInstallOnAppQuit = false;
macUpdater.logger = logger;
macUpdater.forceDevUpdateConfig = isDev;

export { macUpdater };
