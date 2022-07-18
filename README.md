# CSV Diff Pretty Print Extension

## Features

Format CSV/TSV/PSV files and compare them using vscode diff.

### Usage

1. Open the files that you want to compare. Use vscode diff tool (e.g. `code -d`) or just line up two files by splitting the editor.
2. Execute `CSV Diff: Compare Current Two Files`.

![usage](https://raw.githubusercontent.com/f-velka/csv-diff-pretty-print/main/images/extension.gif)

You can also compare an single active file with another file by `CSV Diff: Compare Current With...` command.

## Extension Commands

If you select `(Other Formats)`, you can specify an onother delimiter.

* `CSV Diff: Compare Current Two Files (CSV)`
* `CSV Diff: Compare Current Two Files (TSV)`
* `CSV Diff: Compare Current Two Files (PSV)`
* `CSV Diff: Compare Current Two Files (Other Formats)`
  * Compare active two files. If three or more editors are open, first two editors will be selected.
* `CSV Diff: Compare Current With... (CSV)`
* `CSV Diff: Compare Current With... (TSV)`
* `CSV Diff: Compare Current With... (PSV)`
* `CSV Diff: Compare Current With... (Other Formats)`
  * Compare active file with selected file (a file dialog will open).

## Extension Settings

This extension contributes the following settings:

* `csvDiffPrettyPrint.format.formatType`: Controls the pretty-print format type.
* `csvDiffPrettyPrint.format.insertLineBetweenRows`: Inserts a Line between each rows or not.
* `csvDiffPrettyPrint.parse.headerLocation`: Specifies the header location.
* `csvDiffPrettyPrint.view.updateViewWhenTextChanges`: Update the view every time the text changes or not. If this value is set to false, the view is updated only when the text is saved.
