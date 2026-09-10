import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

const flush = () => new Promise(resolve => setImmediate(resolve));
const quietConsole = { ...console, warn() {}, log() {} };

function load(relativePath, dependencies, globals = {}) {
  const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, require: name => {
      if (!(name in dependencies)) throw new Error(`Missing test dependency: ${name}`);
      return dependencies[name];
    }, console: quietConsole, setTimeout, clearTimeout, ...globals,
  }, { filename: relativePath });
  return exports;
}

function scheduler() {
  let nextId = 0;
  const pending = new Map();
  return {
    pending,
    setTimeout(fn, delay) { const id = ++nextId; pending.set(id, { fn, delay }); return id; },
    clearTimeout(id) { pending.delete(id); },
    async fire(delay) {
      const entry = [...pending].find(([, item]) => item.delay === delay);
      assert.ok(entry, `Expected pending ${delay}ms timer`);
      pending.delete(entry[0]);
      entry[1].fn();
      await flush();
    },
  };
}

function queryHarness() {
  const clock = scheduler();
  const asyncHelpers = load('src/lib/async.ts', {}, clock);
  const state = { userId: 'user-a', options: null, inserted: 0, timeouts: 0 };
  const balance = { balance: 7, is_premium: false, last_daily_reset: '2026-09-10', daily_likes_remaining: 3 };
  state.select = () => Promise.resolve({ data: balance, error: null });
  state.rpc = () => Promise.resolve({ data: [], error: null });
  state.insert = () => Promise.resolve({ data: null, error: null });
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  const dependencies = {
    '@tanstack/react-query': {
      useQuery: options => { state.options = options; return {}; },
      useQueryClient: () => client,
    },
    '@/hooks/use-toast': { useToast: () => ({ toast() {} }) },
    '@/hooks/useCurrentUserId': { useCurrentUserId: () => state.userId },
    '@/lib/storedSession': { getStoredUserId: () => state.userId },
    '@/lib/async': asyncHelpers,
    '@/hooks/useConnectionWatchdog': { reportSupabaseTimeout: () => state.timeouts++ },
    '@/integrations/supabase/client': { supabase: {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => state.select(), single: () => state.select() }) }),
        insert: () => { state.inserted++; return state.insert(); },
      }),
      rpc: (...args) => state.rpc(...args),
    } },
  };
  return { state, clock, client, balance, dependencies,
    credits: load('src/hooks/useCredits.ts', dependencies),
    likes: load('src/hooks/useDailyLikes.ts', dependencies),
  };
}

test('a failed balance read retries without initializing a fake balance', async () => {
  const h = queryHarness();
  let attempts = 0;
  h.state.select = async () => ++attempts === 1
    ? { data: null, error: new Error('temporary server error') }
    : { data: h.balance, error: null };
  h.credits.useCredits();
  const result = await h.client.fetchQuery({ ...h.state.options, retryDelay: 0 });
  assert.equal(result.balance, 7);
  assert.equal(attempts, 2);
  assert.equal(h.state.inserted, 0);
  assert.equal(h.state.timeouts, 0);
  h.client.clear();
});

test('failed background refresh preserves the last successful balance', async () => {
  const h = queryHarness();
  h.credits.useCredits();
  const options = { ...h.state.options, staleTime: 0, retry: false };
  await h.client.fetchQuery(options);
  h.state.select = async () => ({ data: null, error: new Error('offline') });
  await assert.rejects(h.client.fetchQuery(options), /offline/);
  assert.equal(h.client.getQueryData(options.queryKey).balance, 7);
  h.client.clear();
});

test('missing credit row with failed insert is an error, not ten invented credits', async () => {
  const h = queryHarness();
  h.state.select = async () => ({ data: null, error: null });
  h.state.insert = async () => ({ error: new Error('insert denied') });
  await assert.rejects(h.credits.fetchCredits('user-a'), /insert denied/);
});

