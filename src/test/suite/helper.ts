import { FormatType, HeaderLocation, Options } from "../../options";

export function getOptions(formatType: FormatType, insertLineBetweenRows: boolean,
	headerLocation: HeaderLocation, updateViewWhenTextChanges: boolean): Options {
	return new class implements Options {
		formatType: FormatType = formatType;
		insertLineBetweenRows: boolean = insertLineBetweenRows;
		headerLocation: HeaderLocation = headerLocation;
		updateViewWhenTextChanges: boolean = updateViewWhenTextChanges;
	};
}
