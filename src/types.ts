export interface GenerateResult {
	commands: string[];
	explanation: string;
}

export interface MultiFileResult {
	multi_file: true;
	glob: string[];
	commands: string[];
	output_template: string;
	explanation: string;
}

export type AiResult = GenerateResult | MultiFileResult;

export interface ToolContext {
	ffmpeg: {
		installed: boolean;
		version?: string;
		codecs: string[];
		filters: string[];
		bitstreamFilters: string[];
		formats: string[];
	};
	magick: {
		installed: boolean;
		version?: string;
		formats: string[];
	};
}
