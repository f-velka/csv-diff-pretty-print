import { File } from './file';
import { Options } from './options';
import { TextWriter } from './textWriter';
import { calcValueWidth } from './utils';

export interface PrettyPrinter {
	print(file: File, maxWidths: number[], options: Options, writer: TextWriter): void;
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
	print(file: File, maxWidths: number[], options: Options, writer: TextWriter): void {
		this.initialize(file, maxWidths, options, writer);

		for (const preceding of file.precedings) {
			writer.writeLine(preceding);
		}

		this.printHeader(file, maxWidths, options, writer);
		// writer.writeLine(hGridLine);
		if (options.headerLocation === 'FirstRow' || options.headerLocation === 'Implicit') {
			const headerRow = options.headerLocation === 'FirstRow' ?
				file.firstRow : file.firstRow.map((_, i) => String(i));
			this.printHeaderRow(file, maxWidths, options, writer, headerRow);
		}

		let rowIndex = options.headerLocation === 'FirstRow' ? 1 : 0;
		for (; rowIndex < file.rowCount; rowIndex++) {
			this.printDataRow(file, maxWidths, options, writer, rowIndex);
		}

		this.printFooter(file, maxWidths, options, writer);
	}

	protected abstract initialize(file: File, maxWidths: number[], options: Options, writer: TextWriter): void;
	protected abstract printHeader(file: File, maxWidths: number[], options: Options, writer: TextWriter): void;
	protected abstract printHeaderRow(file: File, maxWidths: number[], options: Options, writer: TextWriter, headerRow: string[]): void;
	protected abstract printDataRow(file: File, maxWidths: number[], options: Options, writer: TextWriter, rowIndex: number): void;
	protected abstract printFooter(file: File, maxWidths: number[], options: Options, writer: TextWriter): void;

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
	private _horizontalGridLine: string = '';
	private _blankCells: string[] = [];

	protected initialize(file: File, maxWidths: number[], options: Options, writer: TextWriter): void {
		this._horizontalGridLine = `+-${maxWidths.map(w => '-'.repeat(w)).join('-+-')}-+`;
		this._blankCells = this.makeBlankCells(file, maxWidths);
	}

	protected printHeader(file: File, maxWidths: number[], options: Options, writer: TextWriter): void {
		writer.writeLine(this._horizontalGridLine);
	}

	protected printHeaderRow(file: File, maxWidths: number[], options: Options, writer: TextWriter, headerRow: string[]): void {
		const cells = this.formatCells(headerRow, maxWidths).concat(this._blankCells);
		writer.writeLine(`| ${cells.join(' | ')} |`);
		writer.writeLine(this._horizontalGridLine);
	}

	protected printDataRow(file: File, maxWidths: number[], options: Options, writer: TextWriter, rowIndex: number): void {
		const row = file.records[rowIndex];
		const cells = this.formatCells(row, maxWidths).concat(this._blankCells);
		writer.writeLine(`| ${cells.join(' | ')} |`);
		if (options.insertLineBetweenRows) {
			writer.writeLine(this._horizontalGridLine);
		}
	}

	protected printFooter(file: File, maxWidths: number[], options: Options, writer: TextWriter): void {
		if (!options.insertLineBetweenRows) {
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
	protected initialize(file: File, maxWidths: number[], options: Options, writer: TextWriter): void {
	}

	protected printHeader(file: File, maxWidths: number[], options: Options, writer: TextWriter): void {
	}

	protected printHeaderRow(file: File, maxWidths: number[], options: Options, writer: TextWriter, headerRow: string[]): void {
		const cells = this.formatCells(headerRow, maxWidths);
		writer.writeLine(` ${cells.join('   ').trimEnd()}`);
		// blank cells are literally blank in this mode.
		// so we can cut them off.
		writer.writeLine(maxWidths.slice(0, file.columnCount).map(w => '-'.repeat(w + 2)).join(' '));
	}

	protected printDataRow(file: File, maxWidths: number[], options: Options, writer: TextWriter, rowIndex: number): void {
		const row = file.records[rowIndex];
		const cells = this.formatCells(row, maxWidths);
		writer.writeLine(` ${cells.join('   ').trimEnd()}`);
		if (options.insertLineBetweenRows) {
			writer.writeLine();
		}
	}

	protected printFooter(file: File, maxWidths: number[], options: Options, writer: TextWriter): void {
	}
}

export function getPrinter(options: Options): PrettyPrinter {
	switch (options.formatType) {
		case 'Grid':
			return new GridPrinter();
		case 'Simple':
			return new SimplePrinter();
	}
}