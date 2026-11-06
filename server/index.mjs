/**
 * Guodelist API — zero-dependency Node server.
 *
 * Auth: scrypt password hashes, HS256 JWTs signed with APP_SECRET.
 * Storage: a single JSON file, written atomically. Good enough for a personal
 * deployment; swap in Postgres when concurrency matters.
 */
import http from "node:http";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = process.env.DATA_FILE || join(process.cwd(), "data", "db.json");
const SECRET = process.env.APP_SECRET || "dev-secret-change-me";
const TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

/* ------------------------------- storage -------------------------------- */
function load() {
  const empty = { users: [], lists: [], tasks: [], deletedLists: {}, deletedTasks: {} };
  if (!existsSync(DATA_FILE)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8"));
    return {
      ...empty,
      ...parsed,
      deletedLists: parsed.deletedLists || {},
      deletedTasks: parsed.deletedTasks || {},
    };
  } catch {
    return empty;
  }
}
let db = load();

function save() {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, DATA_FILE);
}

/* ------------------------------- helpers -------------------------------- */
const now = () => new Date().toISOString();
const uid = (p) => `${p}_${randomBytes(9).toString("hex")}`;

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (str) => Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + TOKEN_TTL }));
  const sig = b64url(createHmac("sha256", SECRET).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}
function verifyToken(token) {
  const [h, b, s] = String(token).split(".");
  if (!h || !b || !s) return null;
  const expect = b64url(createHmac("sha256", SECRET).update(`${h}.${b}`).digest());
  if (s !== expect) return null;
  try {
    const payload = JSON.parse(unb64url(b).toString("utf8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data),
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    disabled: Boolean(user.disabled),
    createdAt: user.createdAt,
  };
}

function auth(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyToken(token) : null;
  if (!payload) return null;
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user || user.disabled) return null;
  return user;
}

function requireUser(req, res) {
  const user = auth(req);
  if (!user) {
    json(res, 401, { error: "unauthorized" });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireUser(req, res);
  if (!user) return null;
  if (user.role !== "admin") {
    json(res, 403, { error: "forbidden" });
    return null;
  }
  return user;
}

/* --------------------------------- seed --------------------------------- */
if (db.users.length === 0) {
  const bootstrap = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");
  db.users.push({
    id: uid("usr"),
    email: ADMIN_EMAIL,
    name: "管理员",
    password: hashPassword(bootstrap),
    role: "admin",
    disabled: false,
    createdAt: now(),
  });
  save();
  console.log(`seeded admin ${ADMIN_EMAIL} with password: ${bootstrap}`);
}

/* --------------------------------- routes -------------------------------- */
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

route("GET", /^\/api\/v1\/health$/, (req, res) => json(res, 200, { ok: true, users: db.users.length }));

/* ---------------------------------- sync ----------------------------------
 * Last-write-wins per record with tombstones — the shape small sync engines
 * (CouchDB/PouchDB, Todoist's v9 sync) use. Clients send everything they have,
 * the server merges by updatedAt and echoes the merged state back, so no
 * device silently drops another device's newer edit.
 */
const later = (a, b) => String(a || "") > String(b || "");
const tombKey = (userId, id) => `${userId}|${id}`;
const tombstoneAt = (map, userId, id) => map[tombKey(userId, id)];
const putTombstone = (map, userId, id, ts) => {
  const key = tombKey(userId, id);
  if (later(ts, map[key])) map[key] = ts;
};
const tombstonesFor = (map, userId) => {
  const prefix = `${userId}|`;
  return Object.fromEntries(
    Object.entries(map)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, ts]) => [key.slice(prefix.length), ts]),
  );
};

