# Automatic Updates Setup

This document explains how automatic updates are configured in Pearl (olas-operate-app).

## Overview

Pearl uses **electron-updater** with a **user-consent approach** for updates. The app automatically checks for updates but requires user approval before downloading. This gives users control while keeping the process seamless.

## How It Works

### 1. Update Flow

```
App Starts → Check for Updates (after 3s)
     ↓
Update Available? 
     ↓ YES
Notify User (Show Dialog)
     ↓
User Clicks "Download Update"
     ↓
Download Update
     ↓
Download Complete → Notify User
     ↓
User Quits App → Auto Install Update
     ↓
App Restarts with New Version
```

### 2. Update Schedule

- **Initial Check**: 3 seconds after app startup
- **Periodic Checks**: Every 4 hours while the app is running
- **Manual Check**: Available via the UI (optional)

### 3. Update Behavior

| Setting | Value | Description |
|---------|-------|-------------|
| `autoDownload` | `false` | User must approve before downloading updates |
| `autoInstallOnAppQuit` | `true` | Updates install automatically when user quits |
| Check Interval | 4 hours | Time between automatic update checks |
| Release Channel | `latest` | Default channel (also supports `beta`, `alpha`) |

## Configuration

### Update Settings (`electron/update.js`)

```javascript
autoUpdater.autoDownload = false;          // Require user consent before download
autoUpdater.autoInstallOnAppQuit = true;   // Auto-install on quit after download
autoUpdater.checkForUpdatesInterval = 4 * 60 * 60 * 1000; // 4 hours
```

### Publish Settings (`electron/constants/index.js`)

```javascript
const publishOptions = {
  provider: 'github',
  owner: 'valory-xyz',
  repo: 'olas-operate-app',
  releaseType: 'release',      // Must be 'release' for auto-update
  // Note: latest-mac.yml is auto-generated when 'zip' target is included in mac build config
};
```

### Mac Build Targets (`build.js`)

**Critical:** macOS builds require BOTH `dmg` and `zip` targets. The `zip` target is what generates the `latest-mac.yml` file needed for auto-updates.

```javascript
mac: {
  target: [
    { target: 'dmg', arch: ['arm64'] },
    { target: 'zip', arch: ['arm64'] },  // Required for auto-update
  ],
  // ... other settings
}
```

## Update Events

The app emits the following events during the update process:

| Event | When It Fires | What Happens |
|-------|--------------|--------------|
| `checking-for-update` | Update check starts | Logs to console |
| `update-available` | New version found | Notification sent to UI |
| `update-not-available` | No updates found | Logs to console |
| `download-progress` | During download | Progress updates sent to UI |
| `update-downloaded` | Download complete | Notification sent to UI |
| `error` | Any error occurs | Error sent to UI |

## User Experience

### User-Consent Mode (Current Setup)

1. App checks for updates automatically (startup + every 4 hours)
2. If update found → User sees notification with update details
3. User decides to download or dismiss
4. If user approves → Download starts in background with progress
5. When download complete → User sees "ready to install" notification
6. Update installs automatically when user quits the app
7. App restarts with new version

### UI Integration

The `UpdateNotification` component is integrated in `frontend/components/Layout/Layout.tsx` and provides:
- **Update Available Modal**: Shows version and release notes with "Download Update" button
- **Download Progress**: Live progress bar with speed indicator (MB/s)
- **Update Ready Modal**: Prompts to "Restart and Install" or "Install Later"
- **Error Handling**: Displays download/update errors

**User Options:**
- **Later**: Dismiss notification, will prompt again in 4 hours
- **Download Update**: Start downloading in background
- **Install Later**: Continue working, installs on next app quit
- **Restart and Install**: Quit and install immediately

## Building & Publishing for Auto-Update

### macOS

1. **Code Signing Required**
   ```bash
   export CSC_LINK="path/to/certificate.p12"
   export CSC_KEY_PASSWORD="certificate-password"
   ```

2. **Notarization Required**
   ```bash
   export APPLE_ID="your-apple-id@email.com"
   export APPLE_APP_SPECIFIC_PASSWORD="app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```

3. **Build & Publish**
   ```bash
   NODE_ENV=production node build.js
   ```

### Windows

1. **Code Signing Required**
   ```bash
   export SM_KEY_PAIR_ALIAS="key-pair-alias"
   ```

2. **Build & Publish**
   ```bash
   NODE_ENV=production node build-win.js
   ```

### Release Requirements

For auto-update to work:
- ✅ Release must be **published** (not draft)
- ✅ `latest-mac.yml` (macOS) and `latest.yml` (Windows) must be generated
- ✅ App must be code-signed
- ✅ GitHub release must be tagged properly
- ✅ **macOS builds must include BOTH `dmg` and `zip` targets** (zip generates latest-mac.yml)

