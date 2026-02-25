export interface PickResult {
  outerHTML: string
  selector: string
  styles: Record<string, string>
  text: string
}

/**
 * JS snippet injected into the page for the `pick` command.
 * Adds a hover outline and captures clicked element info.
 * Returns a promise that resolves with the picked element data.
 * Shift+click walks up to parent element. Esc cancels.
 */
export const OVERLAY_SCRIPT = `
(function() {
  return new Promise((resolve) => {
    let current = null;
    const overlay = document.createElement('div');
    overlay.id = '__chrome_cmd_overlay__';
    overlay.style.cssText = \`
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 2147483647;
      cursor: crosshair;
      pointer-events: none;
    \`;
    document.body.appendChild(overlay);

    const highlight = document.createElement('div');
    highlight.style.cssText = \`
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      background: rgba(0, 120, 255, 0.1);
      border: 2px solid rgba(0, 120, 255, 0.8);
      border-radius: 2px;
      box-sizing: border-box;
    \`;
    document.body.appendChild(highlight);

    const label = document.createElement('div');
    label.style.cssText = \`
      position: fixed;
      z-index: 2147483647;
      background: rgba(0, 0, 0, 0.75);
      color: white;
      font: 12px/1.4 monospace;
      padding: 2px 6px;
      border-radius: 3px;
      pointer-events: none;
      max-width: 400px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    \`;
    document.body.appendChild(label);

    function getSelector(el) {
      const parts = [];
      let node = el;
      while (node && node !== document.body && node.nodeType === 1) {
        let sel = node.tagName.toLowerCase();
        if (node.id) {
          sel += '#' + node.id;
          parts.unshift(sel);
          break;
        }
        if (node.className) {
          const classes = Array.from(node.classList).slice(0, 2).join('.');
          if (classes) sel += '.' + classes;
        }
        const parent = node.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(c => c.tagName === node.tagName);
          if (siblings.length > 1) sel += ':nth-of-type(' + (siblings.indexOf(node) + 1) + ')';
        }
        parts.unshift(sel);
        node = node.parentElement;
      }
      return parts.join(' > ');
    }

    function updateHighlight(el) {
      const rect = el.getBoundingClientRect();
      highlight.style.top = rect.top + 'px';
      highlight.style.left = rect.left + 'px';
      highlight.style.width = rect.width + 'px';
      highlight.style.height = rect.height + 'px';
      const sel = getSelector(el);
      label.textContent = sel;
      const labelTop = rect.top < 24 ? rect.bottom + 2 : rect.top - 22;
      label.style.top = labelTop + 'px';
      label.style.left = rect.left + 'px';
    }

    function cleanup() {
      overlay.remove();
      highlight.remove();
      label.remove();
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
    }

    function onMouseOver(e) {
      current = e.target;
      if (current === overlay || current === highlight || current === label) return;
      updateHighlight(current);
    }

    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      let el = e.shiftKey && current?.parentElement ? current.parentElement : current;
      if (!el) return;
      current = el;
      const selector = getSelector(el);
      const cs = window.getComputedStyle(el);
      const props = ['color','background-color','font-size','font-weight','display','width','height','padding','margin','border'];
      const styles = {};
      for (const p of props) styles[p] = cs.getPropertyValue(p);
      cleanup();
      resolve({ selector, outerHTML: el.outerHTML, text: el.innerText?.trim() ?? '', styles });
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') { cleanup(); resolve(null); }
    }

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  });
})()
`