route("POST", /^\/api\/v1\/sync$/, async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  const stamp = now();

  for (const list of Array.isArray(body.lists) ? body.lists : []) {
    if (!list?.id) continue;
    const existing = db.lists.find((l) => l.id === list.id && l.userId === user.id);
    if (existing) {
      if (later(list.updatedAt, existing.updatedAt)) Object.assign(existing, list, { userId: user.id });
    } else if (!later(tombstoneAt(db.deletedLists, user.id, list.id), list.updatedAt)) {
      db.lists.push({ ...list, userId: user.id, updatedAt: list.updatedAt || stamp });
    }
  }

  for (const task of Array.isArray(body.tasks) ? body.tasks : []) {
    if (!task?.id) continue;
    const existing = db.tasks.find((t) => t.id === task.id && t.userId === user.id);
    if (existing) {
      if (later(task.updatedAt, existing.updatedAt)) Object.assign(existing, task, { userId: user.id });
    } else if (!later(tombstoneAt(db.deletedTasks, user.id, task.id), task.updatedAt)) {
      db.tasks.push({ ...task, userId: user.id, updatedAt: task.updatedAt || stamp });
    }
  }

  for (const [id, ts] of Object.entries(body.deleted?.lists || {})) {
    db.lists = db.lists.filter((l) => !(l.id === id && l.userId === user.id));
    putTombstone(db.deletedLists, user.id, id, ts);
  }
  for (const [id, ts] of Object.entries(body.deleted?.tasks || {})) {
    db.tasks = db.tasks.filter((t) => !(t.id === id && t.userId === user.id));
    putTombstone(db.deletedTasks, user.id, id, ts);
  }

  save();
  json(res, 200, {
    serverTime: stamp,
    lists: db.lists.filter((l) => l.userId === user.id),
    tasks: db.tasks.filter((t) => t.userId === user.id),
    deleted: {
      lists: tombstonesFor(db.deletedLists, user.id),
      tasks: tombstonesFor(db.deletedTasks, user.id),
    },
  });
});

route("POST", /^\/api\/v1\/auth\/register$/, async (req, res) => {
  const { email, password, name } = await readBody(req);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: "邮箱格式不正确" });
  if (!password || String(password).length < 8) return json(res, 400, { error: "密码至少 8 位" });
  if (db.users.some((u) => u.email.toLowerCase() === String(email).toLowerCase()))
    return json(res, 409, { error: "邮箱已被注册" });

  const user = {
    id: uid("usr"),
    email: String(email).trim(),
    name: String(name || email.split("@")[0]).slice(0, 40),
    password: hashPassword(String(password)),
    role: "user",
    disabled: false,
    createdAt: now(),
  };
  db.users.push(user);
  save();
  json(res, 201, { token: signToken({ sub: user.id }), user: publicUser(user) });
});

route("POST", /^\/api\/v1\/auth\/login$/, async (req, res) => {
  const { email, password } = await readBody(req);
  const user = db.users.find((u) => u.email.toLowerCase() === String(email || "").toLowerCase());
  if (!user || !verifyPassword(String(password || ""), user.password))
    return json(res, 401, { error: "邮箱或密码不正确" });
  if (user.disabled) return json(res, 403, { error: "账号已被停用" });
  json(res, 200, { token: signToken({ sub: user.id }), user: publicUser(user) });
});

route("GET", /^\/api\/v1\/me$/, (req, res) => {
  const user = requireUser(req, res);
  if (user) json(res, 200, { user: publicUser(user) });
});

/* lists */
route("GET", /^\/api\/v1\/lists$/, (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  json(res, 200, { lists: db.lists.filter((l) => l.userId === user.id) });
});

route("POST", /^\/api\/v1\/lists$/, async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const { name, emoji, color } = await readBody(req);
  if (!name) return json(res, 400, { error: "名字不能为空" });
  const list = { id: uid("lst"), userId: user.id, name: String(name).slice(0, 60), emoji: emoji || "📋", color: color || "", createdAt: now(), updatedAt: now() };
  db.lists.push(list);
  save();
  json(res, 201, { list });
});

route("PATCH", /^\/api\/v1\/lists\/([\w-]+)$/, async (req, res, id) => {
  const user = requireUser(req, res);
  if (!user) return;
  const list = db.lists.find((l) => l.id === id && l.userId === user.id);
  if (!list) return json(res, 404, { error: "清单不存在" });
  Object.assign(list, await readBody(req), { id: list.id, userId: user.id, updatedAt: now() });
  save();
  json(res, 200, { list });
});

route("DELETE", /^\/api\/v1\/lists\/([\w-]+)$/, (req, res, id) => {
  const user = requireUser(req, res);
  if (!user) return;
  db.lists = db.lists.filter((l) => !(l.id === id && l.userId === user.id));
  db.tasks = db.tasks.filter((t) => !(t.listId === id && t.userId === user.id));
  putTombstone(db.deletedLists, user.id, id, now());
  save();
  json(res, 200, { ok: true });
});

