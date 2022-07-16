/**
 * Source file.
 */
export class File {
	private _fileName: string;
	private _delimiter: string;
	private _precedings: string[];
	private _records: string[][];

	get fileName(): string {
		return this._fileName;
	}

	get delimiter(): string {
		return this._delimiter;
	}

	get precedings(): string[] {
		return this._precedings;
	}

	get records(): string[][] {
		return this._records;
	}

	get firstRow(): string[] {
		return this._records[0] ?? [];
	}

	get columnCount(): number {
		return this._records[0]?.length ?? 0;
	}

	get rowCount(): number {
		return this._records.length;
	}

	constructor(fileName: string, delimiter: string, records: string[][], precedings: string[]) {
		this._fileName = fileName;
		this._delimiter = delimiter;
		this._records = records;
		this._precedings = precedings;
	}
}