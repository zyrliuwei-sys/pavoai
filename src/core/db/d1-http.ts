// Node development transport for the native D1 driver. Using /raw preserves
// column order (including duplicate names) for Drizzle's positional mapping.
export interface D1Query {
  sql: string;
  params: unknown[];
}

export interface D1RawResult {
  success: boolean;
  results: { columns: string[]; rows: unknown[][] };
  meta: Record<string, unknown>;
}

export function createD1HttpBinding(
  execute: (queries: D1Query[]) => Promise<D1RawResult[]>
) {
  const objectResult = (result: D1RawResult) => ({
    ...result,
    results: result.results.rows.map((row) =>
      Object.fromEntries(
        result.results.columns.map((name, i) => [name, row[i]])
      )
    ),
  });

  class Statement {
    constructor(
      readonly sql: string,
      readonly params: unknown[] = []
    ) {}

    bind(...params: unknown[]) {
      return new Statement(this.sql, params);
    }

    async raw(options?: { columnNames?: boolean }) {
      const [result] = await execute([this]);
      return options?.columnNames
        ? [result.results.columns, ...result.results.rows]
        : result.results.rows;
    }

    async all() {
      const [result] = await execute([this]);
      return objectResult(result);
    }

    run() {
      return this.all();
    }

    async first(column?: string) {
      const { results } = await this.all();
      return column ? (results[0]?.[column] ?? null) : (results[0] ?? null);
    }
  }

  return {
    prepare: (sql: string) => new Statement(sql),
    // Send every statement in ONE API batch, retaining D1's rollback semantics.
    batch: async (queries: Statement[]) =>
      queries.length ? (await execute(queries)).map(objectResult) : [],
    async exec(sql: string) {
      const result = await execute([{ sql, params: [] }]);
      return {
        count: result.length,
        duration: result.reduce((n, r) => n + Number(r.meta.duration ?? 0), 0),
      };
    },
    async dump(): Promise<ArrayBuffer> {
      throw new Error('Use wrangler d1 export to export the remote database.');
    },
  };
}
