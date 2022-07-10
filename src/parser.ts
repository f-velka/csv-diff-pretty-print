import { CsvError, parse as csv_parse, Options as ParseOptions } from 'csv-parse';
import { File as File } from './file';
import { Options } from './options';

const REG_NEW_LINE = /\n|\r\n|\r/;

export async function parse(filename: string, input: string, delimiter: string, options: Options): Promise<File> {
	const parseOptions: ParseOptions = {
		delimiter: delimiter,
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
			return new File(filename, records, precedings);
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

	throw new Error('no parsable records');
}