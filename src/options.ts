const formatType = [
	'Grid',
	'Simple',
] as const;
export type FormatType = typeof formatType[number];

const headerLocation = [
	"None",
	"FirstRow",
	"Implicit",
] as const;
export type HeaderLocation = typeof headerLocation[number];

/**
 * Extension options.
 */
export interface Options {
	readonly formatType: FormatType;
	readonly insertLineBetweenRows: boolean;
	readonly headerLocation: HeaderLocation;
}