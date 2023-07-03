import * as vscode from 'vscode';

export async function runMaestroWithCurrentFile(commands: { [key: string]: string | Array<{ name: string; command: string }> }) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showErrorMessage('No active text editor found.');
      return;
    }
  
    const activeFileUri = activeEditor.document.uri;
    if (activeFileUri.scheme !== 'file') {
      vscode.window.showErrorMessage('Only file scheme URIs are supported.');
      return;
    }
  
    const activeFilePath = activeFileUri.fsPath;
  
    if (!commands) {
      vscode.window.showErrorMessage('Failed to load extension configuration.');
      return;
    }
  
    if (Object.keys(commands).length === 1) {
      // Execute the only available command directly
      const platform = Object.keys(commands)[0];
      const commandTemplate = commands[platform];
      executeCommands(commandTemplate, activeFilePath, platform);
    } else {
      // Generate options based on the configuration
      const options: vscode.QuickPickItem[] = Object.entries(commands).map(([platform, command]) => {
        const description = `Test on ${platform.replace('-', ' - ')}`;
        return { label: platform, description };
      });
  
      const selectedItem = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select a platform',
      });
  
      if (!selectedItem) {
        return; // User canceled the selection
      }
  
      const platform = selectedItem.label;
      const commandTemplate = commands[platform];
      executeCommands(commandTemplate, activeFilePath, platform);
    }
  }
  
  function executeCommands(commandTemplate: string | Array<{ name: string; command: string }>, activeFilePath: string, platformName: string) {
    if (Array.isArray(commandTemplate)) {
      for (const cmdObj of commandTemplate) {
        const terminalName = cmdObj.name;
        const terminal = vscode.window.createTerminal(terminalName);
        terminal.show();
  
        const command = cmdObj.command.replace('{FILE_PATH}', activeFilePath);
        terminal.sendText(command);
      }
    } else {
      // Use the `platformName` as the terminal name for single commands
      const terminal = vscode.window.activeTerminal || vscode.window.createTerminal(platformName);
      terminal.show();
  
      const command = commandTemplate.replace('{FILE_PATH}', activeFilePath);
      terminal.sendText(command);
    }
  }
  