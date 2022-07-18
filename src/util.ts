import * as randomstring from 'randomstring';
import { File } from './file';

// cache
const valueWidthCache = new Map<string, number>();

/**
 * Calculate the max value widths of each rows in each files and merge them.
 * @param fileA First input.
 * @param fileB Second input.
 * @returns Calculated value widths.
 */
export function calcCommonMaxValueWidths(fileA: File, fileB: File): number[] {
	const a = calcMaxValueWidths(fileA);
	const b = calcMaxValueWidths(fileB);
	const [longer, shorter] = a.length > b.length ? [a, b] : [b, a];
	return longer.map((w, i) => {
		if (i >= shorter.length) {
			return w;
		}
		return w > shorter[i] ? w : shorter[i];
	});
}

/**
 * Calculate the max value widths of each rows in a file.
 * @param file Input.
 * @returns Calculated value widths.
 */
export function calcMaxValueWidths(file: File): number[] {
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

/**
 * Calculate value width.
 *
 * XXX:
 * Rendered character widths depend on the fonts users are using,
 * so this function would not work well in some situations.
 * But I have no idea how to deal with it.
 * @param value Input text value.
 * @returns Calculated text width.
 */
export function calcValueWidth(value: string): number {
	const cached = valueWidthCache.get(value);
	if (cached !== undefined) {
		return cached;
	}

	let width = 0;
	for (const c of value) {
		// treat ascii characters as width:1
		if (c.codePointAt(0)! <= 127) {
			width += 1;
		}
		// otherwise, it might be width:2
		else {
			width += 2;
		}
	}

	valueWidthCache.set(value, width);
	return width;
}

/**
 * Generate 8 length string id.
 * @returns id
 */
export function generateId(): string {
	return randomstring.generate(8);
}