#!/usr/bin/env node

/*
Add this file so we can use `node bin/prettily` or `node bin/prettily.js`
instead of `node bin/prettily.cjs`.

This file should only used for development.
*/

import { run } from "../src/cli/index.js";

await run();
