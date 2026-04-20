/**
 * Asset storage driver interface. Implemented by {@link LocalFsDriver} for
 * local development and by an S3-compatible driver for prod (AWS, R2, etc.).
 *
 * The interface is intentionally small so we can add more backends without
 * re-plumbing the service layer.
 */
export interface StorageDriver {
  /**
   * Upload a blob. Returns the opaque `storageKey` we record on the
   * `assets` row, plus a public URL to serve reads from.
   */
  put(
    input: {
      workspaceId: string;
      key: string;
      contentType: string;
      body: Uint8Array | Buffer | ReadableStream<Uint8Array>;
    },
  ): Promise<{ storageKey: string; publicUrl: string }>;

  /** Produce a presigned PUT URL for direct browser uploads. */
  presignPut?(input: {
    workspaceId: string;
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<{ storageKey: string; uploadUrl: string; publicUrl: string }>;

  /** Delete a blob. */
  delete(storageKey: string): Promise<void>;

  /** Build a public URL for an already-stored asset. */
  resolveUrl(storageKey: string): string;
}
