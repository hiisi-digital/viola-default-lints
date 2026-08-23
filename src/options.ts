/**
 * Reading a linter's options off its config.
 *
 * Every linter had its own `getOptions`, and every one of them was the same
 * two lines: cast whatever the config carries, spread it over the defaults.
 * Five copies of a cast is five places for a linter to disagree with the
 * others about what an absent option means.
 *
 * @module
 */

import type { LinterConfig, SourceLocation } from "@hiisi/viola";

/**
 * The defaults, with whatever the project said laid over them.
 *
 * The cast is the honest part of this: a config file is data, so what it
 * carries is unknown until a linter says what shape it expects. Doing it here
 * means the assumption is stated once.
 */
export function optionsFrom<T>(config: LinterConfig, defaults: T): T {
  return { ...defaults, ...(config.options as Partial<T> | undefined) };
}

/**
 * Whether a name is one a project asked not to hear about.
 *
 * Three linters carried this, byte for byte. Three copies of an exemption rule
 * is three places for one linter to start honouring a pattern differently from
 * the others.
 */
export function isIgnored(
  name: string,
  patterns: readonly RegExp[],
  explicitNames: readonly string[],
): boolean {
  if (explicitNames.includes(name)) return true;
  return patterns.some((pattern) => pattern.test(name));
}

/**
 * Where something is, as one string.
 *
 * Two linters spelled this out over their own item type. What it is about is a
 * location, so that is what it takes.
 */
export function locationString(
  at: { readonly location: SourceLocation },
): string {
  return `${at.location.file}:${at.location.line}`;
}

/**
 * The defaults, with the project's options laid over them, except for the
 * lists named here, which the project adds to rather than replaces.
 *
 * A project naming one more pattern to ignore means one more, not only that
 * one: replacing the list would silently drop every default it did not repeat.
 * Two linters each spelled this out per list, so adding an option meant
 * remembering to append it in a place nothing points at.
 */
export function optionsAppending<T>(
  config: LinterConfig,
  defaults: T,
  appended: readonly (keyof T)[],
): T {
  const given = (config.options ?? {}) as Partial<T>;
  const merged = { ...defaults, ...given } as T;
  for (const key of appended) {
    const base = defaults[key];
    const extra = given[key];
    if (Array.isArray(base)) {
      merged[key] = [
        ...base,
        ...(Array.isArray(extra) ? extra : []),
      ] as T[keyof T];
    }
  }
  return merged;
}
