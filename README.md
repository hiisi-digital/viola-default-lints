# `viola-default-lints`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/viola-default-lints)](https://jsr.io/@hiisi/viola-default-lints)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/viola-default-lints.svg)](https://github.com/hiisi-digital/viola-default-lints/issues)
![License](https://img.shields.io/github/license/viola-default-lints?color=%23009689)

> A collection of convention linters for viola with sensible default rules.

</div>

## What it does

This package provides a set of opinionated convention linters that work with the
[viola](https://jsr.io/@hiisi/viola) runtime. These linters check for common issues like
code duplication, naming conventions, documentation gaps, and file organization problems.

The plugin includes **sensible default rules** that classify issues by impact:
- Critical/Major impact → error
- Minor impact → warn
- Trivial impact → info

## Installation

```bash
deno add jsr:@hiisi/viola jsr:@hiisi/viola-default-lints
```

## Usage

Create a `viola.config.ts`:

```ts
import { viola, report, when } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints)  // adds linters + default rules
  .rule(report.off, when.in("**/*_test.ts"));  // your overrides
```

Run with CLI:

```bash
deno run -A jsr:@hiisi/viola-cli
```

Your rules are always checked **before** plugin rules (first match wins), so you can override the defaults.

### Without Default Rules

If you want just the linters without any default rules:

```ts
import { viola, report, when, Impact } from "@hiisi/viola";
import { linters } from "@hiisi/viola-default-lints";

export default viola()
  .add(linters)  // just linters, no default rules
  .rule(report.error, when.impact.atLeast(Impact.Critical))
  .rule(report.warn, when.impact.atLeast(Impact.Major));
```

### Configure Linter Settings

```ts
import { viola, report, when } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints)
  .set("similar-functions.threshold", 0.8)
  .set("duplicate-strings.minLength", 10)
  .rule(report.off, when.in("**/*_test.ts"));
```

### Import Individual Linters

```ts
import { viola, report, when, Impact } from "@hiisi/viola";
import { typeLocationLinter, similarFunctionsLinter } from "@hiisi/viola-default-lints";

export default viola()
  .add(typeLocationLinter)
  .add(similarFunctionsLinter)
  .rule(report.error, when.impact.atLeast(Impact.Major));
```

## Available Linters

| Linter | Description |
|--------|-------------|
| `type-location` | Types must be in `types/` directories |
| `similar-functions` | Detect similar function names |
| `similar-types` | Detect similar type names |
| `duplicate-strings` | Find repeated string literals |
| `duplicate-logic` | Find duplicated code patterns |
| `deprecation-check` | Find deprecated code past its removal date |
| `missing-docs` | Find exports without documentation |
| `orphaned-code` | Find unused internal code |
| `schema-collision` | Find conflicting schema definitions |

## Default Rules

The plugin configures these rules (checked after your rules):

```ts
.rule(report.error, when.impact.atLeast(Impact.Major))
.rule(report.warn, when.impact.is(Impact.Minor))
.rule(report.info, when.impact.is(Impact.Trivial))
```

## Writing Your Own Linters

See the [viola documentation](https://jsr.io/@hiisi/viola) for how to create custom linters
using the `BaseLinter` class. The linters in this package serve as examples.

## Support

Whether you use this project, have learned something from it, or just like it,
please consider supporting it by buying me a coffee, so I can dedicate more time
on open-source projects like this :)

<a href="https://buymeacoffee.com/orgrinrt" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>

## License

> You can check out the full license [here](https://github.com/hiisi-digital/viola-default-lints/blob/main/LICENSE)

This project is licensed under the terms of the **Mozilla Public License 2.0**.

`SPDX-License-Identifier: MPL-2.0`
