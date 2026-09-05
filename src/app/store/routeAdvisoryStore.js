import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import { isRouteAdvisoryRow } from "@/lib/areaAdvisoryAdapter";
export const useRouteAdvisoryStore = create((set, get) => ({
  advisories: [],
  loading: false,
  error: null,
  isSubscribed: false,

  fetchAdvisories: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("route_advisories")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const advisories = (data || []).filter(isRouteAdvisoryRow);
      set({ advisories, loading: false, error: null });    } catch (err) {
      set({ loading: false, error: err.message || "Could not load route advisories." });
      return;
    }

    if (get().isSubscribed) return;
    set({ isSubscribed: true });

    const existingChannels = supabase.getChannels();
    existingChannels.forEach((ch) => {
      if (ch.topic === "realtime:route_advisories_sync") {
        supabase.removeChannel(ch);
      }
    });

    supabase
      .channel("route_advisories_sync")
      .on(
        "postgres_changes",
        { event: "*", table: "route_advisories", schema: "public" },
        (payload) => {
          const row = payload.new || payload.old;
          if (row?.advisory_kind === "area") return;

          if (payload.eventType === "INSERT") {            set((state) => {
              if (state.advisories.some((a) => a.id === payload.new.id)) return state;
              return { advisories: [payload.new, ...state.advisories] };
            });
          } else if (payload.eventType === "UPDATE") {
            set((state) => ({
              advisories: state.advisories.map((a) =>
                a.id === payload.new.id ? payload.new : a
              ),
            }));
          } else if (payload.eventType === "DELETE") {
            set((state) => ({
              advisories: state.advisories.filter((a) => a.id !== payload.old.id),
            }));
          }
        }
      )
      .subscribe();
  },

  addAdvisory: async (payload) => {
    try {
      const insertPayload = {
        advisory_kind: "route",
        title: payload.title,        route_status: payload.route_status || "Caution",
        route_type: payload.route_type || "primary",
        parent_route_id: payload.parent_route_id || null,
        from_location: payload.from_location || null,
        to_location: payload.to_location,
        via_location: payload.via_location || null,
        affected_location: payload.affected_location || null,
        hazard_type: payload.hazard_type || null,
        reason: payload.reason || null,
        safety_instructions: payload.safety_instructions || null,
        warning_starts_at: payload.warning_starts_at || new Date().toISOString(),
        warning_ends_at: payload.warning_ends_at || null,
        status: "Active",
        is_public: true,
      };

      if (payload.latitude != null && payload.longitude != null) {
        insertPayload.latitude = Number(payload.latitude);
        insertPayload.longitude = Number(payload.longitude);
      }

      if (Array.isArray(payload.route_path) && payload.route_path.length >= 2) {
        insertPayload.route_path = payload.route_path;
      }

      const { data, error } = await supabase
        .from("route_advisories")
        .insert([insertPayload])
        .select();

      if (error) throw error;
      return { success: true, advisory: data?.[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateAdvisory: async (id, payload) => {
    try {
      const updatePayload = {
        title: payload.title,
        route_status: payload.route_status,
        route_type: payload.route_type,
        parent_route_id: payload.parent_route_id || null,
        from_location: payload.from_location || null,
        to_location: payload.to_location,
        via_location: payload.via_location || null,
        affected_location: payload.affected_location || null,
        hazard_type: payload.hazard_type || null,
        reason: payload.reason || null,
        safety_instructions: payload.safety_instructions || null,
        warning_starts_at: payload.warning_starts_at,
        warning_ends_at: payload.warning_ends_at || null,
        is_public: payload.is_public !== false,
      };

      if (payload.latitude != null && payload.longitude != null) {
        updatePayload.latitude = Number(payload.latitude);
        updatePayload.longitude = Number(payload.longitude);
      }

      if (Array.isArray(payload.route_path)) {
        updatePayload.route_path = payload.route_path.length >= 2 ? payload.route_path : null;
      }

      const { error } = await supabase.from("route_advisories").update(updatePayload).eq("id", id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  setAdvisoryStatus: async (id, status) => {
    try {
      const { error } = await supabase.from("route_advisories").update({ status }).eq("id", id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteAdvisory: async (id) => {
    await supabase.from("route_advisories").delete().eq("id", id);
  },
}));
