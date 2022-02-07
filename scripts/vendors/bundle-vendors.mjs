#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import createEsmUtils from "esm-utils";
import esbuild from "esbuild";
import { readPackageUp } from "read-pkg-up";
import vendors from "./vendors.mjs";
import { writeVendorVersions } from "./vendor-versions.mjs";
import esbuildPluginTsNocheck from "./esbuild-plugin-ts-nocheck.mjs";

const { __dirname, require } = createEsmUtils(import.meta);
const rootDir = path.join(__dirname, "..", "..");
// prettier/vendors
const vendorsDir = path.join(rootDir, "vendors");
// prettier/vendors/*.js
const getVendorFilePath = (vendorName) =>
  path.join(vendorsDir, `${vendorName}.js`);

async function lockVersions(vendors) {
  const vendorVersions = {};
  for (const vendor of vendors) {
    const { packageJson: vendorPackage } = await readPackageUp({
      cwd: path.dirname(require.resolve(vendor)),
    });
    const vendorVersion = vendorPackage.version;
    vendorVersions[vendor] = vendorVersion;
  }
  await writeVendorVersions(vendorVersions);
}

async function fileExists(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function cleanExistsBundledJS() {
  for (const file of await fs.readdir(vendorsDir)) {
    const filePath = path.join(vendorsDir, file);
    if (path.extname(file) === ".js" && (await fileExists(filePath))) {
      await fs.rm(filePath);
    }
  }
}

async function bundle(vendor) {
  const outfile = getVendorFilePath(vendor);
  if (await fileExists(outfile)) {
    await fs.rm(outfile);
  }
  /** @type {import("esbuild").CommonOptions} */
  const esbuildOption = {
    entryPoints: [require.resolve(vendor)],
    bundle: true,
    target: ["node12.17.0"],
    platform: "node",
    plugins: [esbuildPluginTsNocheck()],
    outfile,
  };
  await esbuild.build(esbuildOption);

  await fs.writeFile(
    path.join(vendorsDir, `${vendor}.d.ts`),
    [
      "// This file is generated automatically.",
      `export {default} from "${vendor}";`,
      `export * from "${vendor}";`,
      "",
    ].join("\n"),
    "utf-8"
  );
}

async function main() {
  await cleanExistsBundledJS();
  for (const vendor of vendors) {
    await bundle(vendor);
    console.log(`Bundled: ${vendor}`);
  }
  await lockVersions(vendors);
  console.log("Locked: vendor-versions.json");
}

main();