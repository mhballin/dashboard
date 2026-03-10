const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const getToken = () => localStorage.getItem("pb_token");
const getUserId = () => localStorage.getItem("pb_userId");

export async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = (data && data.message) || text || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  const token = data?.token || data?.accessToken || (data?.data && data.data.token);
  const userId = data?.userId || data?.user?.id || (data?.data && data.data.userId);
  const emailOut = data?.email || (data?.user && data.user.email) || null;

  if (!token || !userId) {
    throw new Error("Login response missing token or userId");
  }

  localStorage.setItem("pb_token", token);
  localStorage.setItem("pb_userId", userId);

  return { token, userId, email: emailOut };
}

export function logout() {
  localStorage.removeItem("pb_token");
  localStorage.removeItem("pb_userId");
}

export function isLoggedIn() {
  return !!getToken();
}

async function pbFetch(method, path, body) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${API}/api${p}`;

  const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + getToken() };

  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();

  if (!res.ok && res.status !== 404) {
    const msg = text || `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }

  if (res.status === 404) return null;
  if (!text) return null;

  try { return JSON.parse(text); } catch { return text; }

}

export async function getSetting(key) {
  const filter = `(key="${key}"&&user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=1`;
  const res = await pbFetch('GET', `/collections/settings/records${q}`);
  const records = (res && (res.records || res.items)) || [];
  if (!records.length) return null;
  const val = records[0].value;
  try { return JSON.parse(val); } catch { return val; }
}

export async function setSetting(key, value) {
  const filter = `(key="${key}"&&user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=1`;
  const existing = await pbFetch('GET', `/collections/settings/records${q}`);
  const records = (existing && (existing.records || existing.items)) || [];

  const payload = { value: JSON.stringify(value) };

  if (records.length) {
    const id = records[0].id;
    return await pbFetch('PATCH', `/collections/settings/records/${id}`, payload);
  }

  const createBody = { key, value: JSON.stringify(value), user: getUserId() };
  return await pbFetch('POST', `/collections/settings/records`, createBody);
}

export async function getAllSettings() {
  const filter = `(user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=200`;
  const res = await pbFetch('GET', `/collections/settings/records${q}`);
  const records = (res && (res.records || res.items)) || [];
  return records.reduce((acc, r) => {
    try { acc[r.key] = JSON.parse(r.value); } catch { acc[r.key] = r.value; }
    return acc;
  }, {});
}

export async function getCards() {
  const filter = `(user="${getUserId()}")`;
  const q = `?filter=${encodeURIComponent(filter)}&perPage=500&sort=-created`;
  const res = await pbFetch('GET', `/collections/cards/records${q}`);
  return (res && (res.records || res.items)) || [];
}

export async function createCard(card) {
  const { id, ...rest } = card;
  const body = { ...rest, user: getUserId() };
  return await pbFetch('POST', `/collections/cards/records`, body);
}

export async function updateCard(id, changes) {
  return await pbFetch('PATCH', `/collections/cards/records/${id}`, changes);
}

export async function deleteCard(id) {
  return await pbFetch('DELETE', `/collections/cards/records/${id}`);
}

export async function updateCards(cards) {
  return Promise.all(cards.map((c) => updateCard(c.id, c)));
}

// End of file
