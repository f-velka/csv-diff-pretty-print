export interface TextWriter {
	write(text: string): void;
	writeLine(line?: string): void;
	toString(): string;
}

class TextWriterImpl implements TextWriter {
	private _text = '';

	write(text: string): void {
		this._text += text;
	}

	writeLine(line?: string): void {
		if (line) {
			this._text += line;
		}
		this._text += '\n';
	}

	toString(): string {
		return this._text;
	}

	private check(succeeded: boolean) {
		if (!succeeded) {
			throw new Error('failed to write texts.');
		}
	}
}

export function getTextWriter(): TextWriter {
	return new TextWriterImpl();
}