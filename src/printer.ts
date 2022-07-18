import { File } from './file';
import { HeaderLocation, Options } from './options';
import { TextWriter } from './textWriter';
import { calcValueWidth } from './util';

/**
 * Printer that outputs pretty-printed file input.
 */
export interface PrettyPrinter {
	/**
	 * Pretty-print input file.
	 * @param file Input file to print.
	 * @param maxWidths Merged max column widths (largest values in all input files).
	 * @param writer Output text writer.
	 */
	print(file: File, maxWidths: number[], writer: TextWriter): void;
}

/**
 * Base class for pretty printer implementations.
 *
 * For example, in {@link GridPrinter}, abstract methods have responsibilities to
 * print the parts as below.
 *
 * +----+----+----+----+ <= printHeader()
 * | a  | b  | c  | d  | <= printHeaderRow()
 * +----+----+----+----+ <= printHeaderRow()
 * | 1  | 2  | 3  | 4  | <= printDataRow()
 * | 11 | 12 | 13 | 14 | <= printDataRow()
 * +----+----+----+----+ <= printFooter()
 *
 */
abstract class PrinterBase implements PrettyPrinter {
	protected _headerLocation: HeaderLocation;
	protected _insertLineBetweenRows: boolean;


	constructor(options: Options) {
		this._headerLocation = options.headerLocation;
		this._insertLineBetweenRows = options.insertLineBetweenRows;
	}

	print(file: File, maxWidths: number[], writer: TextWriter): void {
		this.initialize(file, maxWidths, writer);

		for (const preceding of file.precedings) {
			writer.writeLine(preceding);
		}

		this.printHeader(file, maxWidths, writer);

		if (this._headerLocation === 'FirstRow' || this._headerLocation === 'Implicit') {
			const headerRow = this._headerLocation === 'FirstRow' ?
				file.firstRow : maxWidths.map((_, i) => String(i + 1));
			this.printHeaderRow(headerRow, file, maxWidths, writer);
		}

		let rowIndex = this._headerLocation === 'FirstRow' ? 1 : 0;
		for (; rowIndex < file.rowCount; rowIndex++) {
			this.printDataRow(rowIndex, file.records[rowIndex], file, maxWidths, writer);
		}

		this.printFooter(file, maxWidths, writer);
	}

	protected abstract initialize(file: File, maxWidths: number[], writer: TextWriter): void;
	protected abstract printHeader(file: File, maxWidths: number[], writer: TextWriter): void;
	protected abstract printHeaderRow(headerRow: string[], file: File, maxWidths: number[], writer: TextWriter): void;
	protected abstract printDataRow(rowIndex: number, row: string[], file: File, maxWidths: number[], writer: TextWriter): void;
	protected abstract printFooter(file: File, maxWidths: number[], writer: TextWriter): void;

	protected formatCell(value: string, width: number, rowidth: number): string {
		return 	`${value}${' '.repeat(rowidth - width)}`;
	}

	protected formatCells(values: string[], maxWidths: number[]): string[] {
		return values.map((v, i) => this.formatCell(v, calcValueWidth(v), maxWidths[i]));
	}
}

/**
 * Pretty-printer implementation that prints records as below.
 *
 * +----+----+----+----+
 * | a  | b  | c  | d  |
 * +----+----+----+----+
 * | 1  | 2  | 3  | 4  |
 * | 11 | 12 | 13 | 14 |
 * +----+----+----+----+
 */
class GridPrinter extends PrinterBase {
	// +----+----+----+----+ <- this
	private _horizontalGridLine: string = '';
	// cells that have no data
	private _blankCells: string[] = [];

	protected initialize(file: File, maxWidths: number[], writer: TextWriter): void {
		this._horizontalGridLine = `+-${maxWidths.map(w => '-'.repeat(w)).join('-+-')}-+`;
		this._blankCells = this.makeBlankCells(file, maxWidths);
	}

	protected printHeader(file: File, maxWidths: number[], writer: TextWriter): void {
		writer.writeLine(this._horizontalGridLine);
	}

	protected printHeaderRow(headerRow: string[], file: File, maxWidths: number[], writer: TextWriter): void {
		const cells = (() => {
			switch (this._headerLocation) {
				case 'FirstRow':
					return this.formatCells(headerRow, maxWidths).concat(this._blankCells);
				case 'Implicit':
					return this.formatCells(headerRow, maxWidths);
				default:
					throw new Error('invalid operation');
			}
		})();

		writer.writeLine(`| ${cells.join(' | ')} |`);
		writer.writeLine(this._horizontalGridLine);
	}

	protected printDataRow(rowIndex: number, row: string[], file: File, maxWidths: number[], writer: TextWriter): void {
		const cells = this.formatCells(row, maxWidths).concat(this._blankCells);
		writer.writeLine(`| ${cells.join(' | ')} |`);
		if (this._insertLineBetweenRows) {
			writer.writeLine(this._horizontalGridLine);
		}
	}

	protected printFooter(file: File, maxWidths: number[], writer: TextWriter): void {
		if (!this._insertLineBetweenRows) {
			writer.writeLine(this._horizontalGridLine);
		}
	}

	private makeBlankCells(file: File, maxWidths: number[]): string[] {
		const ret: string[] = [];
		for (let i = file.columnCount; i < maxWidths.length; i++) {
			ret.push(this.formatCell('', 0, maxWidths[i]));
		}
		return ret;
	}
}

/**
 * Pretty-printer implementation that prints records as below.
 *
 *  a    b    c    d
 * ---- ---- ---- ----
 *  1    2    3    4
 *  11   12   13   14
 */
class SimplePrinter extends PrinterBase {
	protected initialize(file: File, maxWidths: number[], writer: TextWriter): void {
	}

	protected printHeader(file: File, maxWidths: number[], writer: TextWriter): void {
	}

	protected printHeaderRow(headerRow: string[], file: File, maxWidths: number[], writer: TextWriter): void {
		// Blank cells are literally blank in this mode.
		// So we need to cut them off.
		//
		// If the format type is "Implicit" and the column count of the compared file is bigger than this file's,
		// the header row contains extra columns that need to be removed.
		const slicedHeaderRow = headerRow.slice(0, file.columnCount);
		const slicedMaxWidth = maxWidths.slice(0, file.columnCount);

		const cells = this.formatCells(slicedHeaderRow, maxWidths);
		writer.writeLine(` ${cells.join('   ').trimEnd()}`);
		writer.writeLine(slicedMaxWidth.map(w => '-'.repeat(w + 2)).join(' '));
	}

	protected printDataRow(rowIndex: number, row: string[], file: File, maxWidths: number[], writer: TextWriter): void {
		const cells = this.formatCells(row, maxWidths);
		writer.writeLine(` ${cells.join('   ').trimEnd()}`);
		if (this._insertLineBetweenRows && rowIndex !== file.rowCount -1) {
			writer.writeLine();
		}
	}

	protected printFooter(file: File, maxWidths: number[], writer: TextWriter): void {
	}
}

/**
 * Get a suitable pretty-printer instance.
 * @param options Options.
 * @returns Pretty-printer.
 */
export function getPrinter(options: Options): PrettyPrinter {
	switch (options.formatType) {
		case 'Grid':
			return new GridPrinter(options);
		case 'Simple':
			return new SimplePrinter(options);
		default:
			throw new Error('invalid operation');
	}
}