/* tasks */
route("GET", /^\/api\/v1\/tasks$/, (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  json(res, 200, { tasks: db.tasks.filter((t) => t.userId === user.id) });
});

route("POST", /^\/api\/v1\/tasks$/, async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const body = await readBody(req);
  if (!body.title) return json(res, 400, { error: "标题不能为空" });
  const task = {
    id: uid("tsk"),
    userId: user.id,
    title: String(body.title).slice(0, 200),
    notes: String(body.notes || ""),
    listId: body.listId || null,
    done: Boolean(body.done),
    dueDate: body.dueDate || null,
    dueTime: body.dueTime || null,
    endTime: body.endTime || null,
    priority: body.priority || "none",
    updatedAt: now(),
    createdAt: now(),
  };
  db.tasks.push(task);
  save();
  json(res, 201, { task });
});

route("PATCH", /^\/api\/v1\/tasks\/([\w-]+)$/, async (req, res, id) => {
  const user = requireUser(req, res);
  if (!user) return;
  const task = db.tasks.find((t) => t.id === id && t.userId === user.id);
  if (!task) return json(res, 404, { error: "任务不存在" });
  Object.assign(task, await readBody(req), { id: task.id, userId: task.userId, updatedAt: now() });
  save();
  json(res, 200, { task });
});

route("DELETE", /^\/api\/v1\/tasks\/([\w-]+)$/, (req, res, id) => {
  const user = requireUser(req, res);
  if (!user) return;
  db.tasks = db.tasks.filter((t) => !(t.id === id && t.userId === user.id));
  putTombstone(db.deletedTasks, user.id, id, now());
  save();
  json(res, 200, { ok: true });
});

/* admin */
route("GET", /^\/api\/v1\/admin\/stats$/, (req, res) => {
  if (!requireAdmin(req, res)) return;
  json(res, 200, {
    users: db.users.length,
    tasks: db.tasks.length,
    lists: db.lists.length,
    active: db.users.filter((u) => !u.disabled).length,
  });
});

route("GET", /^\/api\/v1\/admin\/users$/, (req, res) => {
  if (!requireAdmin(req, res)) return;
  json(res, 200, {
    users: db.users.map((u) => ({
      ...publicUser(u),
      tasks: db.tasks.filter((t) => t.userId === u.id).length,
    })),
  });
});

route("PATCH", /^\/api\/v1\/admin\/users\/([\w-]+)$/, async (req, res, id) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const user = db.users.find((u) => u.id === id);
  if (!user) return json(res, 404, { error: "用户不存在" });
  const { disabled, role } = await readBody(req);
  if (typeof disabled === "boolean") user.disabled = disabled;
  if (role === "admin" || role === "user") user.role = role;
  save();
  json(res, 200, { user: publicUser(user) });
});

route("POST", /^\/api\/v1\/admin\/users\/([\w-]+)\/password$/, async (req, res, id) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const user = db.users.find((u) => u.id === id);
  if (!user) return json(res, 404, { error: "用户不存在" });
  const { password } = await readBody(req);
  if (!password || String(password).length < 8) return json(res, 400, { error: "密码至少 8 位" });
  user.password = hashPassword(String(password));
  save();
  json(res, 200, { ok: true });
});

route("DELETE", /^\/api\/v1\/admin\/users\/([\w-]+)$/, (req, res, id) => {
  const admin = requireAdmin(req, res);
  if (!admin) return;
  if (admin.id === id) return json(res, 400, { error: "不能删除自己" });
  db.users = db.users.filter((u) => u.id !== id);
  db.tasks = db.tasks.filter((t) => t.userId !== id);
  db.lists = db.lists.filter((l) => l.userId !== id);
  save();
  json(res, 200, { ok: true });
});

/* -------------------------------- server -------------------------------- */
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const match = r.pattern.exec(url.pathname);
    if (!match) continue;
    try {
      await r.handler(req, res, ...match.slice(1));
    } catch (error) {
      json(res, 500, { error: error instanceof Error ? error.message : "服务器错误" });
    }
    return;
  }
  json(res, 404, { error: "not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`guodelist api listening on :${PORT}`);
});
