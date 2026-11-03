# `viola-default-lints`

[![JSR](https://jsr.io/badges/@hiisi/viola-default-lints)](https://jsr.io/@hiisi/viola-default-lints)

> Default linters and rules for the viola convention linter.

A set of opinionated convention linters for the [viola](https://jsr.io/@hiisi/viola) runtime, covering code duplication, naming, documentation gaps and file organization. They come with default rules that classify issues by impact, where critical and major are errors, minor is a warning and trivial is info.

## Usage

```bash
deno add jsr:@hiisi/viola jsr:@hiisi/viola-default-lints
```

```ts
import { report, viola, when } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints) // adds linters + default rules
  .set("similar-functions.minSimilarity", 0.8)
  .rule(report.off, when.in("**/*_test.ts")); // your overrides
```

Rules are "last wins" like CSS, and yours come after the plugin's, so they take precedence. To take the linters without the default rules, import `linters` and `.add(linters)`, and to take single ones, import them by name, such as `similarFunctionsLinter` and `typeLocationLinter`, and add each.

The linters are `type-location`, which wants types in `types/` directories and logic out of types-only packages, `similar-functions` and `similar-types` for similar names and identical field structures, `duplicate-strings` and `duplicate-logic` for repeated literals and similar implementations, `deprecation-check` for `@deprecated` annotations and removal markers, `missing-docs` for exports without documentation, `orphaned-code` for exports nobody imports, and `schema-collision` for naming conflicts between schemas and types.

## Known issues

`missing-docs` reads the `jsDoc` field on extracted functions and types, and viola's extraction doesn't fill that field yet, so on real crawled data every export is reported as undocumented. Keep the rule off or scoped until it does. Custom linters are written with the `BaseLinter` class in the [viola documentation](https://jsr.io/@hiisi/viola), and the ones here are examples.

## License

> The project is licensed under the **Mozilla Public License 2.0**.

`SPDX-License-Identifier: MPL-2.0`

> You can check out the full license [here](https://github.com/hiisi-digital/viola-default-lints/blob/main/LICENSE)
