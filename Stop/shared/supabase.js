// One Supabase client + small helpers shared by every game.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://xzhznwpgbovjlnpguopb.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6aHpud3BnYm92amxucGd1b3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NTM3NTYsImV4cCI6MjEwODQyOTc1Nn0.zgJ336e1MflSXsjC9yxhUPhwbVMeCjgJi2pYBwGe3Nw";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const roomCodeFromUrl = (fallback) =>
  new URLSearchParams(location.search).get("room") || fallback;

export async function ensureRoom(code, game, status = "waiting", state = {}) {
  const { data } = await supabase.from("hub_rooms").select("*").eq("code", code).maybeSingle();
  if (data) return data;
  const { data: row } = await supabase.from("hub_rooms")
    .insert([{ code, game, status, state }]).select().single();
  return row;
}

export const patchRoom = (code, { status = null, ...state } = {}) =>
  supabase.rpc("hub_patch_room", { p_code: code, p_status: status, p_state: state });

export const joinRoom = (code, sessionId, name, extra = {}) =>
  supabase.from("hub_players")
    .upsert([{ room_code: code, session_id: sessionId, name, ...extra }], { onConflict: "room_code,session_id" })
    .select().single();

export function subscribeRoom(code, handlers) {
  const ch = supabase.channel("hub-" + code + "-" + Math.random().toString(36).slice(2));
  const f = { rooms: "code", players: "room_code", items: "room_code", votes: "room_code" };
  for (const [t, fn] of Object.entries(handlers)) {
    ch.on("postgres_changes",
      { event: "*", schema: "public", table: "hub_" + t, filter: `${f[t]}=eq.${code}` }, fn);
  }
  return ch.subscribe();
}
