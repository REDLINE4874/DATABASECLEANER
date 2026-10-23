import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const $ = id => document.getElementById(id);
const form = $('auth-form'), email = $('auth-email'), password = $('auth-password');
const submit = $('auth-submit'), message = $('auth-message');
const setMessage = text => { message.textContent = text; };
const setBusy = busy => { submit.disabled = busy; };
const showApp = (session) => {
  const authenticated = Boolean(session?.user);
  document.body.classList.toggle('auth-locked', !authenticated);
  $('auth-user').textContent = authenticated ? session.user.email : '';
  $('auth-logout').hidden = !authenticated;
};

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  setMessage('Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en frontend/js/auth/config.js.');
} else if (!window.supabase?.createClient) {
  setMessage('No se pudo cargar la biblioteca de Supabase. Revisa tu conexión.');
} else {
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const signIn = async () => {
    setBusy(true); setMessage('Iniciando sesión…');
    const { error } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
    setBusy(false);
    if (error) setMessage(error.message);
  };

  form.onsubmit = event => { event.preventDefault(); signIn(); };
  $('auth-logout').onclick = async () => { await client.auth.signOut(); location.reload(); };
  client.auth.onAuthStateChange((_event, session) => showApp(session));
  client.auth.getSession().then(({ data }) => showApp(data.session));
}
