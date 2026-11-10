(() => {
  const t = globalThis.ConversationMinimapI18n.t;
  const ignored = '[data-tool-output], [data-testid="tool-output"], [data-testid="terminal"], button, script, style, textarea, input, select, [hidden], [aria-hidden="true"], .sr-only, .cdk-visually-hidden, .screen-reader-user-query-label, .screen-reader-model-response-label, .code-block-decoration, .buttons, .toolbox';
  function clean(body) {
    const clone = body.cloneNode(true);
    const originals = [...body.querySelectorAll('*')];
    const copies = [...clone.querySelectorAll('*')];
    originals.forEach((original, index) => {
      const style = getComputedStyle(original);
      if (style.display === 'none' || style.visibility === 'hidden') copies[index].remove();
    });
    clone.querySelectorAll(ignored).forEach(el => el.remove());
    return clone;
  }
  function safeUrl(value) {
    try {
      const url = new URL(value, location.href);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }
  function inline(value) { return value.replace(/([\\`*_\[\]<>])/g, '\\$1'); }
  function render(node, markdown) {
    if (node.nodeType === Node.TEXT_NODE) {
      return markdown ? inline(node.textContent) : node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName.toLowerCase();
    const children = () => [...node.childNodes].map(child => render(child, markdown)).join('');
    if (tag === 'pre') {
      const code = node.querySelector('code') || node;
      const text = code.textContent.replace(/\n$/, '');
      const language = (code.className.match(/language-([\w+-]+)/) || [])[1] || '';
      const fence = '`'.repeat(Math.max(3, ...((text.match(/`+/g) || []).map(s => s.length + 1))));
      return markdown ? `\n\n${fence}${language}\n${text}\n${fence}\n\n` : `\n\n${text}\n\n`;
    }
    if (tag === 'br') return '\n';
    if (tag === 'img') {
      const alt = node.getAttribute('alt') || t('image');
      const url = safeUrl(node.getAttribute('src') || '');
      return markdown && url ? `![${inline(alt)}](<${url.replace(/>/g, '%3E')}>)` : `[${alt}]`;
    }
    if (tag === 'table' && markdown) {
      const rows = [...node.querySelectorAll('tr')].map(row => [...row.children]
        .filter(cell => /^(TH|TD)$/.test(cell.tagName))
        .map(cell => render(cell, true).trim().replace(/\|/g, '\\|').replace(/\n/g, '<br>')));
      if (!rows.length) return '';
      const columns = Math.max(...rows.map(row => row.length));
      const line = row => `| ${Array.from({ length: columns }, (_, i) => row[i] || '').join(' | ')} |`;
      return `\n\n${line(rows[0])}\n${line(Array(columns).fill('---'))}\n${rows.slice(1).map(line).join('\n')}\n\n`;
    }
    const value = children();
    if (tag === 'code' && markdown) {
      const ticks = '`'.repeat(Math.max(1, ...((node.textContent.match(/`+/g) || []).map(s => s.length + 1))));
      return `${ticks} ${node.textContent} ${ticks}`;
    }
    if (/^h[1-6]$/.test(tag)) return `\n\n${markdown ? '#'.repeat(Number(tag[1])) + ' ' : ''}${value.trim()}\n\n`;
    if (['strong', 'b'].includes(tag) && markdown) return `**${value}**`;
    if (['em', 'i'].includes(tag) && markdown) return `*${value}*`;
    if (tag === 'a' && markdown) {
      const url = safeUrl(node.getAttribute('href') || '');
      return url ? `[${value}](<${url.replace(/>/g, '%3E')}>)` : value;
    }
    if (tag === 'li') {
      const ordered = node.parentElement.tagName === 'OL';
      const start = Number(node.parentElement.getAttribute('start')) || 1;
      const index = [...node.parentElement.children].indexOf(node) + start;
      return `\n${ordered ? index + '.' : '-'} ${value.trim().replace(/\n/g, '\n  ')}\n`;
    }
    if (tag === 'blockquote') return `\n\n${value.trim().split('\n').map(line => markdown ? '> ' + line : line).join('\n')}\n\n`;
    if (tag === 'hr') return '\n\n---\n\n';
    if (['p', 'div', 'section', 'ul', 'ol', 'table', 'tr'].includes(tag)) return `\n${value}\n`;
    if (['td', 'th'].includes(tag) && !markdown) return value + '\t';
    return value;
  }
  function extract(body, markdown = false) {
    const content = render(clean(body), markdown).trim();
    // Preserve whitespace inside code blocks; cosmetic blank lines are harmless.
    return content;
  }
  function capture(entries) {
    return entries.map((entry, index) => ({
      key: entry.key,
      element: entry.element, index: index + 1, role: entry.role,
      text: entry.bodies.map(body => extract(body)).filter(Boolean).join('\n\n') || entry.text,
      markdown: entry.bodies.map(body => extract(body, true)).filter(Boolean).join('\n\n') || entry.text
    }));
  }
  function file(messages, format, metadata) {
    const role = entry => t(entry.role === 'user' ? 'user' : 'ai');
    if (format === 'json') return JSON.stringify({
      schemaVersion: 1, ...metadata,
      messages: messages.map(({ index, role, text, markdown }) => ({ index, role, content: text, markdown }))
    }, null, 2);
    if (format === 'md') return `# ${inline(metadata.title)}\n\n${t('source')}：${metadata.url}\n\n${t('exportedAt')}：${metadata.exportedAt}\n\n` +
      messages.map(entry => `## ${role(entry)} · ${entry.index}\n\n${entry.markdown}`).join('\n\n---\n\n') + '\n';
    return `${metadata.title}\n${metadata.url}\n${t('exportedAt')}：${metadata.exportedAt}\n\n` +
      messages.map(entry => `【${role(entry)} · ${entry.index}】\n${entry.text}`).join('\n\n──────────\n\n') + '\n';
  }
  const snapshot = () => globalThis.ConversationMinimapStore.capture();
  globalThis.ConversationMinimapSerialize = { snapshot, capture, file };
})();
