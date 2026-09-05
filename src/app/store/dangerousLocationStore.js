import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import { areaAdvisoryToWarning, warningPayloadToAreaAdvisory } from "@/lib/areaAdvisoryAdapter";

async function fetchAreaAdvisoryRows() {
  const { data, error } = await supabase
    .from("route_advisories")
    .select("*")
    .eq("advisory_kind", "area")
    .order("created_at", { ascending: false });

  if (!error) return { rows: data || [], source: "route_advisories" };

  const legacy = await supabase
    .from("dangerous_location_warnings")
    .select("*")
    .order("created_at", { ascending: false });

  if (legacy.error) throw legacy.error;
  return { rows: legacy.data || [], source: "legacy" };
}

export const useDangerousLocationStore = create((set, get) => ({
  warnings: [],
  loading: false,
  error: null,
  isSubscribed: false,

  fetchWarnings: async () => {
    set({ loading: true, error: null });
    try {
      const { rows, source } = await fetchAreaAdvisoryRows();
      const warnings =
        source === "route_advisories"
          ? rows.map(areaAdvisoryToWarning).filter(Boolean)
          : rows;

      set({ warnings, loading: false, error: null });
    } catch (err) {
      set({ loading: false, error: err.message || "Could not load area hazards." });
      return;
    }

    if (get().isSubscribed) return;
    set({ isSubscribed: true });

    const existingChannels = supabase.getChannels();
    existingChannels.forEach((ch) => {
      if (ch.topic === "realtime:area_advisories_sync") {
        supabase.removeChannel(ch);
      }
    });

    supabase
      .channel("area_advisories_sync")
      .on(
        "postgres_changes",
        { event: "*", table: "route_advisories", schema: "public" },
        (payload) => {
          const row = payload.new || payload.old;
          if (row?.advisory_kind && row.advisory_kind !== "area") return;

          if (payload.eventType === "INSERT" && payload.new?.advisory_kind === "area") {
            const warning = areaAdvisoryToWarning(payload.new);
            set((state) => {
              if (state.warnings.some((w) => w.id === warning.id)) return state;
              return { warnings: [warning, ...state.warnings] };
            });
          } else if (payload.eventType === "UPDATE" && payload.new?.advisory_kind === "area") {
            const warning = areaAdvisoryToWarning(payload.new);
            set((state) => ({
              warnings: state.warnings.map((w) => (w.id === warning.id ? warning : w)),
            }));
          } else if (payload.eventType === "DELETE") {
            set((state) => ({
              warnings: state.warnings.filter((w) => w.id !== payload.old.id),
            }));
          }
        }
      )
      .subscribe();
  },

  addWarning: async (payload) => {
    try {
      const insertPayload = warningPayloadToAreaAdvisory(payload);
      const { data, error } = await supabase
        .from("route_advisories")
        .insert([insertPayload])
        .select();

      if (error) throw error;
      const warning = areaAdvisoryToWarning(data?.[0]);
      return { success: true, warning: warning || data?.[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateWarning: async (id, payload) => {
    try {
      const updatePayload = warningPayloadToAreaAdvisory({ ...payload, status: payload.status || "Active" });
      const { error } = await supabase.from("route_advisories").update(updatePayload).eq("id", id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  setWarningStatus: async (id, status) => {
    try {
      const { error } = await supabase.from("route_advisories").update({ status }).eq("id", id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteWarning: async (id) => {
    await supabase.from("route_advisories").delete().eq("id", id);
  },
}));
