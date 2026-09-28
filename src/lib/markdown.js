// Markdown rendering pipeline. Two packages that only make sense together:
//   marked@4.0.9     -> Markdown -> HTML   (ReDoS: CVE-2022-21680, CVE-2022-21681)
//   dompurify@3.4.13 -> sanitizes that HTML before it hits the DOM (mXSS / prototype pollution CVEs)
//
// On top of that, ```pipeline blocks become small flow diagrams:
//   1. a marked renderer turns the block into <div class="pipeline" data-graph="a%20--%3E%20b">
//   2. DOMPurify sanitizes the whole document (data-* attributes are allowed)
//   3. hydratePipelines() decodes data-graph and draws the steps
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const encodeGraph = (s) => encodeURIComponent(s.trim());
const decodeGraph = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return '';
  }
};

marked.use({
  gfm: true,
  breaks: true,
  renderer: {
    // marked 4 renderer signature: (code, infostring, escaped). Returning false falls back to the default.
    code(code, infostring) {
      if (infostring !== 'pipeline') return false;
      return `<div class="pipeline" data-graph="${encodeGraph(code)}"></div>\n`;
    },
  },
});

function hydratePipelines(root) {
  root.querySelectorAll('.pipeline').forEach((el) => {
    const graph = decodeGraph(el.getAttribute('data-graph') || '');
    if (!graph) {
      el.classList.add('pipeline-missing');
      el.textContent = 'Pipeline diagram unavailable: graph data was lost during sanitizing.';
      return;
    }
    graph.split(/\s*-->\s*/).forEach((step, i) => {
      if (i > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'pipeline-arrow';
        arrow.textContent = '→';
        el.appendChild(arrow);
      }
      const chip = document.createElement('span');
      chip.className = 'pipeline-step';
      chip.textContent = step;
      el.appendChild(chip);
    });
  });
}

export function renderMarkdown(src) {
  const fragment = DOMPurify.sanitize(marked.parse(src || ''), {
    USE_PROFILES: { html: true },
    RETURN_DOM_FRAGMENT: true,
  });
  const container = document.createElement('div');
  container.appendChild(fragment);
  hydratePipelines(container);
  return container.innerHTML;
}
