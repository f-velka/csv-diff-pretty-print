import { CsvError, parse as csv_parse, Options as ParseOptions } from 'csv-parse';
import { File as File } from './file';

const REG_NEW_LINE = /\n|\r\n|\r/;

export interface Parser {
	/**
	* Parse an input and create a {@link File} instance.
	* @param filename Input file name.
	* @param input Input file text.
	* @returns Parsed file.
	*/
	parse(filename: string, input: string): Promise<File>;
}

class ParserImpl implements Parser {
	private _delimiter: string;

	constructor(delimiter: string) {
		this._delimiter = delimiter;
	}

	async parse(fileName: string, input: string): Promise<File> {
		const parseOptions: ParseOptions = {
			delimiter: this._delimiter,
		};

		let precedings = [];
		let remains = input;
		while (remains) {
			try {
				const records: string[][] = [];
				const parser = csv_parse(remains, parseOptions);
				for await (const record of parser) {
					records.push(record);
				}
				return new File(fileName, this._delimiter, records, precedings);
			} catch (e) {
				if (e instanceof CsvError && e.code === 'CSV_RECORD_INCONSISTENT_FIELDS_LENGTH') {
					// try to skip preceding non-csv lines before csv rows
					const newLineIndex = remains.search(REG_NEW_LINE);
					if (newLineIndex < 0) {
						break;
					}
					precedings.push(remains.substring(0, newLineIndex));
					remains = remains.substring(newLineIndex + 1);
				} else {
					// unexpected error
					throw e;
				}
			}
		}

		return new File(fileName, this._delimiter, [], precedings);
	}

}

/**
 * Get a suitable parser instance.
 * @param delimiter Delimiter.
 * @returns Parser.
 */
export function getParser(delimiter: string): Parser {
	return new ParserImpl(delimiter);
}