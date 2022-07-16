import * as randomstring from 'randomstring';

// cache
const valueWidthCache = new Map<string, number>();

/**
 * Calculate value's width.
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