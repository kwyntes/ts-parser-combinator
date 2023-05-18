// modified from https://github.com/kwyntes/ts-parser-combinator/blob/main/lib/index.ts

// okay the main thing this is missing is some kind of lazy/non-greedy anything() function
// which is would pretty much require a full rewrite of this lib...
// as that is actually kind of complicated...
// and requires some kind of communication between seq() / [m]any() (and that has to through things like or())...
//
// not sure if there even exists a library that does that though.
// some libraries simply implement a many_till function (here implemented as until())

interface ParseResult<T> {
  success: boolean;
  unparsed: string;
  value?: T;
}

type Parser<T> = (input: string) => ParseResult<T>;

export function lit(str: string): Parser<string> {
  return function (input: string) {
    let pos = 0;
    while (input[pos] === str[pos] && pos < str.length) {
      pos++;
    }
    if (pos === str.length) {
      return {
        success: true,
        unparsed: input.slice(pos),
        value: str,
      };
    }
    return {
      success: false,
      unparsed: input,
    };
  };
}

export const anything: Parser<string> = function (input: string) {
  if (input.length > 0) {
    return {
      success: true,
      unparsed: input.slice(1),
      value: input[0],
    };
  }
  return {
    success: false,
    unparsed: "",
  };
};

export function whilst(predicate: (c: string) => boolean): Parser<string> {
  return function (input: string) {
    let value = "";
    let pos = 0;
    while (predicate(input[pos])) {
      value += input[pos];
      pos++;
    }
    if (pos > 0) {
      return {
        success: true,
        unparsed: input.slice(pos),
        value,
      };
    }
    return {
      success: false,
      unparsed: input,
    };
  };
}

export function or<T extends unknown[]>(
  ...parsers: {
    [index in keyof T]: Parser<T[index]>;
  }
): Parser<T[number]> {
  return function (input: string) {
    for (const parser of parsers) {
      const result = parser(input);
      if (result.success) {
        return result;
      }
    }
    return {
      success: false,
      unparsed: input,
    };
  };
}

export function seq<T extends unknown[]>(
  ...parsers: {
    [index in keyof T]: Parser<T[index]>;
  }
): Parser<T> {
  return function (input: string) {
    let unparsed = input;
    const parsed: any[] = [];
    for (const parser of parsers) {
      const result = parser(unparsed);
      if (!result.success) {
        return {
          success: false,
          unparsed,
        };
      }
      unparsed = result.unparsed;
      parsed.push(result.value);
    }
    return {
      success: true,
      unparsed,
      value: parsed as [...T],
    };
  };
}

export function last<T extends unknown[]>(
  ...parsers: {
    [index in keyof T]: Parser<T[index]>;
  }
): Parser<T extends [...unknown[], infer Last] ? Last : never> {
  return function (input: string) {
    const result = seq(...parsers)(input);
    if (result.success) {
      return {
        ...result,
        value: result.value![result.value!.length - 1],
      };
    }
    return {
      success: false,
      unparsed: result.unparsed,
    };
  };
}

export function first<T extends unknown[]>(
  ...parsers: {
    [index in keyof T]: Parser<T[index]>;
  }
): Parser<T extends [infer First, ...unknown[]] ? First : never> {
  return function (input: string) {
    const result = seq(...parsers)(input);
    if (result.success) {
      return {
        ...result,
        value: result.value![0],
      };
    }
    return {
      success: false,
      unparsed: result.unparsed,
    };
  };
}

export function between<T, U, V>(
  parserLeft: Parser<T>,
  parserBetween: Parser<U>,
  parserRight: Parser<V>
): Parser<U> {
  return function (input: string) {
    const result = seq(parserLeft, parserBetween, parserRight)(input);
    if (result.success) {
      return {
        ...result,
        value: result.value![1],
      };
    }
    return {
      success: false,
      unparsed: input,
    };
  };
}

export function concat<T extends { toString(): string }[]>(
  ...parsers: {
    [index in keyof T]: Parser<T[index]>;
  }
): Parser<string> {
  return function (input: string) {
    const result = seq(...parsers)(input);
    if (result.success) {
      return {
        ...result,
        value: result.value!.join(""),
      };
    }
    return {
      success: false,
      unparsed: result.unparsed,
    };
  };
}

export function apply<T extends unknown | unknown[], U>(
  parser: Parser<T>,
  fn: (...v: T extends unknown[] ? T : T[]) => U
): Parser<U> {
  return function (input: string) {
    const result = parser(input);
    if (result.success) {
      return {
        ...result,
        value: fn.apply(
          null,
          (Array.isArray(result.value)
            ? result.value
            : [result.value]) as T extends unknown[] ? T : T[]
        ),
      };
    }
    return {
      success: false,
      unparsed: result.unparsed,
    };
  };
}

