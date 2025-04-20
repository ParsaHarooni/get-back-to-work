// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// Default configuration values
const DEFAULT_IDLE_TIME_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_CHECK_INTERVAL_MS = 1 * 1000; // 1 second
const DEFAULT_UI_UPDATE_INTERVAL_MS = 100; // 100ms for smooth UI updates

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "get-back-to-work" is now active');

	let lastActivityTime = new Date();
	let idleTimerInterval: NodeJS.Timeout | undefined;
	let uiUpdateInterval: NodeJS.Timeout | undefined;
	let soundInterval: NodeJS.Timeout | undefined;
	let isAlarmActive = false;
	let isMonitoring = false;
	let webviewPanel: vscode.WebviewPanel | undefined;
	
	// Create status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'get-back-to-work.showOptions';
	statusBarItem.tooltip = 'Get Back To Work';
	context.subscriptions.push(statusBarItem);
	
	// Initialize status bar
	statusBarItem.text = '$(clock) Working';
	statusBarItem.show();

	// Function to update the status bar
	function updateStatusBar() {
		if (!isMonitoring) {
			statusBarItem.text = '$(debug-pause) Paused';
			statusBarItem.backgroundColor = undefined;
			return;
		}

		if (isAlarmActive) {
			// Blinking effect when idle
			const date = new Date();
			const shouldBlink = date.getMilliseconds() < 500;
			statusBarItem.text = shouldBlink ? '$(alert) IDLE!' : '$(alert) GET BACK TO WORK!';
			statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		} else {
			const config = vscode.workspace.getConfiguration('getBackToWork');
			const idleTimeMs = config.get('idleTimeInMinutes', DEFAULT_IDLE_TIME_MS / 60000) * 60000;
			
			const currentTime = new Date();
			const timeSinceLastActivity = currentTime.getTime() - lastActivityTime.getTime();
			const remainingTimeMs = Math.max(0, idleTimeMs - timeSinceLastActivity);
			
			if (remainingTimeMs < idleTimeMs) {
				// Show detailed countdown with decimal seconds for more real-time feel
				const minutes = Math.floor(remainingTimeMs / 60000);
				const seconds = Math.floor((remainingTimeMs % 60000) / 1000);
				const tenths = Math.floor((remainingTimeMs % 1000) / 100);
				
				// Add progress indicator
				const progressPercentage = Math.floor((remainingTimeMs / idleTimeMs) * 100);
				let progressBar = '';
				
				if (progressPercentage > 75) {
					progressBar = '$(check) ';
				} else if (progressPercentage > 50) {
					progressBar = '$(watch) ';
				} else if (progressPercentage > 25) {
					progressBar = '$(warning) ';
				} else {
					progressBar = '$(error) ';
				}
				
				statusBarItem.text = `${progressBar}${minutes}m ${seconds}.${tenths}s`;
				
				// Change color based on remaining time
				if (remainingTimeMs < 30000) { // less than 30 seconds
					statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
				} else if (remainingTimeMs < 60000) { // less than 1 minute
					statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
				} else {
					statusBarItem.backgroundColor = undefined;
				}
			} else {
				statusBarItem.text = '$(check) Active';
				statusBarItem.backgroundColor = undefined;
			}
		}
	}
	
	// Function to update the last activity timestamp
	function updateActivity() {
		lastActivityTime = new Date();
		
		// Clear alarm if it was active
		if (isAlarmActive) {
			isAlarmActive = false;
			stopSoundLoop();
			vscode.window.showInformationMessage('Welcome back to work!');
		}
	}

	// Function to check if user is idle
	function checkIdle() {
		if (!isMonitoring) return;
		
		const config = vscode.workspace.getConfiguration('getBackToWork');
		const idleTimeMs = config.get('idleTimeInMinutes', DEFAULT_IDLE_TIME_MS / 60000) * 60000;
		
		const currentTime = new Date();
		const timeSinceLastActivity = currentTime.getTime() - lastActivityTime.getTime();
		
		if (timeSinceLastActivity >= idleTimeMs && !isAlarmActive) {
			// User is idle, trigger alarm
			isAlarmActive = true;
			
			// Start sound loop
			startSoundLoop();
			
			// Show notification with button to dismiss
			vscode.window.showErrorMessage(
				'You have been idle for too long! Get back to work!',
				'Dismiss'
			).then(selection => {
				if (selection === 'Dismiss') {
					updateActivity();
					stopSoundLoop();
				}
			});
		}
	}

	// Start idle detection
	function startIdleDetection() {
		isMonitoring = true;
		const config = vscode.workspace.getConfiguration('getBackToWork');
		const checkIntervalMs = config.get('checkIntervalInSeconds', DEFAULT_CHECK_INTERVAL_MS / 1000) * 1000;
		
		// Clear any existing intervals
		stopAllIntervals();
		
		// Set up new intervals
		idleTimerInterval = setInterval(checkIdle, checkIntervalMs);
		uiUpdateInterval = setInterval(updateStatusBar, DEFAULT_UI_UPDATE_INTERVAL_MS);
		
		// Reset activity timestamp
		updateActivity();
	}
	
	// Stop all intervals
	function stopAllIntervals() {
		if (idleTimerInterval) {
			clearInterval(idleTimerInterval);
			idleTimerInterval = undefined;
		}
		
		if (uiUpdateInterval) {
			clearInterval(uiUpdateInterval);
			uiUpdateInterval = undefined;
		}
	}
	
	// Stop idle detection
	function stopIdleDetection() {
		isMonitoring = false;
		stopAllIntervals();
		updateStatusBar();
	}

	// Register activity events to track
	const activityEvents = [
		vscode.window.onDidChangeActiveTextEditor,
		vscode.window.onDidChangeTextEditorSelection,
		vscode.workspace.onDidChangeTextDocument,
		vscode.window.onDidChangeWindowState,
		vscode.window.onDidChangeTerminalState,
		vscode.window.onDidChangeVisibleTextEditors
	];
	
	// Add mouse and keyboard events via the statusBarItem
	// (This is a trick to detect more user activity)
	statusBarItem.tooltip = 'Get Back To Work (Click to show options)';
	const mouseMoveHandler = vscode.window.onDidChangeActiveTextEditor(() => {
		if (isMonitoring) {
			updateActivity();
		}
	});
	
	// Update activity timestamp when any of these events occur
	activityEvents.forEach(event => {
		const disposable = event(() => {
			if (isMonitoring) {
				updateActivity();
			}
		});
		context.subscriptions.push(disposable);
	});

	// Create webview panel for playing sounds
	function createSoundWebview() {
		if (webviewPanel) {
			webviewPanel.reveal();
			return;
		}
		
		webviewPanel = vscode.window.createWebviewPanel(
			'getBackToWorkSound',
			'Get Back To Work',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);
		
		// Handle panel close
		webviewPanel.onDidDispose(() => {
			webviewPanel = undefined;
		});
		
		// Set webview content with audio
		updateWebviewContent();
	}
	
	// Update webview content
	function updateWebviewContent() {
		if (!webviewPanel) return;
		
		const config = vscode.workspace.getConfiguration('getBackToWork');
		const soundEnabled = config.get('soundEnabled', true);
		const soundType = config.get('soundType', 'beep');
		
		webviewPanel.webview.html = `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Get Back To Work Sound</title>
				<style>
					body {
						padding: 20px;
						font-family: system-ui, -apple-system, sans-serif;
					}
					.container {
						display: flex;
						flex-direction: column;
						gap: 20px;
					}
					button {
						padding: 10px;
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						border-radius: 4px;
						cursor: pointer;
					}
					.sound-options {
						display: flex;
						flex-direction: column;
						gap: 10px;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<h1>Get Back To Work Sound Settings</h1>
					
					<div>
						<label>
							<input type="checkbox" id="enableSound" ${soundEnabled ? 'checked' : ''}>
							Enable sound alerts
						</label>
					</div>
					
					<div class="sound-options">
						<h3>Sound Type:</h3>
						<label>
							<input type="radio" name="soundType" value="beep" ${soundType === 'beep' ? 'checked' : ''}>
							Simple Beep
						</label>
						<label>
							<input type="radio" name="soundType" value="alarm" ${soundType === 'alarm' ? 'checked' : ''}>
							Alarm Bell
						</label>
						<label>
							<input type="radio" name="soundType" value="notification" ${soundType === 'notification' ? 'checked' : ''}>
							Notification
						</label>
					</div>
					
					<div>
						<h3>Test Sound:</h3>
						<button id="testSound">Play Test Sound</button>
					</div>
				</div>
				
				<audio id="beepSound" preload="auto">
					<source src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA" type="audio/wav">
				</audio>
				<audio id="alarmSound" preload="auto">
					<source src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA" type="audio/wav">
				</audio>
				<audio id="notificationSound" preload="auto">
					<source src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgA" type="audio/wav">
				</audio>
				
				<script>
					const vscode = acquireVsCodeApi();
					
					// Simple beep sound generator
					function generateBeep(duration = 500, frequency = 800, volume = 1, type = 'sine') {
						const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
						const oscillator = audioCtx.createOscillator();
						const gainNode = audioCtx.createGain();
						
						oscillator.type = type;
						oscillator.frequency.value = frequency;
						oscillator.connect(gainNode);
						gainNode.connect(audioCtx.destination);
						
						gainNode.gain.value = volume;
						oscillator.start();
						
						setTimeout(() => {
							oscillator.stop();
						}, duration);
					}
					
					// Play alarm sound
					function playAlarmSound() {
						const soundType = document.querySelector('input[name="soundType"]:checked').value;
						const enableSound = document.getElementById('enableSound').checked;
						
						if (!enableSound) return;
						
						switch(soundType) {
							case 'beep':
								generateBeep(300, 800, 0.5);
								setTimeout(() => generateBeep(300, 1000, 0.5), 350);
								setTimeout(() => generateBeep(300, 1200, 0.5), 700);
								break;
							case 'alarm':
								generateBeep(200, 800, 0.3);
								setTimeout(() => generateBeep(300, 600, 0.5), 250);
								setTimeout(() => generateBeep(500, 900, 0.5), 600);
								setTimeout(() => generateBeep(300, 600, 0.5), 1150);
								setTimeout(() => generateBeep(500, 900, 0.5), 1500);
								break;
							case 'notification':
								generateBeep(150, 1200, 0.3, 'sine');
								setTimeout(() => generateBeep(150, 1600, 0.3, 'sine'), 175);
								break;
						}
					}
					
					// Test sound button
					document.getElementById('testSound').addEventListener('click', () => {
						playAlarmSound();
					});
					
					// Handle settings changes
					document.getElementById('enableSound').addEventListener('change', (e) => {
						vscode.postMessage({
							command: 'updateSetting',
							setting: 'soundEnabled',
							value: e.target.checked
						});
					});
					
					document.querySelectorAll('input[name="soundType"]').forEach(input => {
						input.addEventListener('change', (e) => {
							vscode.postMessage({
								command: 'updateSetting',
								setting: 'soundType',
								value: e.target.value
							});
						});
					});
					
					// Listen for messages from the extension
					window.addEventListener('message', event => {
						const message = event.data;
						switch (message.command) {
							case 'playSound':
								playAlarmSound();
								break;
						}
					});
				</script>
			</body>
			</html>
		`;
		
		// Handle messages from the webview
		webviewPanel.webview.onDidReceiveMessage(message => {
			if (message.command === 'updateSetting') {
				const config = vscode.workspace.getConfiguration('getBackToWork');
				config.update(message.setting, message.value, true);
			}
		});
	}
	
	// Play sound alert
	function playSound() {
		// First approach: Use native VS Code notification sounds
		vscode.window.showErrorMessage('Get back to work!', { modal: false });
		
		// Second approach: Use the webview if available
		if (webviewPanel && webviewPanel.visible) {
			webviewPanel.webview.postMessage({ command: 'playSound' });
		}
	}
	
	// Start sound loop - plays repeated sounds when idle
	function startSoundLoop() {
		if (soundInterval) {
			clearInterval(soundInterval);
		}
		
		const config = vscode.workspace.getConfiguration('getBackToWork');
		const soundEnabled = config.get('soundEnabled', true);
		
		if (soundEnabled) {
			// Play immediately
			playSound();
			
			// Then play every 5 seconds
			soundInterval = setInterval(() => {
				playSound();
			}, 5000);
		}
	}
	
	// Stop sound loop
	function stopSoundLoop() {
		if (soundInterval) {
			clearInterval(soundInterval);
			soundInterval = undefined;
		}
	}

	// Create command to show options menu
	const optionsCommand = vscode.commands.registerCommand('get-back-to-work.showOptions', () => {
		const items = [
			{ label: '$(play) Start Monitoring', description: 'Begin tracking idle time' },
			{ label: '$(debug-pause) Stop Monitoring', description: 'Pause idle time tracking' },
			{ label: '$(debug-restart) Reset Timer', description: 'Reset the idle timer' },
			{ label: '$(settings-gear) Change Idle Time', description: 'Change idle timeout value' },
			{ label: '$(unmute) Sound Settings', description: 'Configure alert sounds' }
		];
		
		vscode.window.showQuickPick(items, { 
			placeHolder: 'Get Back To Work Options',
			matchOnDescription: true
		}).then(selection => {
			if (!selection) return;
			
			if (selection.label.includes('Start Monitoring')) {
				startIdleDetection();
				vscode.window.showInformationMessage('Get back to work: Idle monitoring started');
			} else if (selection.label.includes('Stop Monitoring')) {
				stopIdleDetection();
				vscode.window.showInformationMessage('Get back to work: Idle monitoring stopped');
			} else if (selection.label.includes('Reset Timer')) {
				updateActivity();
				vscode.window.showInformationMessage('Get back to work: Timer reset');
			} else if (selection.label.includes('Change Idle Time')) {
				const config = vscode.workspace.getConfiguration('getBackToWork');
				const currentIdleTime = config.get('idleTimeInMinutes', DEFAULT_IDLE_TIME_MS / 60000);
				
				const quickPickItems = [
					{ label: '1 minute', value: 1 },
					{ label: '2 minutes', value: 2 },
					{ label: '5 minutes', value: 5 },
					{ label: '10 minutes', value: 10 },
					{ label: '15 minutes', value: 15 },
					{ label: '30 minutes', value: 30 },
					{ label: 'Custom...', value: -1 }
				];
				
				vscode.window.showQuickPick(quickPickItems, {
					placeHolder: `Current idle time: ${currentIdleTime} minutes`
				}).then(timeSelection => {
					if (!timeSelection) return;
					
					if (timeSelection.value === -1) {
						// Custom value
						vscode.window.showInputBox({
							prompt: 'Enter idle time in minutes',
							placeHolder: 'e.g. 5',
							value: currentIdleTime.toString()
						}).then(value => {
							if (value && !isNaN(Number(value))) {
								const newValue = Number(value);
								if (newValue > 0) {
									config.update('idleTimeInMinutes', newValue, true);
									vscode.window.showInformationMessage(`Idle time set to ${newValue} minutes`);
								}
							}
						});
					} else {
						// Preset value
						config.update('idleTimeInMinutes', timeSelection.value, true);
						vscode.window.showInformationMessage(`Idle time set to ${timeSelection.value} minutes`);
					}
				});
			} else if (selection.label.includes('Sound Settings')) {
				createSoundWebview();
			}
		});
	});

	// Create command to manually start idle detection
	const startCommand = vscode.commands.registerCommand('get-back-to-work.startMonitoring', () => {
		startIdleDetection();
		vscode.window.showInformationMessage('Get back to work: Idle monitoring started');
	});

	// Create command to manually stop idle detection
	const stopCommand = vscode.commands.registerCommand('get-back-to-work.stopMonitoring', () => {
		stopIdleDetection();
		vscode.window.showInformationMessage('Get back to work: Idle monitoring stopped');
	});

	// Create command to configure sound settings
	const soundSettingsCommand = vscode.commands.registerCommand('get-back-to-work.soundSettings', () => {
		createSoundWebview();
	});

	// Start idle detection automatically when extension activates
	startIdleDetection();
	
	// Register all disposables
	context.subscriptions.push(optionsCommand, startCommand, stopCommand, mouseMoveHandler, soundSettingsCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Clean up any resources here
}
