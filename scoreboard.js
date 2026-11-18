// Shared class scoreboard: one identity per device across ALL games,
// and a ledger (hub_scores) where every game writes each round's points.
// The hub menu (index.html) adds them up so scores survive switching games.
import { supabase } from "./supabase.js";

export const CLASS_CODE = 'CLASS';

const ls = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch { return null; }
};

let cachedSid = null;
export function getSid() {
  if (cachedSid) return cachedSid;
  let s = ls('hub_sid');
  if (!s) {
    s = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : 'sid-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    ls('hub_sid', s);
  }
  return (cachedSid = s);
}

export const savedName = () => ls('hub_name') || '';
export const savedAvatar = () => ls('hub_avatar') || '';
export function rememberPlayer(name, avatar) {
  if (name) ls('hub_name', name);
  if (avatar) ls('hub_avatar', avatar);
}

export const newRoundId = () => Date.now().toString(36);

// players: [{ session_id, name, avatar, score }]. Upsert = re-grading a round
// replaces its points instead of adding them twice.
export async function recordScores(game, roundId, players) {
  const rows = (players || [])
    .filter(p => p && p.session_id && p.name)
    .map(p => ({
      class_code: CLASS_CODE,
      game,
      round_id: String(roundId || 'r0'),
      session_id: p.session_id,
      name: p.name,
      avatar: p.avatar || null,
      points: Math.max(0, parseInt(p.score, 10) || 0),
      updated_at: new Date().toISOString()
    }));
  if (!rows.length) return { error: null };
  const { error } = await supabase.from('hub_scores')
    .upsert(rows, { onConflict: 'class_code,game,round_id,session_id' });
  if (error) console.warn('Class scoreboard not updated (run setup_database.sql):', error);
  return { error };
}