test('stalled balance and likes reads time out and can recover on a subsequent attempt', async () => {
  const h = queryHarness();
  h.state.select = () => new Promise(() => {});
  const balanceFailure = assert.rejects(h.credits.fetchCredits('user-a'), /TIMEOUT_SELECT_USER_CREDITS/);
  await h.clock.fire(12000);
  await balanceFailure;
  assert.equal(h.state.timeouts, 1);
  h.state.rpc = () => new Promise(() => {});
  const likesFailure = assert.rejects(h.likes.fetchDailyLikes('user-a'), /TIMEOUT_DAILY_LIKES/);
  await h.clock.fire(12000);
  await likesFailure;
  h.state.rpc = async () => ({ data: [{ likes_remaining: 3, is_premium: false, reset_at: null }], error: null });
  assert.equal((await h.likes.fetchDailyLikes('user-a')).likesRemaining, 3);
  assert.equal(h.clock.pending.size, 0);
});

test('empty likes response remains retryable instead of becoming a successful null', async () => {
  const h = queryHarness();
  await assert.rejects(h.likes.fetchDailyLikes('user-a'), /non disponibili/);
});

test('account changes isolate credit and likes caches and disable signed-out queries', async () => {
  const h = queryHarness();
  for (const hook of [h.credits.useCredits, h.likes.useDailyLikes]) {
    h.state.userId = 'user-a'; hook();
    const oldOptions = h.state.options;
    h.client.setQueryData(oldOptions.queryKey, { balance: 99 });
    h.state.userId = 'user-b'; hook();
    assert.equal(h.client.getQueryData(h.state.options.queryKey), undefined);
    await assert.rejects(oldOptions.queryFn(), /Sessione cambiata/);
    h.state.userId = null; hook();
    assert.equal(h.state.options.enabled, false);
  }
  h.client.clear();
});

function dashboardHarness() {
  const clock = scheduler();
  const effects = [], channels = new Set(), listeners = new Map(), navigations = [], requests = [];
  const cache = new Map([['dash_cache_v1_user-a_matches', JSON.stringify([{ id: 'cached-match' }])]]);
  const profile = { id: 'user-a', birthdate: '1990-01-01', city: 'Roma', tutorial_completed: true };
  const state = { response: table => Promise.resolve({ data: table === 'profiles' ? profile : table === 'user_roles' ? null : [], error: null }) };
  const supabase = {
    from(table) {
      const chain = new Proxy({}, { get: (_, key) => key === 'then'
        ? (resolve, reject) => { requests.push(table); return state.response(table).then(resolve, reject); }
        : () => chain });
      return chain;
    },
    channel(name) {
      const channel = { name, on() { return this; }, subscribe() { channels.add(this); return this; } };
      return channel;
    },
    removeChannel(channel) { channels.delete(channel); },
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
  };
  const dummyModule = new Proxy({}, { get: (_, key) => key });
  const dependencies = new Proxy({
    react: { useEffect: fn => effects.push(fn), useRef: value => ({ current: value }),
      useState: initial => { let value = typeof initial === 'function' ? initial() : initial; return [value, next => { value = typeof next === 'function' ? next(value) : next; }]; } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-router-dom': { useNavigate: () => path => navigations.push(path) },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/hooks/use-toast': { useToast: () => ({ toast() {} }) },
    '@/hooks/useBanCheck': { useBanCheck() {} },
    '@/contexts/MatchNotificationContext': { useMatchNotification: () => ({ hasNew: false }) },
    '@/lib/storedSession': { getStoredUserId: () => 'user-a' },
    '@/lib/async': load('src/lib/async.ts', {}, clock),
    '@/integrations/supabase/client': { supabase },
  }, { has: () => true, get: (object, key) => key in object ? object[key] : dummyModule });
  const module = load('src/pages/Dashboard.tsx', dependencies, {
    ...clock,
    window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) },
    localStorage: { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) },
  });
  module.default();
  // The third effect owns the initial profile/counters fetch and its recovery.
  const cleanup = effects[2]();
  return { clock, state, channels, listeners, navigations, requests, cache, profile, cleanup };
}

