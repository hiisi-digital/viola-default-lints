/**
 * Shared test utilities for viola linters.
 *
 * Provides factory functions for creating mock codebase data,
 * and assertion helpers for testing linters.
 *
 * @module
 */

import { assert } from "@std/assert";
import type {
  BaseLinter,
  CodebaseData,
  ExportInfo,
  FileInfo,
  FunctionInfo,
  FunctionParam,
  ImportInfo,
  LinterConfig,
  SchemaInfo,
  SourceLocation,
  StringLiteral,
  TypeField,
  TypeInfo,
} from "@hiisi/viola";

// =============================================================================
// Location Builders
// =============================================================================

/**
 * Create a source location.
 */
function loc(
  file: string,
  line: number,
  column?: number,
): SourceLocation {
  return { file, line, column };
}

/**
 * Get the first element of an array, asserting it exists.
 * Useful for tests with noUncheckedIndexedAccess enabled.
 */
export function first<T>(arr: readonly T[]): T {
  assert(arr.length > 0, "Expected array to have at least one element");
  return arr[0] as T;
}

// =============================================================================
// Function Builders
// =============================================================================

/**
 * Options for creating a mock function.
 */
interface MockFunctionOptions {
  name?: string;
  file?: string;
  line?: number;
  params?: FunctionParam[];
  returnType?: string;
  isAsync?: boolean;
  isGenerator?: boolean;
  isExported?: boolean;
  isDefaultExport?: boolean;
  body?: string;
  normalizedBody?: string;
  bodyHash?: string;
  jsDoc?: string;
  kind?: "function" | "method" | "arrow" | "constructor";
  parent?: string;
}

/**
 * Create a mock function info.
 */
export function mockFunction(opts: MockFunctionOptions = {}): FunctionInfo {
  const name = opts.name ?? "testFunction";
  // Default to multi-line body to meet minFunctionLines requirement (default: 3)
  const body = opts.body ?? `{
  const result = ${name}Impl();
  console.log("Executing ${name}");
  return result;
}`;
  const normalizedBody = opts.normalizedBody ??
    body.replace(/\s+/g, " ").trim();

  return {
    name,
    location: loc(opts.file ?? "test.ts", opts.line ?? 1),
    params: opts.params ?? [],
    returnType: opts.returnType,
    isAsync: opts.isAsync ?? false,
    isGenerator: opts.isGenerator ?? false,
    isExported: opts.isExported ?? false,
    isDefaultExport: opts.isDefaultExport ?? false,
    body,
    normalizedBody,
    bodyHash: opts.bodyHash ?? hashString(normalizedBody),
    jsDoc: opts.jsDoc,
    kind: opts.kind ?? "function",
    parent: opts.parent,
  };
}

/**
 * Create a mock function parameter.
 */
export function mockParam(
  name: string,
  type?: string,
  optional = false,
  rest = false,
  defaultValue?: string,
): FunctionParam {
  return { name, type, optional, rest, defaultValue };
}

// =============================================================================
// Type Builders
// =============================================================================

/**
 * Options for creating a mock type.
 */
interface MockTypeOptions {
  name?: string;
  file?: string;
  line?: number;
  kind?: "type" | "interface";
  isExported?: boolean;
  isDefaultExport?: boolean;
  fields?: TypeField[];
  typeParams?: string[];
  extends?: string[];
  body?: string;
  normalizedBody?: string;
  bodyHash?: string;
  jsDoc?: string;
}

/**
 * Create a mock type info.
 */
export function mockType(opts: MockTypeOptions = {}): TypeInfo {
  const name = opts.name ?? "TestType";
  const body = opts.body ?? `{ value: string }`;
  const normalizedBody = opts.normalizedBody ??
    body.replace(/\s+/g, " ").trim();

  return {
    name,
    location: loc(opts.file ?? "test.ts", opts.line ?? 1),
    kind: opts.kind ?? "interface",
    isExported: opts.isExported ?? false,
    isDefaultExport: opts.isDefaultExport ?? false,
    fields: opts.fields ?? [],
    typeParams: opts.typeParams,
    extends: opts.extends,
    body,
    normalizedBody,
    bodyHash: opts.bodyHash ?? hashString(normalizedBody),
    jsDoc: opts.jsDoc,
  };
}

/**
 * Create a mock type field.
 */
export function mockField(
  name: string,
  type: string,
  optional = false,
  readonly = false,
  jsDoc?: string,
): TypeField {
  return { name, type, optional, readonly, jsDoc };
}

// =============================================================================
// String Literal Builders
// =============================================================================

/**
 * Options for creating a mock string literal.
 */
interface MockStringOptions {
  value?: string;
  file?: string;
  line?: number;
  quoteStyle?: "single" | "double" | "backtick";
  isTemplate?: boolean;
  context?: string;
}

/**
 * Create a mock string literal.
 */
export function mockString(opts: MockStringOptions = {}): StringLiteral {
  return {
    value: opts.value ?? "test string",
    location: loc(opts.file ?? "test.ts", opts.line ?? 1),
    quoteStyle: opts.quoteStyle ?? "double",
    isTemplate: opts.isTemplate ?? false,
    context: opts.context,
  };
}

// =============================================================================
// Export/Import Builders
// =============================================================================

/**
 * Options for creating a mock export.
 */
interface MockExportOptions {
  name?: string;
  localName?: string;
  file?: string;
  line?: number;
  kind?: ExportInfo["kind"];
  isTypeOnly?: boolean;
  from?: string;
}

/**
 * Create a mock export info.
 */