## Testing Updates

### Development Testing

```bash
# 1. Build the app with a specific version
yarn build:frontend
node build.tester.js

# 2. Create a GitHub release with a higher version number

# 3. Run the built app and check logs
# Updates will be checked automatically
```

### Verifying Update Files

After building, verify these files exist in the GitHub release:

**macOS:**
- `Pearl-{version}-mac-{arch}.dmg` (for user installation)
- `Pearl-{version}-mac-{arch}.zip` (for auto-update)
- `latest-mac.yml` (auto-update metadata)

**Windows:**
- `Pearl-{version}-win-{arch}.exe` (for user installation)
- `latest.yml` (auto-update metadata)

## Update Channels

You can use different release channels:

```javascript
// In electron/update.js
const updateOptions = {
  channels: ['latest', 'beta', 'alpha'],
};
```

Then publish with specific channels:
- Production: Tag as `v1.0.0`
- Beta: Tag as `v1.0.0-beta.1`
- Alpha: Tag as `v1.0.0-alpha.1`

## Logs

Update activity is logged to:
- Console: `console.log`
- File: `~/.operate/electron.log`

Example log entries:
```
Checking for updates...
Update available: 1.0.2
Download speed: 5242880 - Downloaded 45% (2359296/5242880)
Update downloaded: 1.0.2
```

## Troubleshooting

### Updates Not Working?

1. **Check release is published**
   - Draft releases won't trigger updates
   - Release must be public

2. **Verify latest.yml exists**
   - Should be in the GitHub release assets
   - Contains version info and file hashes
   - **macOS:** Missing `latest-mac.yml`? Ensure `zip` target is in build config!

3. **macOS: Missing latest-mac.yml file**
   - ⚠️ **Most Common Issue**: Build config missing `zip` target
   - Check `build.js` includes both `dmg` and `zip` in mac targets
   - Without `zip` target, no auto-update metadata is generated
   - Verify `.zip` file exists alongside `.dmg` in GitHub release

4. **Check code signing**
   - macOS requires notarization
   - Windows requires valid certificate
   - Unsigned apps may be blocked

5. **Verify version numbers**
   - Current version < published version
   - Use semantic versioning (1.0.0)

6. **Check logs**
   - Look in `~/.operate/electron.log`
   - Search for "update" or "error"

### Disable Auto-Update (for testing)

Set `NODE_ENV=development` to disable update checks:

```javascript
// In electron/update.js
if (process.env.NODE_ENV === 'development') {
  logger.electron('Skipping update check in development mode');
  return null;
}
```

## Security Considerations

1. **Code Signing**: All updates are verified against the certificate
2. **HTTPS Only**: Updates download only via HTTPS
3. **SHA512 Verification**: Files are verified before installation
4. **Notarization**: macOS apps are scanned by Apple before distribution

## Manual Update Option

If you want to give users control, you can expose the manual check option:

```typescript
// In your React component
<Button onClick={() => window.electronAPI.updates.checkForUpdates()}>
  Check for Updates
</Button>
```

## Implementation Details

### Files Modified

1. **`electron/update.js`**
   ```javascript
   autoUpdater.autoDownload = false; // Require user consent
   ```

2. **`electron/main.js`**
   - Initial check: 3 seconds after startup
   - Periodic check: Every 4 hours via `setInterval`
   - IPC handlers for manual checks

3. **`frontend/components/Layout/Layout.tsx`**
   ```tsx
   import { UpdateNotification } from '../UpdateNotification';
   // Component rendered at root level
   <UpdateNotification />
   ```

### API Exposed to Frontend

```typescript
// Available via window.electronAPI.updates
checkForUpdates(): Promise<UpdateInfo | null>
downloadUpdate(): Promise<string[]>
quitAndInstall(): void
onUpdateAvailable(callback): void
onDownloadProgress(callback): void
onUpdateDownloaded(callback): void
onUpdateError(callback): void
```

## Benefits

### For Users
- ✅ **Control**: Decide when to download updates
- ✅ **Informed**: See release notes before downloading
- ✅ **Flexible**: Install now or later
- ✅ **Bandwidth-Aware**: Can defer on slow/metered connections

### For Developers
- ✅ **Better UX**: Less disruptive than forced updates
- ✅ **Transparent**: Users know what's happening
- ✅ **Gradual Rollout**: Not everyone updates immediately

## Further Reading

- [electron-updater Documentation](https://www.electron.build/auto-update)
- [Code Signing for macOS](https://www.electron.build/code-signing)
- [Code Signing for Windows](https://www.electron.build/code-signing#windows)

