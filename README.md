# `viola-default-lints`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/viola-default-lints)](https://jsr.io/@hiisi/viola-default-lints)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/viola-default-lints.svg)](https://github.com/hiisi-digital/viola-default-lints/issues)
![License](https://img.shields.io/github/license/hiisi-digital/viola-default-lints?color=%23009689)

> Default linters for the viola convention linter.

</div>

## What it does

This package provides a set of linters for [viola](https://jsr.io/@hiisi/viola), a convention
linter for codebases. These linters check for common issues like code duplication, naming
conventions, documentation gaps, and file organization problems.

## Installation

```bash
deno add jsr:@hiisi/viola-default-lints
```

## Usage

Add to your `deno.json` viola configuration:

```json
{
  "viola": {
    "plugins": ["@hiisi/viola-default-lints"],
    "**/*.ts": {
      "*>=major": "error",
      "*>=minor": "warn"
    }
  }
}
```

Or import individual linters:

```ts
import { typeLocationLinter, similarFunctionsLinter } from "@hiisi/viola-default-lints";
```

## Linters

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

## Support

Whether you use this project, have learned something from it, or just like it,
please consider supporting it by buying me a coffee, so I can dedicate more time
on open-source projects like this :)

<a href="https://buymeacoffee.com/orgrinrt" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>

## License

> You can check out the full license [here](https://github.com/hiisi-digital/viola-default-lints/blob/main/LICENSE)

This project is licensed under the terms of the **Mozilla Public License 2.0**.

`SPDX-License-Identifier: MPL-2.0`