test('dashboard retries a failed profile without redirecting a valid login', async () => {
  const h = dashboardHarness();
  const success = h.state.response;
  let failed = false;
  h.state.response = table => table === 'profiles' && !failed
    ? (failed = true, Promise.resolve({ data: null, error: new Error('temporary failure') }))
    : success(table);
  await flush();
  assert.equal(h.navigations.length, 0);
  await h.clock.fire(1500);
  assert.equal(JSON.parse(h.cache.get('dash_cache_v1_user-a_profile')).id, 'user-a');
  assert.equal(h.channels.size, 5);
  h.cleanup();
  assert.equal(h.channels.size, 0);
  assert.equal(h.clock.pending.size, 0);
});

test('dashboard coalesces overlapping loads and does not duplicate channels on focus', async () => {
  const h = dashboardHarness();
  h.listeners.get('focus')(); h.listeners.get('online')();
  await flush();
  assert.equal(h.requests.filter(table => table === 'profiles').length, 1);
  assert.equal(h.channels.size, 5);
  h.listeners.get('focus')();
  await flush();
  assert.equal(h.requests.filter(table => table === 'profiles').length, 2);
  assert.equal(h.channels.size, 5);
  h.cleanup();
});

test('a slow dashboard counter preserves cache and recovers automatically', async () => {
  const h = dashboardHarness();
  const success = h.state.response;
  h.state.response = table => table === 'matches' ? new Promise(() => {}) : success(table);
  await flush();
  await h.clock.fire(5000);
  assert.equal(JSON.parse(h.cache.get('dash_cache_v1_user-a_matches'))[0].id, 'cached-match');
  h.state.response = success;
  await h.clock.fire(1500);
  assert.equal(h.cache.get('dash_cache_v1_user-a_matches'), '[]');
  h.cleanup();
});

test('leaving the dashboard cancels recovery and ignores late responses', async () => {
  const h = dashboardHarness();
  let resolveProfile;
  h.state.response = () => new Promise(resolve => { resolveProfile = resolve; });
  await flush();
  h.cleanup();
  resolveProfile({ data: h.profile, error: null });
  await flush();
  assert.equal(h.cache.has('dash_cache_v1_user-a_profile'), false);
  assert.equal(h.channels.size, 0);
  assert.equal(h.clock.pending.size, 0);
});

test('credit box stays visible after a failed read and preserves a known balance during refresh', () => {
  const state = { credits: undefined, loading: false, error: new Error('offline'), isFetching: false, refetch() {} };
  const { CreditsDisplay } = load('src/components/CreditsDisplay.tsx', {
    'react/jsx-runtime': jsxRuntime,
    '@/hooks/useCredits': { useCredits: () => state },
    '@/hooks/useDailyLikes': { useDailyLikes: () => ({ hasData: false, error: new Error('offline'), refetch() {} }) },
    '@/components/ui/button': { Button: 'button' },
    'lucide-react': { Coins: 'svg', Crown: 'svg' },
    'react-router-dom': { useNavigate: () => () => {} },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '@/components/CreditCountdown': { CreditCountdown: () => null },
    '@/components/DailyLikesDisplay': { DailyLikesDisplay: () => null },
  });
  assert.match(renderToStaticMarkup(CreditsDisplay()), /Saldo non disponibile · Riprova/);
  assert.equal(CreditsDisplay().props.onClick, state.refetch);
  state.isFetching = true;
  assert.match(renderToStaticMarkup(CreditsDisplay()), /Recupero saldo/);
  state.credits = { balance: 7, is_premium: false };
  const html = renderToStaticMarkup(CreditsDisplay());
  assert.match(html, /7 dashboard.credits/);
  assert.match(html, /Like non disponibili · Riprova/);
});
