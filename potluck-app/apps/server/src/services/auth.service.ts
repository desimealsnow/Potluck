import { supabase } from '../config/supabaseClient';

export async function signup(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  // optional profile row
  if (displayName) {
    const { error: profileErr } = await supabase
      .from('profiles')
      .insert([{ id: data.user!.id, display_name: displayName }]);
    if (profileErr) return { error: profileErr.message };
  }

  return { user: data.user, session: data.session };
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  return { user: data.user, session: data.session };
}

export async function logout(accessToken: string) {
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  return { success: true };
}
