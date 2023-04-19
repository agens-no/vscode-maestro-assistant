import * as vscode from 'vscode';
import { createFlow } from './createFlow';
import { runMaestroWithCurrentFile } from './runMaestroWithCurrentFile';
import { getTestrailAutomationId } from './getTestrailAutomationId';



export function activate(context: vscode.ExtensionContext) {
  let commands: { [key: string]: string } | undefined;

  function updateCommands() {
    const config = vscode.workspace.getConfiguration('maestro-assistant');
    commands = config.get<{ [key: string]: string }>('commands');
  }

  updateCommands();

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('maestro-assistant.commands')) {
      updateCommands();
    }
  });

  let runMaestroWithCurrentFileCommand = vscode.commands.registerCommand(
    'extension.runMaestroWithCurrentFile',
    () => runMaestroWithCurrentFile(commands || {})
  );  
  
  let createFlowCommand = vscode.commands.registerCommand('extension.createFlow', () => {
    createFlow(context);
  });
  
  let getTestrailAutomationIdCommand = vscode.commands.registerCommand('extension.getTestrailAutomationId', getTestrailAutomationId);

  context.subscriptions.push(runMaestroWithCurrentFileCommand);
  context.subscriptions.push(createFlowCommand);
  context.subscriptions.push(getTestrailAutomationIdCommand);
}

export function deactivate() {}
