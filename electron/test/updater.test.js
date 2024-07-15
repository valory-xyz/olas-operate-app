import { config } from 'dotenv';
import { app } from 'electron';

import { macUpdater } from '../update.js';

config();

macUpdater.addAuthHeader(process.env.TEST_GITHUB_TOKEN);

app.on('ready', () => {
  macUpdater.checkForUpdates();
});
