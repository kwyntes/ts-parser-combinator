interface ParseResult<T> {
	success: boolean;
	unparsed?: string;
	value?: T;
}

type Parser<T> = (input: string) => ParseResult<T>;

export function lit(str: string): Parser<string> {
	return function(input: string) {
		let pos = 0;
		while (input[pos] === str[pos] && pos < str.length) {
			pos++;
		}
		if (pos === str.length) {
			return {
				success: true,
				unparsed: input.slice(pos),
				value: str
			};
		}
		return {
			success: false
		};
	}
}

export function or<T extends unknown[]>(...parsers: {
	[index in keyof T]: Parser<T[index]>
}): Parser<T[number]> {
	return function(input: string) {
		let result: ParseResult<T[number]>;
		for (const parser of parsers) {
			result = parser(input);
			if (result.success) {
				return result;
			}
		}
		return result;
	}
}

export function seq<T extends unknown[]>(...parsers: {
	[index in keyof T]: Parser<T[index]>
}): Parser<T> {
	return function(input: string) {
		let unparsed = input;
		const parsed = [];
		for (const parser of parsers) {
			const result = parser(unparsed);
			if (!result.success) {
				return { success: false };
			}
			unparsed = result.unparsed;
			parsed.push(result.value);
		}
		return {
			success: true,
			unparsed,
			value: parsed as [...T]
		};
	}
}

export function between<T, U, V>(parserLeft: Parser<T>, parserBetween: Parser<U>, parserRight: Parser<V>): Parser<U> {
	return function(input: string) {
		const result = seq(parserLeft, parserBetween, parserRight)(input);
		if (result.success) {
			return {
				...result,
				value: result.value[1]
			};
		}
		return { success: false };
	}
}

export function apply<T extends unknown | unknown[], U>(parser: Parser<T>, fn: (...v: T extends unknown[] ? T : T[]) => U): Parser<U> {
	return function(input: string) {
		const result = parser(input);
		if (result.success) {
			return {
				...result,
				value: fn.apply(null, Array.isArray(result.value) ? result.value : [result.value])
			};
		}
		return { success: false };
	}
}

export function applyClass<T extends unknown | unknown[], U>(parser: Parser<T>, cls: new (...v: T extends unknown[] ? T : T[]) => U): Parser<U> {
	return apply(parser, (...v) => new cls(...v));
}

export function many<T>(parser: Parser<T>): Parser<T[]> {
	return function(input: string) {
		let result: ParseResult<T>;
		let unparsed = input;
		const parsed = [];
		while ((result = parser(unparsed)).success) {
			unparsed = result.unparsed;
			parsed.push(result.value);
			result = parser(input);
		}
		if (parsed.length > 0) {
			return {
				success: true,
				unparsed,
				value: parsed
			};
		}
		return { success: false };
	}
}

export function opt<T>(parser: Parser<T>): Parser<T | null> {
	return function(input: string) {
		let result = parser(input);
		if (result.success) {
			return result;
		}
		return {
			success: true,
			unparsed: input,
			value: null
		};
	}
}

type LateInitParser<T> = {
	(input: string): ParseResult<T>;
	init(parser: Parser<T>): void;
}

export function later<T>(): LateInitParser<T> {
	let _parser: Parser<T> | null;
	const proxy = function(input: string) {
		if (!_parser) {
			throw new Error("Parser used before initializing.");
		}
		return _parser(input);
	};
	proxy.init = function(parser: Parser<T>) {
		_parser = parser;
	};
	return proxy;
}
