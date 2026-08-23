/**
 * Type Location Linter
 *
 * Enforces that all type/interface declarations are in proper locations:
 * - packages/types/ (shared types)
 * - Any types/ subdirectory
 * - Files named types.ts or *.types.ts
 *
 * Also enforces that logic in types packages uses special file naming:
 * - *.constants.ts, *.helpers.ts, *.factory.ts, etc.
 *
 * @module
 */

import {
  BaseLinter,
  type CodebaseData,
  type Issue,
  type IssueCatalog,
  type LinterConfig,
  type LinterDataRequirements,
  type LinterMeta,
} from "@hiisi/viola";
import { optionsFrom } from "./options.ts";

// =============================================================================
// Configuration
// =============================================================================

/**
 * How a project says where its types live.
 *
 * All of it used to be hardcoded, naming `packages/types` and two literal
 * paths from a monorepo most consumers are not, and `lint` took its config as
 * `_config` and never read it. So the lint did not enforce a project's
 * convention, it enforced one particular project's, and every other project
 * got the whole of its type surface reported.
 */
export interface TypeLocationOptions {
  /**
   * Paths that hold types and nothing else.
   *
   * **Empty by default, and that is the load-bearing default.** A project that
   * has not said it keeps a types-only package has not agreed to keep one, and
   * demanding that of it is inventing a convention on its behalf. With none
   * declared, `type-outside-types` has nothing to say, and `logic-in-types`
   * still guards whatever a project does declare.
   *
   * @default []
   * @example ["packages/types", "src/schema"]
   */
  typesOnlyPackages?: readonly string[];

  /**
   * Files that may hold types wherever they sit.
   *
   * On top of the two shapes always allowed: anything under a `types/`
   * directory, and any file named `types.ts` or `*.types.ts`.
   *
   * @default []
   */
  allowedTypeFiles?: readonly string[];

  /**
   * File-name patterns that may hold logic inside a types-only package.
   *
   * @default the `.ctor` / `.builder` / `.factory` / `.defaults` / `.helpers`
   * / `.guards` / `.validators` / `.constants` / `.utils` suffixes
   */
  logicAllowedPatterns?: readonly RegExp[];
}

/**
 * File name patterns that allow logic in a types-only package, by default.
 */
const DEFAULT_LOGIC_ALLOWED = [
  /\.ctor\.ts$/,
  /\.builder\.ts$/,
  /\.factory\.ts$/,
  /\.defaults\.ts$/,
  /\.helpers\.ts$/,
  /\.guards\.ts$/,
  /\.validators\.ts$/,
  /\.constants\.ts$/,
  /\.utils\.ts$/,
];

/**
 * Directory patterns that are considered "types locations".
 */
const TYPES_DIRECTORY_PATTERNS = [
  /\/types\//,
  /\/types$/,
];

/**
 * Patterns that indicate logic (functions, classes, runtime values).
 */
