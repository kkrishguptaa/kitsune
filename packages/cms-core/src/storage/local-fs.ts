import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { StorageDriver } from "./driver.ts";

export interface LocalFsDriverOptions {
  /** Absolute path to the directory that stores assets in dev. */
  root: string;
  /** Base URL of the static mount that serves the root directory. */
  publicBaseUrl: string;
}

/**
 * A no-cloud storage driver for local development. Writes files under
 * `{root}/{workspaceId}/{key}` and serves them via an HTTP mount.
 *
 * Not suitable for production: files aren't replicated, deletes aren't
 * versioned, and there's no CDN.
 */
export class LocalFsDriver implements StorageDriver {
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(options: LocalFsDriverOptions) {
    this.root = resolve(options.root);
    this.publicBaseUrl = options.publicBaseUrl.replace(/\/$/, "");
  }

  private relativePath(workspaceId: string, key: string): string {
    return join(workspaceId, key);
  }

  async put(input: {
    workspaceId: string;
    key: string;
    contentType: string;
    body: Uint8Array | Buffer | ReadableStream<Uint8Array>;
  }): Promise<{ storageKey: string; publicUrl: string }> {
    const relative = this.relativePath(input.workspaceId, input.key);
    const abs = join(this.root, relative);
    await mkdir(dirname(abs), { recursive: true });

    if (input.body instanceof ReadableStream) {
      const chunks: Uint8Array[] = [];
      const reader = input.body.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      await writeFile(abs, Buffer.concat(chunks));
    } else if (input.body instanceof Uint8Array) {
      await writeFile(abs, Buffer.from(input.body));
    } else {
      await writeFile(abs, input.body);
    }

    return {
      storageKey: relative,
      publicUrl: `${this.publicBaseUrl}/${relative}`,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const abs = join(this.root, storageKey);
    try {
      await unlink(abs);
    } catch {
      // Missing file is fine on delete.
    }
  }

  resolveUrl(storageKey: string): string {
    return `${this.publicBaseUrl}/${storageKey}`;
  }
}
