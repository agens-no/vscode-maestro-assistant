import * as vscode from 'vscode';

export async function runMaestroWithCurrentFile(commands: { [key: string]: string }) {
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
      executeCommand(commandTemplate, activeFilePath);
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
      executeCommand(commandTemplate, activeFilePath);
    }
  }
  
  function executeCommand(commandTemplate: string, activeFilePath: string) {
    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal();
    terminal.show();
  
    // Replace the placeholders with actual values
    const command = commandTemplate.replace('{FILE_PATH}', activeFilePath);
    terminal.sendText(command);
  }
  