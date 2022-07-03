import { CsvError, Options as ParseOptions, parse } from 'csv-parse';
import { File as File } from './file';
import { Options } from './options';

const REG_NEW_LINE = /\n|\r\n|\r/;

export async function parseCsv(filename: string, input: string, options: Options): Promise<File> {
	let precedings = [];
	let remains = input;
	while (remains) {
		try {
			const records: string[][] = [];
			const parser = parse(remains);
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