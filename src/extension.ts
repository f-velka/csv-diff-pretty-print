import * as vscode from 'vscode';
import * as path from 'path';
import { File } from './file';
import { calcValueWidth } from './utils';
import { parseCsv } from './parser';
import { getPrinter, PrettyPrinter } from './printer';
import { FormatType, HeaderLocation, Options } from './options';
import { getTextWriter } from './textWriter';

// constants
const DIFF_SCHEME = 'csv-pretty-diff';
const CSV_DIFF_EXT = '.pretty';

class PrettyDiffProvider implements vscode.TextDocumentContentProvider {
	// Uri.path => text
	_texts = new Map<string, string>();

	// emitter and its event
	onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
	onDidChange = this.onDidChangeEmitter.event;

	provideTextDocumentContent(uri: vscode.Uri): string {
		return this._texts.get(uri.path) ?? '';
	}

	registerFiles(fileA: File, fileB: File, options: Options, printer: PrettyPrinter): [vscode.Uri, vscode.Uri] {
		const mergedWidths = this.mergeMaxWidths(fileA, fileB);
		const uriA = this.registerFile(fileA, mergedWidths, options, printer);
		const uriB = this.registerFile(fileB, mergedWidths, options, printer);
		return [uriA, uriB];
	}

	private calcMaxValueWidths(file: File): number[] {
		const maxWidths = new Array<number>(file.columnCount).fill(0);
		for (const record of file.records) {
			for (const [index, value] of record.entries()) {
				const valueWidth = calcValueWidth(value);
				if (valueWidth > maxWidths[index]) {
					maxWidths[index] = valueWidth;
				}
			}
		}

		return maxWidths;
	}

	private mergeMaxWidths(fileA: File, fileB: File): number[] {
		const a = this.calcMaxValueWidths(fileA);
		const b = this.calcMaxValueWidths(fileB);
		const [longer, shorter] = a.length > b.length ? [a, b] : [b, a];
		return longer.map((w, i) => {
			if (i >= shorter.length) {
				return w;
			}
			return w > shorter[i] ? w : shorter[i];
		});
	}

	private registerFile(file: File, maxWidths: number[], options: Options, printer: PrettyPrinter): vscode.Uri {
		const writer = getTextWriter();
		printer.print(file, maxWidths, options, writer);

		const uri = vscode.Uri.parse(`${DIFF_SCHEME}: ${file.fileName}${CSV_DIFF_EXT}`);
		this._texts.set(uri.path, writer.toString());

		return uri;
	}
};

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

export function activate(context: vscode.ExtensionContext) {
	// register the custom provider
	const diffProvider = new PrettyDiffProvider();
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(DIFF_SCHEME, diffProvider));

	// register diff command
	let disposable = vscode.commands.registerCommand('csv-diff-pretty-print.diffOpenedTwoFiles', async () => {
		const editors = vscode.window.visibleTextEditors.filter(e => e.document.uri.scheme === 'file');
		if (editors.length <= 1) {
			vscode.window.showErrorMessage("No documents to compare.");
			return;
		}

		// select first two editors
		const [editorA, editorB] = [...editors];
		const options = getOptions();
		const fileA = await parseCsv(editorA.document.fileName, editorA.document.getText(), options);
		const fileB = await parseCsv(editorB.document.fileName, editorB.document.getText(), options);
		const [uriA, uriB] = diffProvider.registerFiles(fileA, fileB, options, getPrinter(options));

		const title = `${path.basename(fileA.fileName)}${CSV_DIFF_EXT} ⇔ ${path.basename(fileB.fileName)}${CSV_DIFF_EXT}`;
		vscode.commands.executeCommand('vscode.diff', uriA, uriB, title);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
}