export function applyClass<T extends unknown | unknown[], U>(
  parser: Parser<T>,
  cls: new (...v: T extends unknown[] ? T : T[]) => U
): Parser<U> {
  return apply(parser, (...v) => new cls(...v));
}

// typescript black magic from https://stackoverflow.com/a/76137967/8649828
/**
 * note: because we're not using spread parameters for keys, the key array must be cast as const
 * don't ask me why i don't fucking know either.
 *
 * this does work:
 * ```
 * asObject(seq(...), ["a", "b", "c"] as const)
 * ```
 *
 * this does not:
 * ```
 * asObject(seq(...), ["a", "b", "c"])
 * ```
 */
export function asObject<
  K extends readonly PropertyKey[],
  V extends Record<keyof K, any>,
  T extends { [index in `${number}` & keyof K as K[index]]: V[index] }
>(parser: Parser<V>, keys: K): Parser<T> {
  return function (input: string) {
    const result = parser(input);
    if (result.success) {
      return {
        ...result,
        value: keys.reduce(
          (obj, key, index) => ({ ...obj, [key]: result.value![index] }),
          {} as T
        ),
      };
    }
    return {
      success: false,
      unparsed: result.unparsed,
    };
  };
}

export function many<T>(parser: Parser<T>): Parser<T[]> {
  return function (input: string) {
    let result: ParseResult<T>;
    let unparsed = input;
    const parsed: T[] = [];
    while (unparsed.length > 0 && (result = parser(unparsed)).success) {
      unparsed = result.unparsed;
      parsed.push(result.value!);
    }
    if (parsed.length > 0) {
      return {
        success: true,
        unparsed,
        value: parsed,
      };
    }
    return {
      success: false,
      unparsed: input,
    };
  };
}

export function any<T>(parser: Parser<T>): Parser<T[]> {
  return function (input: string) {
    let result: ParseResult<T>;
    let unparsed = input;
    const parsed: T[] = [];
    while (unparsed.length > 0 && (result = parser(unparsed)).success) {
      unparsed = result.unparsed;
      parsed.push(result.value!);
    }
    return {
      success: true,
      unparsed,
      value: parsed,
    };
  };
}

export function until<T>(
  parserA: Parser<T>,
  parserB: Parser<unknown>
): Parser<T[]> {
  return function (input: string) {
    let result: ParseResult<T>;
    let unparsed = input;
    const parsed: T[] = [];
    while (
      unparsed.length > 0 &&
      !parserB(unparsed).success &&
      (result = parserA(unparsed)).success
    ) {
      unparsed = result.unparsed;
      parsed.push(result.value!);
    }
    if (parsed.length > 0) {
      return {
        success: true,
        unparsed,
        value: parsed,
      };
    }
    return {
      success: false,
      unparsed: input,
    };
  };
}

export function strUntil<T extends { toString(): string }>(
  parserA: Parser<T>,
  parserB: Parser<unknown>
): Parser<string> {
  return function (input: string) {
    let result: ParseResult<T>;
    let unparsed = input;
    const parsed: T[] = [];
    while (
      unparsed.length > 0 &&
      !parserB(unparsed).success &&
      (result = parserA(unparsed)).success
    ) {
      unparsed = result.unparsed;
      parsed.push(result.value!);
    }
    if (parsed.length > 0) {
      return {
        success: true,
        unparsed,
        value: parsed.join(""),
      };
    }
    return {
      success: false,
      unparsed: input,
    };
  };
}

export function opt<T>(parser: Parser<T>): Parser<T | null> {
  return function (input: string) {
    let result = parser(input);
    if (result.success) {
      return result;
    }
    return {
      success: true,
      unparsed: input,
      value: null,
    };
  };
}

export function strOpt<T>(
  parser: Parser<{ toString(): string }>
): Parser<string> {
  return function (input: string) {
    let result = parser(input);
    if (result.success) {
      return {
        success: true,
        unparsed: result.unparsed,
        value: result.value!.toString(),
      };
    }
    return {
      success: true,
      unparsed: input,
      value: "",
    };
  };
}

type LateInitParser<T> = {
  (input: string): ParseResult<T>;
  init(parser: Parser<T>): void;
};

export function later<T>(): LateInitParser<T> {
  let _parser: Parser<T>;
  const proxy = function (input: string) {
    if (!_parser) {
      throw new Error("Parser used before initializing.");
    }
    return _parser(input);
  };
  proxy.init = function (parser: Parser<T>) {
    _parser = parser;
  };
  return proxy;
}
