import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const compile = (path) => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const shared = { exports: {} };
vm.runInNewContext(compile("../_shared/email-template.ts"), shared);
const source = compile("./index.ts");

function setup(options = {}) {
  const templates = {
    subscription_expiring: {
      template_key: "subscription_expiring", subject: "Promemoria {{subscriptionType}}",
      html_content: '<h1>Template admin</h1><p>{{userName}}: {{subscriptionType}}, {{daysRemaining}} giorni, {{expiresAt}}</p><p>{{freeCredits}} crediti</p>',
      updated_at: "2026-05-17T10:04:44Z",
    },
    subscription_expired: {
      template_key: "subscription_expired", subject: "Scaduto {{planName}}",
      html_content: '<h1>Template scaduto admin</h1><a href="{{ .RenewURL }}">Rinnova</a>',
      updated_at: "2026-05-17T10:04:44Z",
    },
    ...options.templates,
  };
  const now = Date.now();
  const row = (id, expiry, type = "monthly", tier = "premium") => ({
    user_id: id, premium_expires_at: new Date(expiry).toISOString(), subscription_type: type, premium_tier: tier,
  });
  const expiring = options.expiring ?? [row("user-1", now + 48 * 3600000)];
  const expired = options.expired ?? [row("user-2", now - 3600000)];
  const sent = [];
  const updates = [];
  const tables = [];
  let handler;
  const db = {
    auth: { admin: { getUserById: async (id) => ({ data: { user: { email: `${id}@example.test` } } }) } },
    from(table) {
      tables.push(table);
      const filters = {};
      let isExpired = false;
      let update;
      const query = {
        select() { return query; },
        eq(key, value) { filters[key] = value; return query; },
        in(key, values) { filters[key] = values; return query; },
        gte() { return query; },
        lte() { return query; },
        lt() { isExpired = true; return query; },
        update(value) { update = value; return query; },
        async maybeSingle() {
          if (table === "email_templates") return { data: templates[filters.template_key], error: options.templateError ?? null };
          return { data: { id: filters.id, nickname: "Mario", full_name: "Nome Privato" } };
        },
        then(resolve, reject) {
          if (table === "email_templates") {
            return Promise.resolve({
              data: Object.values(templates).filter(Boolean), error: options.templateError ?? null,
            }).then(resolve, reject);
          }
          if (update) updates.push({ table, update, filters });
          return Promise.resolve({ data: update ? null : isExpired ? expired : expiring, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  class FakeResend {
    emails = { send: async (message) => {
      if (options.sendError) return { data: null, error: { message: "Provider rejected email" } };
      sent.push(message);
      return { data: { id: `email-${sent.length}` }, error: null };
    } };
  }
  vm.runInNewContext(source, {
    exports: {}, Request, Response, URL, TextEncoder, crypto: webcrypto,
    Deno: { env: { get: () => "test-value" } },
    console: { log() {}, error() {} },
    require(name) {
      if (name.endsWith("/http/server.ts")) return { serve: (fn) => { handler = fn; } };
      if (name.includes("@supabase/supabase-js")) return { createClient: () => db };
      if (name.includes("resend@")) return { Resend: FakeResend };
      if (name === "../_shared/email-template.ts") return shared.exports;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { templates, sent, updates, tables, handler };
}

test("automatic warning and expired emails use the admin subject and HTML, including RenewURL", async () => {
  const ctx = setup();
  const response = await ctx.handler(new Request("https://example.test/check", { method: "POST" }));
  assert.equal(response.status, 200);
  assert.equal(ctx.sent.length, 2);
  assert.equal(ctx.sent[0].subject, "Promemoria Premium Mensile");
  assert.match(ctx.sent[0].html, /^<h1>Template admin<\/h1><p>Mario: Premium Mensile, 2 giorni,/);
  assert.match(ctx.sent[0].html, /10 crediti/);
  assert.equal(ctx.sent[1].html, '<h1>Template scaduto admin</h1><a href="https://loveableconnect.it/credits">Rinnova</a>');
  assert.ok(ctx.sent.every((message) => !message.html.includes("{{") && !message.html.includes("26 crediti")));
  const result = await response.json();
  assert.equal(result.expiring_sent, 1);
  assert.equal(result.expired_sent, 1);
});

test("weekly, monthly and Platino plan names are substituted correctly", async () => {
  const expiry = new Date(Date.now() + 3600000).toISOString();
  const ctx = setup({ expired: [], expiring: [
    { user_id: "weekly", premium_expires_at: expiry, subscription_type: "weekly", premium_tier: "none" },
    { user_id: "platino", premium_expires_at: expiry, subscription_type: "monthly", premium_tier: "standard" },
  ] });
  await ctx.handler(new Request("https://example.test/check", { method: "POST" }));
  assert.deepEqual(ctx.sent.map((message) => message.subject), ["Promemoria Premium Settimanale", "Promemoria Platino"]);
});

for (const failure of ["missing", "empty", "database-error"]) {
  test(`unavailable template (${failure}) blocks sending instead of using an old fallback`, async () => {
    const ctx = setup(failure === "database-error"
      ? { templateError: { message: "Database unavailable" } }
      : { templates: { subscription_expired: failure === "missing" ? null : { subject: " ", html_content: " " } } });
    const response = await ctx.handler(new Request("https://example.test/check", { method: "POST" }));
    assert.equal(response.status, 500);
    assert.equal(ctx.sent.length, 0);
    assert.equal(ctx.updates.length, 0);
    assert.ok(ctx.tables.every((table) => table === "email_templates"));
  });
}

test("verification mode fingerprints the actual admin templates without sending or changing accounts", async () => {
  const ctx = setup();
  const response = await ctx.handler(new Request("https://example.test/check?dry_run=true"));
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.dry_run, true);
  assert.equal(result.source, "email_templates");
  assert.equal(ctx.sent.length, 0);
  assert.equal(ctx.updates.length, 0);
  assert.ok(ctx.tables.every((table) => table === "email_templates"));
  for (const template of result.templates) {
    assert.equal(template.html_sha256, createHash("sha256").update(ctx.templates[template.template_key].html_content).digest("hex"));
  }
});

test("provider rejection is not reported as a successfully sent email", async () => {
  const ctx = setup({ sendError: true, expired: [] });
  const response = await ctx.handler(new Request("https://example.test/check", { method: "POST" }));
  const result = await response.json();
  assert.equal(response.status, 500);
  assert.equal(result.success, false);
  assert.equal(result.expiring_sent, 0);
  assert.equal(result.expiring_failed, 1);
});

test("template edits take effect on the next scheduled run", async () => {
  const ctx = setup({ expired: [] });
  await ctx.handler(new Request("https://example.test/check", { method: "POST" }));
  ctx.templates.subscription_expiring.html_content = "<h1>Nuovo template salvato</h1>";
  await ctx.handler(new Request("https://example.test/check", { method: "POST" }));
  assert.equal(ctx.sent[1].html, "<h1>Nuovo template salvato</h1>");
});
