import * as assert from 'assert';
import { File } from '../../file';
import { FormatType, HeaderLocation, Options } from '../../options';
import { getParser } from '../../parser';
import { getPrinter } from '../../printer';
import { getTextWriter } from '../../textWriter';
import { calcCommonMaxValueWidths } from '../../util';
import { getOptions } from './helper';

suite('Printer Test Suite', async () => {
	// expected widths:
	// 3, 3, 3, 8
	const inputA =
`\
a,bb,ccc,ああああ
1,"22",333,いいい
4,"55",666,うう
`;
	const inputB =
`\
aaa,bb,c
111,"22",3
444,"55",6
`;

	// test all combinations
	const params: {
		formatType: FormatType;
		insertLineBetweenRows: boolean;
		headerLocation: HeaderLocation;
		expected: { a: string, b: string };
	}[] = [
		{
			formatType: 'Grid',
			insertLineBetweenRows: true,
			headerLocation: 'None',
			expected: {
				a:
`\
+-----+----+-----+----------+
| a   | bb | ccc | ああああ |
+-----+----+-----+----------+
| 1   | 22 | 333 | いいい   |
+-----+----+-----+----------+
| 4   | 55 | 666 | うう     |
+-----+----+-----+----------+
`,
				b:
`\
+-----+----+-----+----------+
| aaa | bb | c   |          |
+-----+----+-----+----------+
| 111 | 22 | 3   |          |
+-----+----+-----+----------+
| 444 | 55 | 6   |          |
+-----+----+-----+----------+
`,
			}
		},
		{
			formatType: 'Grid',
			insertLineBetweenRows: true,
			headerLocation: 'FirstRow',
			expected: {
				a:
`\
+-----+----+-----+----------+
| a   | bb | ccc | ああああ |
+-----+----+-----+----------+
| 1   | 22 | 333 | いいい   |
+-----+----+-----+----------+
| 4   | 55 | 666 | うう     |
+-----+----+-----+----------+
`,
				b:
`\
+-----+----+-----+----------+
| aaa | bb | c   |          |
+-----+----+-----+----------+
| 111 | 22 | 3   |          |
+-----+----+-----+----------+
| 444 | 55 | 6   |          |
+-----+----+-----+----------+
`,
			}
		},
		{
			formatType: 'Grid',
			insertLineBetweenRows: true,
			headerLocation: 'Implicit',
			expected: {
				a:
`\
+-----+----+-----+----------+
| 1   | 2  | 3   | 4        |
+-----+----+-----+----------+
| a   | bb | ccc | ああああ |
+-----+----+-----+----------+
| 1   | 22 | 333 | いいい   |
+-----+----+-----+----------+
| 4   | 55 | 666 | うう     |
+-----+----+-----+----------+
`,
				b:
`\
+-----+----+-----+----------+
| 1   | 2  | 3   | 4        |
+-----+----+-----+----------+
| aaa | bb | c   |          |
+-----+----+-----+----------+
| 111 | 22 | 3   |          |
+-----+----+-----+----------+
| 444 | 55 | 6   |          |
+-----+----+-----+----------+
`,
			}
		},
		{
			formatType: 'Grid',
			insertLineBetweenRows: false,
			headerLocation: 'None',
			expected: {
				a:
`\
+-----+----+-----+----------+
| a   | bb | ccc | ああああ |
| 1   | 22 | 333 | いいい   |
| 4   | 55 | 666 | うう     |
+-----+----+-----+----------+
`,
				b:
`\
+-----+----+-----+----------+
| aaa | bb | c   |          |
| 111 | 22 | 3   |          |
| 444 | 55 | 6   |          |
+-----+----+-----+----------+
`,
			}
		},
		{
			formatType: 'Grid',
			insertLineBetweenRows: false,
			headerLocation: 'FirstRow',
			expected: {
				a:
`\
+-----+----+-----+----------+
| a   | bb | ccc | ああああ |
+-----+----+-----+----------+
| 1   | 22 | 333 | いいい   |
| 4   | 55 | 666 | うう     |
+-----+----+-----+----------+
`,
				b:
`\
+-----+----+-----+----------+
| aaa | bb | c   |          |
+-----+----+-----+----------+
| 111 | 22 | 3   |          |
| 444 | 55 | 6   |          |
+-----+----+-----+----------+
`,
			}
		},
		{
			formatType: 'Grid',
			insertLineBetweenRows: false,
			headerLocation: 'Implicit',
			expected: {
				a:
`\
+-----+----+-----+----------+
| 1   | 2  | 3   | 4        |
+-----+----+-----+----------+
| a   | bb | ccc | ああああ |
| 1   | 22 | 333 | いいい   |
| 4   | 55 | 666 | うう     |
+-----+----+-----+----------+
`,
				b:
`\
+-----+----+-----+----------+
| 1   | 2  | 3   | 4        |
+-----+----+-----+----------+
| aaa | bb | c   |          |
| 111 | 22 | 3   |          |
| 444 | 55 | 6   |          |
+-----+----+-----+----------+
`,
			}
		},
		{
			formatType: 'Simple',
			insertLineBetweenRows: true,
			headerLocation: 'None',
			expected: {
				a:
`\
 a     bb   ccc   ああああ

 1     22   333   いいい

 4     55   666   うう
`,
				b:
`\
 aaa   bb   c

 111   22   3

 444   55   6
`,
			}
		},
		{
			formatType: 'Simple',
			insertLineBetweenRows: true,
			headerLocation: 'FirstRow',
			expected: {
				a:
`\
 a     bb   ccc   ああああ
----- ---- ----- ----------
 1     22   333   いいい

 4     55   666   うう
`,
				b:
`\
 aaa   bb   c
----- ---- -----
 111   22   3

 444   55   6
`,
			}
		},
		{
			formatType: 'Simple',
			insertLineBetweenRows: true,
			headerLocation: 'Implicit',
			expected: {
				a:
`\
 1     2    3     4
----- ---- ----- ----------
 a     bb   ccc   ああああ

 1     22   333   いいい

 4     55   666   うう
`,
				b:
`\
 1     2    3
----- ---- -----
 aaa   bb   c

 111   22   3

 444   55   6
`,
			}
		},
		{
			formatType: 'Simple',
			insertLineBetweenRows: false,
			headerLocation: 'None',
			expected: {
				a:
`\
 a     bb   ccc   ああああ
 1     22   333   いいい
 4     55   666   うう
`,
				b:
`\
 aaa   bb   c
 111   22   3
 444   55   6
`,
			}
		},
		{
			formatType: 'Simple',
			insertLineBetweenRows: false,
			headerLocation: 'FirstRow',
			expected: {
				a:
`\
 a     bb   ccc   ああああ
----- ---- ----- ----------
 1     22   333   いいい
 4     55   666   うう
`,
				b:
`\
 aaa   bb   c
----- ---- -----
 111   22   3
 444   55   6
`,
			}
		},
		{
			formatType: 'Simple',
			insertLineBetweenRows: false,
			headerLocation: 'Implicit',
			expected: {
				a:
`\
 1     2    3     4
----- ---- ----- ----------
 a     bb   ccc   ああああ
 1     22   333   いいい
 4     55   666   うう
`,
				b:
`\
 1     2    3
----- ---- -----
 aaa   bb   c
 111   22   3
 444   55   6
`,
			}
		},
	];

	const parser = getParser(',');
	const fileA = await parser.parse('a', inputA);
	const fileB = await parser.parse('b', inputB);
	const maxWidths = calcCommonMaxValueWidths(fileA, fileB);

	for (const param of params) {
		test(`Test formatType: ${param.formatType}, insertLineBetweenRows: ${param.insertLineBetweenRows}, headerLocation: ${param.headerLocation}`, () => {
			const options = getOptions(param.formatType, param.insertLineBetweenRows, param.headerLocation, true);
			const printer = getPrinter(options);

			const files: [File, string][] = [[fileA, param.expected.a], [fileB, param.expected.b]];
			for (const [file, expected] of files) {
				const writer = getTextWriter();
				printer.print(file, maxWidths, writer);
				assert.strictEqual(writer.toString(), expected);
			}
		});
	}
});