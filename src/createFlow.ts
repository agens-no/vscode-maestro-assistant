import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

async function readTemplateFiles(templatesFolderPath: string): Promise<string[]> {
	return new Promise((resolve, reject) => {
		fs.readdir(templatesFolderPath, (err, files) => {
			if (err) {
				reject(err);
			} else {
				resolve(files);
			}
		});
	});
}

function formatFilename(input: string): string {
	const trimmed = input.trim();
	const nameWithoutExt = trimmed.replace(/(\.yaml|\.yml)$/, '');
	const sanitized = nameWithoutExt.replace(/\s+/g, '_');
	return `${sanitized}.yaml`;
}

async function fillTemplate(template: string): Promise<string> {
	let filledTemplate = template;
	const placeholders = new Set<string>();

	const regex = /{{([\w]+)}}/g;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(template)) !== null) {
  		placeholders.add(match[1]);
	}

	const userInputMap: Record<string, string> = {};

	const configRegex = /\/\/\s*(\w+)\s*:\s*([^=\n]+)(?:\n|$)/g;
	let configMatch: RegExpExecArray | null;
	while ((configMatch = configRegex.exec(template)) !== null) {
		const placeholder = configMatch[1];
		const options = configMatch[2].split(',').map(option => option.trim());
		const userChoice = await vscode.window.showQuickPick(options, {placeHolder: `Select the value for ${placeholder}`});

		if (userChoice) {
			userInputMap[placeholder] = userChoice;
		}
	}

	// Remove configuration comments from the template
	filledTemplate = filledTemplate.replace(configRegex, '');

	for (const placeholder of placeholders) {
		const lowerPlaceholder = placeholder.toLowerCase();
		if (!Object.keys(userInputMap).some(key => key.toLowerCase() === lowerPlaceholder)) {
			const userInput = await vscode.window.showInputBox({prompt: `Enter the value for ${placeholder}`, placeHolder: placeholder});
			userInputMap[placeholder] = userInput || `Default ${placeholder}`;
		}
	}

	for (const placeholder in userInputMap) {
		filledTemplate = filledTemplate.replace(new RegExp(`{{${placeholder}}}`, 'gi'), userInputMap[placeholder]);
	}

	return filledTemplate;
}

export async function createFlow(context: vscode.ExtensionContext) {
	// Read templates folder path from the user's configuration
	const config = vscode.workspace.getConfiguration('maestro-assistant');
	const templatesFolderPath = config.get<string>('templatesFolderPath')?.replace('${workspaceFolder}', vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '') || (vscode.workspace.workspaceFolders ? path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'templates') : '');

	if (!fs.existsSync(templatesFolderPath) || !fs.lstatSync(templatesFolderPath).isDirectory()) {
		vscode.window.showErrorMessage(`Templates folder path is not a valid directory: ${templatesFolderPath}`);
		return;
	}

	let templateFiles: string[];
	try {
		templateFiles = await readTemplateFiles(templatesFolderPath);
	} catch (err) {
		vscode.window.showErrorMessage(`Error reading template files: ${(err as Error).message}`);
		return;
	}

	// Display a list of templates to choose from
	const selectedTemplate = await vscode.window.showQuickPick(templateFiles, {placeHolder: 'Select the template'});

	if (!selectedTemplate) {
		vscode.window.showErrorMessage('No template selected.');
		return;
	}

	// Read the user's chosen template
	const templatePath = path.join(templatesFolderPath, selectedTemplate);
	let templateContent: string;
	try {
		templateContent = await fs.promises.readFile(templatePath, 'utf-8');
	} catch (err) {
		const errorMessage = (err as Error).message;
		vscode.window.showErrorMessage(`Error reading the template: ${errorMessage}`);
		return;
	}

	// Fill the template with user input
	const newFlowContent = await fillTemplate(templateContent);

	// Create the new flow file (you can modify this part according to your project structure)
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	if (!workspaceFolder) {
		vscode.window.showErrorMessage('No workspace folder is open. Please open a workspace folder before running this command.');
		return;
	}

	async function getSubfolders(parentFolderPath: string): Promise<string[]> {
		const files = await fs.promises.readdir(parentFolderPath);
		const subfolders = await Promise.all(
			files.map(async file => {
				const filePath = path.join(parentFolderPath, file);
				const stats = await fs.promises.stat(filePath);
				return stats.isDirectory() ? filePath : null;
			}),
		);
		return subfolders.filter(Boolean) as string[];
	}

	// Add the following lines after reading the template content and before filling the template with user input
	const testsRootFolder = config.get<string>('testsRootFolder')?.replace('${workspaceFolder}', vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : '') || (vscode.workspace.workspaceFolders ? path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'tests') : '');
	const availableFolders = [testsRootFolder, ...(await getSubfolders(testsRootFolder))];
	const relativeFolders = availableFolders.map(folder => path.relative(workspaceFolder, folder));
	let selectedFolder = testsRootFolder;

	if (availableFolders.length > 1) {
		const folderChoice = await vscode.window.showQuickPick(relativeFolders, {placeHolder: 'Where to save the flow?'});
		if (!folderChoice) {
			vscode.window.showErrorMessage('No folder selected.');
			return;
		}

		selectedFolder = path.join(workspaceFolder, folderChoice);
	} else {
		selectedFolder = testsRootFolder;
	}

	if (!selectedFolder) {
		vscode.window.showErrorMessage('No folder selected.');
		return;
	}

	const inputFileName = await vscode.window.showInputBox({prompt: 'Enter filename', placeHolder: 'filename'});
	if (!inputFileName) {
		vscode.window.showErrorMessage('No filename entered.');
		return;
	}

	const formattedFileName = formatFilename(inputFileName);
	const newFlowPath = path.join(selectedFolder, formattedFileName);

	try {
		await fs.promises.writeFile(newFlowPath, newFlowContent);
		vscode.window.showInformationMessage('Flow file created successfully');

		const document = await vscode.workspace.openTextDocument(newFlowPath);
		await vscode.window.showTextDocument(document);
	} catch (err) {
		const errorMessage = (err as Error).message;

		vscode.window.showErrorMessage(`Error: ${errorMessage}`);
	}
}
