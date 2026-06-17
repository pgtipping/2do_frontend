const FINANCE_STATE_TABLE = "finance_state";

// Storage driver for the finance repository, backed by Supabase. Implements the
// same { load, save } contract as createIndexedDbStorageDriver, so it drops into
// createFinanceRepository({ driver }) with no other changes. The whole finance
// bundle is stored as one JSONB row per user, guarded by Row-Level Security.
export function createSupabaseStorageDriver({ supabase } = {}) {
  if (!supabase) {
    throw new Error("A Supabase client is required for the finance storage driver.");
  }

  const getUserId = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    const user = data?.user;

    if (!user) {
      throw new Error("You must be signed in to load or save finance data.");
    }

    return user.id;
  };

  return {
    async load() {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from(FINANCE_STATE_TABLE)
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? data.data : null;
    },
    async save(payload) {
      const userId = await getUserId();
      const { error } = await supabase.from(FINANCE_STATE_TABLE).upsert(
        {
          user_id: userId,
          data: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        throw error;
      }

      return payload;
    },
  };
}
