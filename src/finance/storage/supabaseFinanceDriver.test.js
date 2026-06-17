import { describe, expect, it } from "vitest";
import { createSupabaseStorageDriver } from "./supabaseFinanceDriver";

function createFakeSupabase({ user = { id: "user-1" }, row = null } = {}) {
  const calls = {};

  return {
    calls,
    auth: {
      async getUser() {
        return { data: { user }, error: null };
      },
    },
    from(table) {
      calls.table = table;
      return {
        select(columns) {
          calls.selectColumns = columns;
          return {
            eq(column, value) {
              calls.eq = { column, value };
              return {
                async maybeSingle() {
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        async upsert(values, options) {
          calls.upsert = { values, options };
          return { data: null, error: null };
        },
      };
    },
  };
}

describe("createSupabaseStorageDriver", () => {
  it("throws when no client is provided", () => {
    expect(() => createSupabaseStorageDriver()).toThrow(/Supabase client is required/i);
  });

  it("load() returns the stored bundle for the signed-in user", async () => {
    const bundle = { transactions: [{ id: "txn_1" }], categories: [] };
    const supabase = createFakeSupabase({ row: { data: bundle } });
    const driver = createSupabaseStorageDriver({ supabase });

    const result = await driver.load();

    expect(result).toEqual(bundle);
    expect(supabase.calls.table).toBe("finance_state");
    expect(supabase.calls.eq).toEqual({ column: "user_id", value: "user-1" });
  });

  it("load() returns null when the user has no row yet", async () => {
    const supabase = createFakeSupabase({ row: null });
    const driver = createSupabaseStorageDriver({ supabase });

    expect(await driver.load()).toBeNull();
  });

  it("save() upserts the bundle keyed by the user id and returns the payload", async () => {
    const supabase = createFakeSupabase();
    const driver = createSupabaseStorageDriver({ supabase });
    const bundle = { transactions: [{ id: "txn_2" }] };

    const returned = await driver.save(bundle);

    expect(returned).toBe(bundle);
    expect(supabase.calls.upsert.values.user_id).toBe("user-1");
    expect(supabase.calls.upsert.values.data).toEqual(bundle);
    expect(supabase.calls.upsert.options).toEqual({ onConflict: "user_id" });
  });

  it("throws a clear error when no user is signed in", async () => {
    const supabase = createFakeSupabase({ user: null });
    const driver = createSupabaseStorageDriver({ supabase });

    await expect(driver.load()).rejects.toThrow(/signed in/i);
    await expect(driver.save({})).rejects.toThrow(/signed in/i);
  });
});
