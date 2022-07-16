import * as vscode from 'vscode';
import * as path from 'path';
import { FormatType, HeaderLocation, Options } from './options';
import { PrettyPrintProvider } from './prettyPrintProvider';

export function activate(context: vscode.ExtensionContext) {
	// register the custom provider
	const diffProvider = new PrettyPrintProvider();
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(PrettyPrintProvider.diffScheme, diffProvider));

	// register diff commands
	context.subscriptions.push(
		// compareCurrentTwoFiles
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentTwoFiles.csv', async () => {
			await executeDiffCommandFromEditors(diffProvider, ',');
		}),
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentTwoFiles.tsv', async () => {
			await executeDiffCommandFromEditors(diffProvider, '\t');
		}),
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentTwoFiles.psv', async () => {
			await executeDiffCommandFromEditors(diffProvider, '|');
		}),
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentTwoFiles.others', async () => {
			const input = await showDelimiterInputDialog();
			if (!input) {
				return;
			}
			await executeDiffCommandFromEditors(diffProvider, input);
		}),

		// compareCurrentWith
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentWith.csv', async () => {
			executeDiffCommandWithOpen(diffProvider, ',');
		}),
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentWith.tsv', async () => {
			executeDiffCommandWithOpen(diffProvider, '\t');
		}),
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentWith.psv', async () => {
			executeDiffCommandWithOpen(diffProvider, '|');
		}),
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentWith.others', async () => {
			const input = await showDelimiterInputDialog();
			if (!input) {
				return;
			}
			executeDiffCommandWithOpen(diffProvider, input);
		}),

		// events
		vscode.workspace.onDidChangeTextDocument(async e => await diffProvider.updateDocument(e.document)),
		vscode.workspace.onDidSaveTextDocument(async e => await diffProvider.updateDocument(e)),
		vscode.workspace.onDidCloseTextDocument(async e => diffProvider.removeDocument(e)),
	);
}

export function deactivate() {
}

async function showDelimiterInputDialog(): Promise<string | undefined> {
	return vscode.window.showInputBox({
		placeHolder: 'Input the delimiter to parse files...',
		validateInput: input => {
			if (!input) {
				return "Please input non-empty string value.";
			}
			return null;
		}
	});
}

async function executeDiffCommandFromEditors(provider: PrettyPrintProvider, delimiter: string) {
	const editors = vscode.window.visibleTextEditors.filter(e => e.document.uri.scheme === 'file');
	if (editors.length <= 1) {
		vscode.window.showErrorMessage("No documents to compare.");
		return;
	}

	// select first two editors
	const [editorA, editorB] = [...editors];

	executeDiffCommands(provider, delimiter, [editorA.document, editorB.document]);
}

async function executeDiffCommandWithOpen(provider: PrettyPrintProvider, delimiter: string) {
	const currentEditor = vscode.window.activeTextEditor;
	if (!currentEditor || currentEditor.document.uri.scheme !== 'file') {
		vscode.window.showErrorMessage("No documents to compare.");
		return;
	}

	// open existing file to compare
	const onotherUri = await vscode.window.showOpenDialog({
		title: `Compare ${currentEditor.document.fileName} with...`,
		canSelectFiles: true,
		canSelectFolders: false,
		canSelectMany: false,
	});
	if (!onotherUri || onotherUri.length === 0) {
		return;
	}
	const anotherDoc = await vscode.workspace.openTextDocument(onotherUri[0]);

	executeDiffCommands(provider, delimiter, [currentEditor.document, anotherDoc]);
}

async function executeDiffCommands(provider: PrettyPrintProvider, delimiter: string, [docA, docB]: vscode.TextDocument[]) {
	const [uriA, uriB] = await provider.registerDocuments(docA, docB, delimiter, getOptions());

	const title = `${path.basename(docA.fileName)}.pretty ⇔ ${path.basename(docB.fileName)}.pretty`;
	vscode.commands.executeCommand('vscode.diff', uriA, uriB, title);
}

function getOptions(): Options {
	const conf = vscode.workspace.getConfiguration();
	const getConf = <T> (path: string, defaultValue: T, invalidValues?: T[]) => {
		const value = conf.get<T>(`csvDiffPrettyPrint.${path}`, defaultValue);
		if (invalidValues?.includes(value)) {
			return defaultValue;
		} else {
			return value;
		}
	};
	return new class implements Options {
		formatType = getConf('format.formatType', 'grid' as FormatType);
		insertLineBetweenRows = getConf('format.insertLineBetweenRows', true);
		delimiter = getConf('parse.delimiter', ',', ['']);
		headerLocation = getConf('parse.headerLocation', 'FirstRow' as HeaderLocation);
	};
}