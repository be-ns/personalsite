'use strict';

// Runs a page's inline scripts in node's vm against a browser that does
// nothing, to see what the page tells an agent: the WebMCP tools it registers
// (name, description, input schema, annotations, exactly as passed to
// registerTool) and the query-string parameters it reads on load.
//
// Every DOM object is a stand-in that accepts any property, call or `new` and
// gives back another stand-in, so the page's own code runs to the end without
// a DOM. The real parts are the ones the contract is about: location (from
// the URL given), URLSearchParams and URL (they record which parameters are
// read), localStorage and sessionStorage (in memory; they record the keys),
// document.modelContext (it records registerTool calls) and the load events
// (DOMContentLoaded and load fire after the scripts run).
//
// It needs only node built-ins, so the dependency-free test job can hold the
// contract. What needs real rendering (tool outputs, the page a prefilled link
// shows) stays in check-browser.js.

const vm = require('node:vm');

const { inlineScripts } = require('./helpers');

// A stand-in for any browser object. Reads give stand-ins (the same one each
// time, so a value written can be read back), calls and `new` give fresh ones,
// it iterates as empty, and it converts to 0 or ''.
function stub() {
  const own = new Map();
  return new Proxy(function stand() {}, {
    get(target, key) {
      if (key === Symbol.toPrimitive) return (hint) => (hint === 'number' ? 0 : '');
      if (key === Symbol.iterator) return function* empty() {};
      if (typeof key === 'symbol') return undefined;
      // Not a thenable, so `await stand` settles; empty, so loops end.
      if (key === 'then') return undefined;
      if (key === 'length') return 0;
      if (!own.has(key)) own.set(key, stub());
      return own.get(key);
    },
    set(target, key, value) { own.set(key, value); return true; },
    has() { return true; },
    deleteProperty(target, key) { own.delete(key); return true; },
    apply() { return stub(); },
    construct() { return stub(); },
  });
}

// An object whose missing properties are stand-ins.
function partial(real) {
  return new Proxy(real, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'symbol') return undefined;
      target[key] = stub();
      return target[key];
    },
  });
}

class MemoryStorage {
  constructor(keys) { Object.defineProperty(this, '_m', { value: new Map() }); Object.defineProperty(this, '_keys', { value: keys }); }
  get length() { return this._m.size; }
  key(i) { return [...this._m.keys()][i] ?? null; }
  getItem(k) { this._keys.add(String(k)); return this._m.has(String(k)) ? this._m.get(String(k)) : null; }
  setItem(k, v) { this._keys.add(String(k)); this._m.set(String(k), String(v)); }
  removeItem(k) { this._keys.add(String(k)); this._m.delete(String(k)); }
  clear() { this._m.clear(); }
}

// Runs every inline script of `html` as the page at `url` (a path such as
// "life-strategy.html?health=6,2", resolved against the live site), with
// `saved` already in localStorage. Resolves to { tools, params, storage,
// printed, errors }: tools as plain JSON (name, description, inputSchema,
// annotations or null), the parameter names read from the page's own query
// string, the storage keys touched, whether the page asked to print, and any
// error a script or load listener threw.
async function runPage(html, url, { saved = {} } = {}) {
  const where = new URL(url, 'https://bensiverly.com/');
  const tools = [];
  const params = new Set();
  const storage = new Set();
  const errors = [];
  const listeners = [];
  let printed = false;

  const location = partial({
    href: where.href, origin: where.origin, protocol: where.protocol, host: where.host, hostname: where.hostname,
    pathname: where.pathname, search: where.search, hash: where.hash, toString: () => where.href,
  });

  // Reads count only on parameters parsed from this page's own address.
  class RecordingParams extends URLSearchParams {
    constructor(init) {
      super(init);
      const own = typeof init === 'string' && (init === where.search || init === where.search.slice(1));
      Object.defineProperty(this, 'own', { value: own });
    }
    get(k) { if (this.own) params.add(String(k)); return super.get(k); }
    getAll(k) { if (this.own) params.add(String(k)); return super.getAll(k); }
    has(k) { if (this.own) params.add(String(k)); return super.has(k); }
  }
  class RecordingURL extends URL {
    get searchParams() {
      return new RecordingParams(this.href === where.href ? where.search : this.search);
    }
  }

  const on = (target) => (type, fn) => { if (typeof fn === 'function') listeners.push({ target, type, fn }); };
  const modelContext = {
    registerTool(tool) {
      tools.push(JSON.parse(JSON.stringify({
        name: tool.name, description: tool.description, inputSchema: tool.inputSchema, annotations: tool.annotations || null,
      })));
    },
  };

  const document = partial({
    readyState: 'loading', modelContext, location, cookie: '', title: '', referrer: '',
    addEventListener: on('document'), removeEventListener() {},
  });
  const navigator = partial({ userAgent: 'node', language: 'en-US', languages: ['en-US'], onLine: true });
  const never = () => new Promise(() => {});
  const sandbox = {
    document, navigator, location,
    localStorage: new MemoryStorage(storage), sessionStorage: new MemoryStorage(storage),
    URLSearchParams: RecordingParams, URL: RecordingURL,
    console: { log() {}, info() {}, warn() {}, error() {}, debug() {} },
    // Timers and network never come back: only what runs on load is read.
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, requestIdleCallback: () => 0, queueMicrotask: (fn) => queueMicrotask(fn),
    fetch: never,
    addEventListener: on('window'), removeEventListener() {},
    print: () => { printed = true; },
    innerWidth: 1280, innerHeight: 900, devicePixelRatio: 1,
  };
  for (const [k, v] of Object.entries(saved)) sandbox.localStorage.setItem(k, v);
  storage.clear();
  const context = vm.createContext(sandbox);
  context.__stub = stub;
  // window and self read through to the global, with stand-ins for anything
  // the global lacks (matchMedia, scrollTo, ...).
  vm.runInContext(`
    globalThis.window = globalThis.self = globalThis.top = globalThis.parent = new Proxy(globalThis, {
      get: (t, k) => (k in t ? t[k] : typeof k === 'symbol' ? undefined : __stub()),
      set: (t, k, v) => { t[k] = v; return true; },
    });
    document.fonts = { ready: Promise.resolve(), load: () => Promise.resolve([]), check: () => true };`, context);
  // Free names the page uses that no global has (IntersectionObserver,
  // jspdf, ...) resolve to stand-ins instead of throwing.
  const scope = vm.runInContext(
    'new Proxy({}, { has: (t, k) => typeof k === "string" && !(k in globalThis), get: (t, k) => (k === Symbol.unscopables ? undefined : __stub()) })',
    context,
  );
  context.__scope = scope;

  // Promise callbacks the page queued run before the next step.
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  for (const [i, js] of inlineScripts(html).entries()) {
    try {
      vm.runInContext(`with (__scope) {\n${js}\n}`, context, { filename: `${url} script ${i + 1}` });
    } catch (err) {
      errors.push(`script ${i + 1}: ${err && err.message}`);
    }
    await settle();
  }
  for (const type of ['DOMContentLoaded', 'load']) {
    document.readyState = type === 'load' ? 'complete' : 'interactive';
    for (const l of listeners.filter((x) => x.type === type)) {
      try { await l.fn.call(null, stub()); } catch (err) { errors.push(`${type} listener: ${err && err.message}`); }
    }
    await settle();
  }
  return { tools, params: [...params].sort(), storage: [...storage].sort(), printed, errors };
}

module.exports = { runPage };
