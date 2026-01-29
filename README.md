# `viola-default-lints`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/viola-default-lints)](https://jsr.io/@hiisi/viola-default-lints)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/viola-default-lints.svg)](https://github.com/hiisi-digital/viola-default-lints/issues)
![License](https://img.shields.io/github/license/viola-default-lints?color=%23009689)

> A collection of convention linters for viola.

</div>

## What it does

This package provides a set of opinionated convention linters that work with the
[viola](https://jsr.io/@hiisi/viola) runtime. These linters check for common issues like
code duplication, naming conventions, documentation gaps, and file organization problems.

This is one example of a linter collection for viola. You can use these linters as-is,
use them as a starting point for your own, or write completely custom linters.

## Installation

```bash
deno add jsr:@hiisi/viola-default-lints
```

You'll also need the viola runtime:

```bash
deno add jsr:@hiisi/viola
```

## Usage

### With viola-cli

Add to your `deno.json`:

```json
{
  "viola": {
    "plugins": ["jsr:@hiisi/viola-default-lints"]
  }
}
```

Then run:

```bash
deno run -A jsr:@hiisi/viola-cli
```

### Programmatic Usage

```ts
import { runViola } from "@hiisi/viola";

const results = await runViola({
  plugins: ["jsr:@hiisi/viola-default-lints"],
  include: ["src"],
});
```

### Import Individual Linters

```ts
import { TypeLocationLinter, SimilarFunctionsLinter } from "@hiisi/viola-default-lints";
import { registry, runLinters } from "@hiisi/viola";

registry.register(new TypeLocationLinter());
registry.register(new SimilarFunctionsLinter());

const results = await runLinters({ include: ["src"] });
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

## Configuration

Configure individual linters via the `linters` field:

```json
{
  "viola": {
    "plugins": ["jsr:@hiisi/viola-default-lints"],
    "linters": {
      "similar-functions": {
        "threshold": 0.8
      },
      "duplicate-strings": {
        "minLength": 10
      }
    }
  }
}
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
