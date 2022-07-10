import * as vscode from 'vscode';
import { File } from './file';
import { calcValueWidth } from './utils';
import { PrettyPrinter } from './printer';
import { Options } from './options';
import { getTextWriter } from './textWriter';

export class PrettyDiffProvider implements vscode.TextDocumentContentProvider {
	// constants
	static readonly diffScheme = 'csv-pretty-diff';
	static readonly diffExtension = '.pretty';

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

		const uri = vscode.Uri.parse(`${PrettyDiffProvider.diffScheme}: ${file.fileName}${PrettyDiffProvider.diffExtension}`);
		this._texts.set(uri.path, writer.toString());

		return uri;
	}
}
