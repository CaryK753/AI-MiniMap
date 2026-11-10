(() => {
  const adapter = globalThis.ConversationMinimapAdapter;
  const serialize = globalThis.ConversationMinimapSerialize;
  let route = adapter.routeKey(), records = [], lastTop = 0, epoch = 0;
  const byKey = new Map();
  let previousNodes = new WeakMap();
  function reset() {
    records.filter(entry => adapter.isLive(entry)).forEach(entry => {
      previousNodes.set(entry.element, { signature: entry.key + ':' + entry.fingerprint, route });
    });
    route = adapter.routeKey(); records = []; byKey.clear(); lastTop = 0; epoch++;
    document.dispatchEvent(new CustomEvent('conversation-minimap-route'));
  }
  function ensureRoute() {
    if (route !== adapter.routeKey()) { reset(); return true; }
    return false;
  }
  function capture(direction) {
    ensureRoute();
    const live = adapter.conversation().filter(entry => {
      const signature = entry.key + ':' + entry.bodies.map(body => body.innerHTML).join('\n');
      const previous = previousNodes.get(entry.element);
      return !previous || previous.route === route || previous.signature !== signature;
    });
    const top = adapter.scroller(live[0]?.element).scrollTop;
    const prepend = direction === 'up' || (!direction && top < lastTop);
    lastTop = top;
    const raw = live.map(entry => {
      const fingerprint = entry.bodies.map(body => body.innerHTML).join('\n');
      const prior = byKey.get(entry.key);
      if (prior?.fingerprint === fingerprint) {
        prior.element = entry.element;
        return prior;
      }
      const value = { ...serialize.capture([entry])[0], fingerprint };
      byKey.set(value.key, value);
      return value;
    });
    const known = new Set(records.map(entry => entry.key));
    const order = records.map(entry => entry.key);
    raw.forEach((entry, i) => {
      if (known.has(entry.key)) return;
      const next = raw.slice(i + 1).find(item => known.has(item.key));
      const previous = raw.slice(0, i).reverse().find(item => known.has(item.key));
      if (previous) order.splice(order.indexOf(previous.key) + 1, 0, entry.key);
      else if (next) order.splice(order.indexOf(next.key), 0, entry.key);
      else if (prepend) order.splice(i, 0, entry.key);
      else order.push(entry.key);
      known.add(entry.key);
    });
    records = order.map((key, i) => ({ ...byKey.get(key), index: i + 1 }));
    return records.map(entry => ({ ...entry }));
  }
  const entries = () => { ensureRoute(); return records.map(entry => ({ ...entry })); };
  globalThis.ConversationMinimapStore = { capture, entries, ensureRoute,
    get epoch() { ensureRoute(); return epoch; } };
})();
