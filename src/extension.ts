import * as vscode from 'vscode';
import * as path from 'path';
import { parse } from './parser';
import { getPrinter } from './printer';
import { FormatType, HeaderLocation, Options } from './options';
import { PrettyDiffProvider } from './prettyDiffProvider';

export function activate(context: vscode.ExtensionContext) {
	// register the custom provider
	const diffProvider = new PrettyDiffProvider();
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(PrettyDiffProvider.diffScheme, diffProvider));

	// register diff commands
	context.subscriptions.push(
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentTwoFiles.csv', async () => {
			await executeDiffCommandFromEditors(diffProvider, ',');
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentTwoFiles.tsv', async () => {
			await executeDiffCommandFromEditors(diffProvider, '\t');
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentTwoFiles.psv', async () => {
			await executeDiffCommandFromEditors(diffProvider, '|');
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentTwoFiles.others', async () => {
			const input = await showDelimiterInputDialog();
			if (!input) {
				return;
			}
			await executeDiffCommandFromEditors(diffProvider, input);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentWith.csv', async () => {
			executeDiffCommandWithOpen(diffProvider, ',');
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentWith.tsv', async () => {
			executeDiffCommandWithOpen(diffProvider, '\t');
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentWith.psv', async () => {
			executeDiffCommandWithOpen(diffProvider, '|');
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('csv-diff-pretty-print.compareCurrentWith.others', async () => {
			const input = await showDelimiterInputDialog();
			if (!input) {
				return;
			}
			executeDiffCommandWithOpen(diffProvider, input);
		})
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

async function executeDiffCommandFromEditors(provider: PrettyDiffProvider, delimiter: string) {
	const editors = vscode.window.visibleTextEditors.filter(e => e.document.uri.scheme === 'file');
	if (editors.length <= 1) {
		vscode.window.showErrorMessage("No documents to compare.");
		return;
	}

	// select first two editors
	const [editorA, editorB] = [...editors];

	executeDiffCommands(
		provider, delimiter,
		[editorA.document.fileName, editorB.document.fileName],
		[editorA.document.getText(), editorB.document.getText()]);
}

async function executeDiffCommandWithOpen(provider: PrettyDiffProvider, delimiter: string) {
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

	executeDiffCommands(
		provider, delimiter,
		[currentEditor.document.fileName, anotherDoc.fileName],
		[currentEditor.document.getText(), anotherDoc.getText()]);
}

async function executeDiffCommands(provider: PrettyDiffProvider, delimiter: string,
	[fileNameA, fileNameB]: string[], [textA, textB]: string[]) {
	const options = getOptions();
	const fileA = await parse(fileNameA, textA, delimiter, options);
	const fileB = await parse(fileNameB, textB, delimiter, options);
	const [uriA, uriB] = provider.registerFiles(fileA, fileB, options, getPrinter(options));

	const title = `${path.basename(fileA.fileName)}${PrettyDiffProvider.diffExtension} ⇔ ${path.basename(fileB.fileName)}${PrettyDiffProvider.diffExtension}`;
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