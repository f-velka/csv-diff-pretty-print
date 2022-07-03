// cache
const valueWidthCache = new Map<string, number>();

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