const _LOGIC_PATTERNS = [
  {
    pattern: /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    type: "function",
  },
  {
    pattern:
      /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/,
    type: "arrow",
  },
  { pattern: /^\s*(?:export\s+)?class\s+(\w+)/, type: "class" },
  {
    pattern: /^\s*(?:export\s+)?const\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*[\[{]/,
    type: "const-object",
  },
  {
    pattern: /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*\w+\s*\(/,
    type: "const-call",
  },
];

/**
 * Patterns that are allowed in types files (not logic).
 */
const _ALLOWED_IN_TYPES = [
  /^\s*export\s+type\s/,
  /^\s*import\s/,
  /^\s*\/\//,
  /^\s*\/\*/,
  /^\s*\*/,
  /^\s*$/,
  /^\s*(?:export\s+)?interface\s/,
  /^\s*(?:export\s+)?type\s+\w+/,
  /^\s*export\s*\{/,
  /^\s*export\s+\*/,
  /^\s*[}\]];?\s*$/,
  /^\s*\w+\s*[?:]?\s*:/,
  /^\s*\[[^\]]+\]\s*:/,
  /^\s*</,
  /^\s*>/,
  /^\s*\|/,
  /^\s*&/,
  /^\s*["'`]/,
  /^\s*readonly\s/,
  /^\s*\{\s*$/,
];

/** Options with every default filled in. */
type Resolved = Required<TypeLocationOptions>;

const DEFAULT_OPTIONS: Resolved = {
  typesOnlyPackages: [],
  allowedTypeFiles: [],
  logicAllowedPatterns: DEFAULT_LOGIC_ALLOWED,
};

// =============================================================================
// Type Location Linter
// =============================================================================

/**
 * Linter that enforces type location rules.
 */
export class TypeLocationLinter extends BaseLinter {
  readonly meta: LinterMeta = {
    id: "type-location",
    name: "Type Location",
    description:
      "Enforces that types are in types/ directories and logic is not in types packages",
    docsUrl: "docs/PRINCIPLES.md",
  };

  readonly catalog: IssueCatalog = {
    "type-location/type-outside-types": {
      category: "consistency",
      impact: "major",
      description: "Type declared outside types package",
    },
    "type-location/logic-in-types": {
      category: "consistency",
      impact: "major",
      description: "Logic found in types-only package",
    },
  };

  readonly requirements: LinterDataRequirements = {
    types: true,
    files: true,
  };

  lint(data: CodebaseData, config: LinterConfig): Issue[] {
    const options = optionsFrom<Resolved>(config, DEFAULT_OPTIONS);
    const issues: Issue[] = [];

    // Nothing declared means nothing to enforce. A project that has not named
    // a types-only package is not thereby in breach of having one.
    if (options.typesOnlyPackages.length === 0) return issues;

    for (const file of data.files) {
      const inTypesPackage = this.isTypesOnlyPackage(file.path, options);
      const isAllowedTypeFile = this.isAllowedTypeFile(file.path, options);
      const isLogicAllowed = this.isLogicAllowedFile(file.path, options);

      if (inTypesPackage && !isLogicAllowed) {
        issues.push(...this.checkLogicInTypesFile(file, data));
      } else if (!inTypesPackage && !isAllowedTypeFile) {
        issues.push(...this.checkTypesOutsideTypesPackage(file));
      }
    }

    return issues;
  }

  /**
   * Check if a file is in a types-only package.
   */
  private isTypesOnlyPackage(
    filePath: string,
    options: Resolved,
  ): boolean {
    return options.typesOnlyPackages.some((pkg) => filePath.startsWith(pkg));
  }

  /**
   * Check if a file is allowed to have type definitions.
   */
  private isAllowedTypeFile(
    filePath: string,
    options: Resolved,
  ): boolean {
    if (options.allowedTypeFiles.some((allowed) => filePath === allowed)) {
      return true;
    }

    // In a types/ directory
    if (TYPES_DIRECTORY_PATTERNS.some((pattern) => pattern.test(filePath))) {
      return true;
    }

    // Named types.ts or *.types.ts
    const fileName = filePath.split("/").pop() || "";
    if (fileName === "types.ts" || fileName.endsWith(".types.ts")) {
      return true;
    }

    return false;
  }

  /**
   * Check if a file is allowed to have logic (in types package).
   */
  private isLogicAllowedFile(
    filePath: string,
    options: Resolved,
  ): boolean {
    const fileName = filePath.split("/").pop() || "";
    return options.logicAllowedPatterns.some((p) => p.test(fileName));
  }

  /**
   * Check for type declarations outside types package.
   */
  private checkTypesOutsideTypesPackage(
    file: {
      path: string;
      types: readonly { name: string; location: { line: number } }[];
    },
  ): Issue[] {
    const issues: Issue[] = [];

    for (const type of file.types) {
      issues.push(
        this.issue(
          "type-outside-types",
          { file: file.path, line: type.location.line },
          `Type/interface "${type.name}" declared outside types package.`,
          {
            suggestion: "1. Move to packages/types/ (if shared)\n" +
              "2. Create a local types/ directory (if package-local)\n" +
              "3. Rename file to types.ts or *.types.ts",
          },
        ),
      );
    }

    return issues;
  }

  /**
   * Check for logic in a types-only file.
   * This requires reading the actual file content to check line by line.
   */
  private checkLogicInTypesFile(
    file: {
      path: string;
      functions: readonly { name: string; location: { line: number } }[];
    },
    _data: CodebaseData,
  ): Issue[] {
    const issues: Issue[] = [];

    // Functions in types files are definitely logic
    for (const func of file.functions) {
      issues.push(
        this.issue(
          "logic-in-types",
          { file: file.path, line: func.location.line },
          `Function "${func.name}" found in types package.`,
          {
            suggestion: "Move to one of:\n" +
              "  - *.helpers.ts (helper functions)\n" +
              "  - *.factory.ts (factory functions)\n" +
              "  - *.constants.ts (constants)\n" +
              "  - *.guards.ts (type guards)\n" +
              "  - *.validators.ts (validation)\n" +
              "  - *.defaults.ts (default values)",
          },
        ),
      );
    }

    return issues;
  }
}

/**
 * Default instance for registration.
 */
export const typeLocationLinter: TypeLocationLinter = new TypeLocationLinter();
