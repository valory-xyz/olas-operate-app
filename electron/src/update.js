// @ts-check
import { MacUpdater } from 'electron-updater';

import { isDev } from './constants/env.js';
import { logger } from './utils/logger.js';

const macUpdater = new MacUpdater();

macUpdater.autoDownload = false;
macUpdater.autoInstallOnAppQuit = false;
macUpdater.logger = logger;
macUpdater.forceDevUpdateConfig = isDev;

export { macUpdater };
