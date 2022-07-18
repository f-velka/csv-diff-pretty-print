import * as vscode from 'vscode';
import { File } from './file';
import { calcCommonMaxValueWidths, generateId } from './util';
import { getPrinter, PrettyPrinter } from './printer';
import { Options } from './options';
import { getTextWriter } from './textWriter';
import { getParser, Parser } from './parser';

class PrettyPrintedDocument {
	uri: vscode.Uri;
	file: File;
	text: string;

	constructor(uri: vscode.Uri, file: File, text: string) {
		this.uri = uri;
		this.file = file;
		this.text = text;
	}
}

class DiffContext {
	private _firstDocument: PrettyPrintedDocument | null = null;
	private _secondDocument: PrettyPrintedDocument | null = null;
	private _parser: Parser;
	private _printer: PrettyPrinter;
	private _diffId: string = generateId();

	get firstDocument(): PrettyPrintedDocument {
		return this._firstDocument!;
	}

	get secondDocument(): PrettyPrintedDocument {
		return this._secondDocument!;
	}

	constructor(parser: Parser, printer: PrettyPrinter) {
		this._parser = parser;
		this._printer = printer;
	}

	async initializeDocuments(documentA: vscode.TextDocument, documentB: vscode.TextDocument) {
		const fileA = await this.createFile(documentA);
		const fileB = await this.createFile(documentB);
		this.updateDocumentsFromFiles(fileA, fileB);
	}

	contains(document: vscode.TextDocument): boolean {
		return this.firstDocument.uri.path === document.uri.path ||
			this.secondDocument.uri.path === document.uri.path;
	}

	async updateDocument(document: vscode.TextDocument): Promise<boolean> {
		let fileA, fileB: File;
		if (this.firstDocument.file.fileName === document.fileName) {
			fileA = await this.createFile(document);
			fileB = this.secondDocument.file;
		} else if (this.secondDocument.file.fileName === document.fileName) {
			fileA = this.firstDocument.file;
			fileB = await this.createFile(document);
		} else {
			return false;
		}

		this.updateDocumentsFromFiles(fileA, fileB);
		return true;
	}

	private async createFile(document: vscode.TextDocument): Promise<File> {
		return await this._parser.parse(document.fileName, document.getText());
	}

	private updateDocumentsFromFiles(fileA: File, fileB: File) {
		const maxWidths = calcCommonMaxValueWidths(fileA, fileB);
		this._firstDocument = this.createPrettyPrintedDocument(fileA, maxWidths);
		this._secondDocument = this.createPrettyPrintedDocument(fileB, maxWidths);
	}

	private createPrettyPrintedDocument(file: File, maxWidths: number[]): PrettyPrintedDocument {
		const writer = getTextWriter();
		this._printer.print(file, maxWidths, writer);
		const uri = vscode.Uri.parse(`${PrettyPrintProvider.diffScheme}: ${file.fileName}.${this._diffId}`);

		return new PrettyPrintedDocument(uri, file, writer.toString());
	}
}

/**
 * A text document content provider that provides pretty-printed diff results.
 */
export class PrettyPrintProvider implements vscode.TextDocumentContentProvider {
	static readonly diffScheme = 'csv-pretty-diff';
	private _contexts: DiffContext[] = [];
	private _onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
	onDidChange = this._onDidChangeEmitter.event;

	provideTextDocumentContent(uri: vscode.Uri): string {
		for (const context of this._contexts) {
			for (const doc of [context.firstDocument, context.secondDocument]) {
				if (doc.uri.path === uri.path) {
					return doc.text;
				}
			}
		}

		return '';
	}

	/**
	 * Register source documents to the provider.
	 * @param documentA First input document.
	 * @param documentB Second input document.
	 * @param delimiter Delimiter of input documents.
	 * @param options Options.
	 * @returns Uris of registered documents.
	 */
	async registerDocuments(documentA: vscode.TextDocument, documentB: vscode.TextDocument,
			delimiter: string, options: Options): Promise<[vscode.Uri, vscode.Uri]> {
		const context = new DiffContext(getParser(delimiter), getPrinter(options));
		await context.initializeDocuments(documentA, documentB);

		this._contexts.push(context);

		return [context.firstDocument.uri, context.secondDocument.uri];
	}

	/**
	 * Update stored pretty-printed document.
	 * @param document Changed {@link vscode.TextDocument}.
	 */
	async updateDocument(document: vscode.TextDocument) {
		for (const context of this._contexts) {
			if (await context.updateDocument(document)) {
				this._onDidChangeEmitter.fire(context.firstDocument.uri);
				this._onDidChangeEmitter.fire(context.secondDocument.uri);
			};
		}
	}

	/**
	 * Remove stored pretty-printed document.
	 * @param document Removed {@link vscode.TextDocument}.
	 */
	removeDocument(document: vscode.TextDocument) {
		this._contexts = this._contexts.filter(x => !x.contains(document));
	}
}
