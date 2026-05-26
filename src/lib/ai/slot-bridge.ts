// iframe bridge protocol for slot communication
// Injected into generated HTML to enable slot discovery and highlighting

export const SLOT_BRIDGE_SCRIPT = `
<script>
(function() {
  function sendSlots() {
    var slots = document.querySelectorAll('[data-vibecraft-slot]');
    var slotData = Array.from(slots).map(function(el) {
      var rect = el.getBoundingClientRect();
      return {
        id: el.getAttribute('data-vibecraft-slot'),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      };
    });
    window.parent.postMessage({ type: 'VIBECRAFT_SLOTS', slots: slotData }, '*');
  }

  function highlightSlot(slotId) {
    document.querySelectorAll('[data-vibecraft-slot]').forEach(function(el) {
      el.style.outline = el.getAttribute('data-vibecraft-slot') === slotId
        ? '2px solid #d4453b'
        : 'none';
    });
  }

  window.addEventListener('message', function(event) {
    if (event.data.type === 'HIGHLIGHT_SLOT') {
      highlightSlot(event.data.slotId);
    }
    if (event.data.type === 'REQUEST_SLOTS') {
      sendSlots();
    }
  });

  // Send ready + slots on load
  window.addEventListener('load', function() {
    window.parent.postMessage({ type: 'RENDER_READY' }, '*');
    window.parent.postMessage({ type: 'VIBECRAFT_READY' }, '*');
    setTimeout(sendSlots, 100);
  });

  // Re-send slots on resize
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sendSlots, 200);
  });
})();
</script>
`;
