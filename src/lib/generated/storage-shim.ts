export const STORAGE_SHIM = `<script>
(function () {
  try {
    var key = '__vibecraft_storage_probe__';
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return;
  } catch (error) {
    var memory = {};
    var shim = {
      getItem: function (key) { return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null; },
      setItem: function (key, value) { memory[key] = String(value); },
      removeItem: function (key) { delete memory[key]; },
      clear: function () { memory = {}; },
      key: function (index) { return Object.keys(memory)[index] || null; },
      get length() { return Object.keys(memory).length; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: shim, configurable: true }); } catch {}
  }
})();
</script>`;
