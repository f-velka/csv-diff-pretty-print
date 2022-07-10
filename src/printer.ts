import { File } from './file';
import { Options } from './options';
import { TextWriter } from './textWriter';
import { calcValueWidth } from './utils';

function formatCell(value: string, width: number, rowidth: number): string {
	return 	`${value}${' '.repeat(rowidth - width)}`;
}

function formatCells(values: string[], maxWidths: number[]): string[] {
	return values.map((v, i) => formatCell(v, calcValueWidth(v), maxWidths[i]));
}

function makeBlankCells(file: File, maxWidths: number[]): string[] {
	const ret: string[] = [];
	for (let i = file.columnCount; i < maxWidths.length; i++) {
		ret.push(formatCell('', 0, maxWidths[i]));
	}
	return ret;
}

export interface PrettyPrinter {
	print(file: File, maxWidths: number[], options: Options, writer: TextWriter): void;
}

class GridPrinter implements PrettyPrinter {
	print(file: File, maxWidths: number[], options: Options, writer: TextWriter): void {
		const hGridLine = `+-${maxWidths.map(w => '-'.repeat(w)).join('-+-')}-+`;
		const blankCells = makeBlankCells(file, maxWidths);

		for (const preceding of file.precedings) {
			writer.writeLine(preceding);
		}

		writer.writeLine(hGridLine);
		if (options.headerLocation === 'FirstRow' || options.headerLocation === 'Implicit') {
			const headerRow = options.headerLocation === 'FirstRow' ?
				file.firstRow : file.firstRow.map((_, i) => String(i));
			const cells = formatCells(headerRow, maxWidths).concat(blankCells);
			writer.writeLine(`| ${cells.join(' | ')} |`);
			writer.writeLine(hGridLine);
		}

		let rowIndex = options.headerLocation === 'FirstRow' ? 1 : 0;
		for (; rowIndex < file.rowCount; rowIndex++) {
			const row = file.records[rowIndex];
			const cells = formatCells(row, maxWidths).concat(blankCells);
			writer.writeLine(`| ${cells.join(' | ')} |`);
			if (options.insertLineBetweenRows) {
				writer.writeLine(hGridLine);
			}
		}

		if (!options.insertLineBetweenRows) {
			writer.writeLine(hGridLine);
		}
	}
}

class SimplePrinter implements PrettyPrinter {
	print(file: File, maxWidths: number[], options: Options, writer: TextWriter): void {
		for (const preceding of file.precedings) {
			writer.writeLine(preceding);
		}

		if (options.headerLocation === 'FirstRow' || options.headerLocation === 'Implicit') {
			const headerRow = options.headerLocation === 'FirstRow' ?
				file.firstRow : file.firstRow.map((_, i) => String(i));
			const cells = formatCells(headerRow, maxWidths);
			writer.writeLine(` ${cells.join('   ')}`);
			// blank cells are literally blank in this mode.
			// so we can cut them off.
			writer.writeLine(maxWidths.slice(0, file.columnCount).map(w => '-'.repeat(w + 2)).join(' '));
		}

		let rowIndex = options.headerLocation === 'FirstRow' ? 1 : 0;
		for (; rowIndex < file.rowCount; rowIndex++) {
			const row = file.records[rowIndex];
			const cells = formatCells(row, maxWidths);
			writer.writeLine(` ${cells.join('   ').trimEnd()}`);
			if (options.insertLineBetweenRows) {
				writer.writeLine();
			}
		}
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