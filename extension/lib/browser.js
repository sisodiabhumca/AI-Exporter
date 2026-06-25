/* global AIExporter */
var AIExporter = AIExporter || {};

AIExporter.browser = (() => {
  const ext =
    typeof globalThis.browser !== "undefined"
      ? globalThis.browser
      : globalThis.chrome;

  function promisify(fn, ...args) {
    return new Promise((resolve, reject) => {
      try {
        const result = fn(...args, (value) => {
          const err = ext.runtime?.lastError;
          if (err) reject(new Error(err.message));
          else resolve(value);
        });
        if (result && typeof result.then === "function") {
          result.then(resolve).catch(reject);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  return {
    ext,

    storageGet(keys) {
      const result = ext.storage.local.get(keys);
      if (result && typeof result.then === "function") return result;
      return promisify((k, cb) => ext.storage.local.get(k, cb), keys);
    },

    storageSet(items) {
      const result = ext.storage.local.set(items);
      if (result && typeof result.then === "function") return result;
      return promisify((v, cb) => ext.storage.local.set(v, cb), items);
    },

    tabsQuery(query) {
      const result = ext.tabs.query(query);
      if (result && typeof result.then === "function") return result;
      return promisify((q, cb) => ext.tabs.query(q, cb), query);
    },

    tabsSendMessage(tabId, message) {
      const result = ext.tabs.sendMessage(tabId, message);
      if (result && typeof result.then === "function") return result;
      return promisify((id, msg, cb) => ext.tabs.sendMessage(id, msg, cb), tabId, message);
    },

    onMessage: ext.runtime.onMessage,
  };
})();
