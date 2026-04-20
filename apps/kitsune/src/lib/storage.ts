import { resolve } from "node:path";
import { LocalFsDriver, type StorageDriver } from "@kitsune/cms-core";

/**
 * Pick a storage driver based on env config. Defaults to a local-fs driver
 * that writes to `./public/uploads/` and serves via the static `/uploads/`
 * mount. When `S3_*` env vars are present, swap in an S3-compatible driver
 * (not implemented in MVP — see package-level TODO).
 */
export function createStorageDriver(): StorageDriver {
  // MVP: always use local fs. S3 driver can be added later behind the same
  // interface without touching call sites.
  return new LocalFsDriver({
    root: resolve(process.cwd(), "public", "uploads"),
    publicBaseUrl: "/uploads",
  });
}

export const storage = createStorageDriver();
