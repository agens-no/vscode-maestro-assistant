import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as path from 'path';

export async function getTestrailAutomationId() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor found.');
      return;
    }

    function hasNameProperty(obj: unknown): obj is Record<string, unknown> & { name: unknown } {
        return typeof obj === 'object' && obj !== null && 'name' in obj;
      }

    const document = editor.document;
    if (document.languageId !== 'yaml') {
      vscode.window.showErrorMessage('This command can only be used on YAML files.');
      return;
    }

    const content = document.getText();
    try {
      let name: string | undefined;
      yaml.loadAll(content, (doc: unknown) => {
        if (!name && hasNameProperty(doc)) {
          name = doc['name'] as string;
        }
      });

      if (name) {
        const fileNameWithExtension = path.basename(document.uri.fsPath);
        const fileNameWithoutExtension = path.parse(fileNameWithExtension).name;
        const combinedText = `${fileNameWithoutExtension}.${name}`;
        await vscode.env.clipboard.writeText(combinedText);
        vscode.window.showInformationMessage(`Copied to clipboard: ${combinedText}`);
      } else {
        vscode.window.showInformationMessage('No "name" property found in the YAML file.');
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      vscode.window.showErrorMessage('Failed to parse YAML: ' + errorMessage);
    }
  }
