# Get Back To Work

A VS Code extension that alarms you when you go idle in your editor, helping you stay productive.

## Features

- **Automatic Idle Detection**: Detects when you've been inactive in VS Code
- **Real-time Countdown**: Shows remaining time before alert in the status bar
- **Sound Alerts**: Plays customizable sound notifications when you're idle
- **Visual Indicators**: Status bar changes color as idle timeout approaches
- **Configurable Settings**: Set your own idle time thresholds and alert preferences
- **Quick Access Menu**: Manage the extension directly from the status bar

![Status Bar Countdown](https://raw.githubusercontent.com/username/get-back-to-work/main/images/status-bar.png)

## How It Works

The extension actively monitors your coding activity through keyboard input, cursor movements, and window focus. When it detects inactivity beyond your configured threshold, it alerts you with both visual and audio notifications to remind you to get back to work.

### Status Bar Indicators

The extension provides real-time feedback in your VS Code status bar:
- **Active State**: Shows a green checkmark when you're actively working
- **Countdown Timer**: Displays minutes and seconds remaining before idle alert
- **Warning State**: Turns yellow when approaching idle threshold (under 1 minute)
- **Alert State**: Turns red and flashes when you're idle

### Sound Alerts

When you go idle, the extension plays sound alerts to get your attention:
- Choose between different sound types
- Sounds repeat until you dismiss the alert or resume activity
- Configure sound settings or disable sounds completely

## Extension Settings

This extension contributes the following settings:

* `getBackToWork.idleTimeInMinutes`: Time in minutes before showing idle alarm (default: 5)
* `getBackToWork.checkIntervalInSeconds`: Interval in seconds to check idle status (default: 1)
* `getBackToWork.soundEnabled`: Enable or disable sound alerts (default: true)
* `getBackToWork.soundType`: Type of sound to play ("beep", "alarm", or "notification")

## Commands

The extension provides the following commands:

* `Get Back To Work: Start Monitoring`: Begin idle monitoring
* `Get Back To Work: Stop Monitoring`: Pause idle monitoring
* `Get Back To Work: Show Options`: Display the options menu
* `Get Back To Work: Sound Settings`: Configure sound alert settings

## Quick Menu

Click on the status bar item to access the quick menu:
- Start/Stop monitoring
- Reset the idle timer
- Change idle time threshold
- Configure sound settings

![Options Menu](https://raw.githubusercontent.com/username/get-back-to-work/main/images/options-menu.png)

## Sound Settings

The Sound Settings panel lets you:
- Enable/disable sound alerts
- Choose between different sound types
- Test sounds before selecting them

![Sound Settings](https://raw.githubusercontent.com/username/get-back-to-work/main/images/sound-settings.png)

## Installation

1. Launch VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Get Back To Work"
4. Click Install

## For macOS Users

On macOS, the extension works identically to other platforms. The idle detection and sound alerts function the same way, with the extension running automatically after installation.

## Release Notes

### 0.0.1

Initial release with:
- Idle detection and alerts
- Real-time status bar with countdown
- Sound alert system
- Configurable settings

### Development

```bash
# Install dependencies
npm install

# Watch mode
npm run watch

# Build
npm run compile

# Package extension
npm run vsix
```

## Feedback and Contributions

Feedback and contributions are welcome! Please open an issue or submit a PR on the [GitHub repository](https://github.com/username/get-back-to-work).

## License

[MIT](LICENSE)