export function mockExport(opts: MockExportOptions = {}): ExportInfo {
  return {
    ...named(opts, "testExport"),
    kind: opts.kind ?? "function",
    isTypeOnly: opts.isTypeOnly ?? false,
  };
}

/**
 * The half an export and an import have in common.
 *
 * Both carry a name, a local name, a position and the module they came from,
 * and both spelled all four out with the same defaults.
 */
function named(
  opts: {
    name?: string;
    localName?: string;
    file?: string;
    line?: number;
    from?: string;
  },
  fallback: string,
) {
  return {
    name: opts.name ?? fallback,
    localName: opts.localName,
    location: loc(opts.file ?? "test.ts", opts.line ?? 1),
    from: opts.from,
  };
}

/**
 * Options for creating a mock import.
 */
interface MockImportOptions {
  name?: string;
  localName?: string;
  file?: string;
  line?: number;
  from?: string;
  isTypeOnly?: boolean;
  isNamespace?: boolean;
}

/**
 * Create a mock import info.
 */
export function mockImport(opts: MockImportOptions = {}): ImportInfo {
  return {
    ...named(opts, "testImport"),
    // An import always came from somewhere; an export usually did not.
    from: opts.from ?? "./other.ts",
    isTypeOnly: opts.isTypeOnly ?? false,
    isNamespace: opts.isNamespace ?? false,
  };
}

// =============================================================================
// Schema Builders
// =============================================================================

/**
 * Options for creating a mock schema.
 */
interface MockSchemaOptions {
  name?: string;
  file?: string;
  title?: string;
  description?: string;
  rootType?: string;
  properties?: string[];
  required?: string[];
}

/**
 * Create a mock schema info.
 */
export function mockSchema(opts: MockSchemaOptions = {}): SchemaInfo {
  return {
    name: opts.name ?? "TestSchema",
    file: opts.file ?? "schemas/test.schema.json",
    title: opts.title,
    description: opts.description,
    rootType: opts.rootType ?? "object",
    properties: opts.properties ?? [],
    required: opts.required ?? [],
  };
}

// =============================================================================
// File Builders
// =============================================================================

/**
 * Options for creating a mock file.
 */
interface MockFileOptions {
  path?: string;
  extension?: string;
  lineCount?: number;
  functions?: FunctionInfo[];
  types?: TypeInfo[];
  strings?: StringLiteral[];
  exports?: ExportInfo[];
  imports?: ImportInfo[];
  content?: string;
}

/**
 * Create a mock file info.
 */
export function mockFile(opts: MockFileOptions = {}): FileInfo {
  return {
    grammarId: "",
    path: opts.path ?? "test.ts",
    extension: opts.extension ?? ".ts",
    lineCount: opts.lineCount ?? 100,
    functions: opts.functions ?? [],
    types: opts.types ?? [],
    strings: opts.strings ?? [],
    exports: opts.exports ?? [],
    imports: opts.imports ?? [],
    content: opts.content,
  };
}

// =============================================================================
// Codebase Builders
// =============================================================================

/**
 * Options for creating mock codebase data.
 */
interface MockCodebaseOptions {
  projectRoot?: string;
  files?: FileInfo[];
  schemas?: SchemaInfo[];
  extractedAt?: number;
}

/**
 * Create mock codebase data.
 */
export function mockCodebase(opts: MockCodebaseOptions = {}): CodebaseData {
  const files = opts.files ?? [];

  // Aggregate all data from files
  const allFunctions = files.flatMap((f) => f.functions);
  const allTypes = files.flatMap((f) => f.types);
  const allStrings = files.flatMap((f) => f.strings);
  const allExports = files.flatMap((f) => f.exports);
  const allImports = files.flatMap((f) => f.imports);

  return {
    projectRoot: opts.projectRoot ?? "/test/project",
    files,
    schemas: opts.schemas ?? [],
    extractedAt: opts.extractedAt ?? Date.now(),
    allFunctions,
    allTypes,
    allStrings,
    allExports,
    allImports,
    // Derived the way the crawler derives it, so a mock codebase knows its own
    // declared vocabulary without every test having to spell it out.
    literalVocabulary: new Set(
      allTypes.flatMap((t) =>
        [...t.body.matchAll(/(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g)]
          .map((m) => m[1] ?? m[2])
          .filter((v): v is string => v !== undefined && v !== "")
      ),
    ),
  };
}

// =============================================================================
// Linter Test Helpers
// =============================================================================

/**
 * Default linter config for testing.
 */
export const defaultConfig: LinterConfig = {
  enabled: true,

  options: {},
};

/**
 * Assert that violations contain expected codes.
 */
export function expectCodes(
  violations: { kind: string }[],
  expectedCodes: string[],
): void {
  const actualCodes = violations.map((v) => v.kind).sort();
  const expected = [...expectedCodes].sort();

  if (actualCodes.length !== expected.length) {
    throw new Error(
      `Expected ${expected.length} violations, got ${actualCodes.length}.\n` +
        `Expected: ${expected.join(", ")}\n` +
        `Actual: ${actualCodes.join(", ")}`,
    );
  }

  for (let i = 0; i < expected.length; i++) {
    if (actualCodes[i] !== expected[i]) {
      throw new Error(
        `Violation code mismatch at index ${i}.\n` +
          `Expected: ${expected[i]}\n` +
          `Actual: ${actualCodes[i]}`,
      );
    }
  }
}

/**
 * Assert that no violations were found.
 */
export function expectNoViolations(violations: unknown[]): void {
  if (violations.length > 0) {
    throw new Error(
      `Expected no violations, got ${violations.length}:\n` +
        JSON.stringify(violations, null, 2),
    );
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Simple hash function for test data.
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
