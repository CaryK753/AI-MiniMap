// Author: wwj
const sites = {
  chatgpt: 'https://chatgpt.com/c/demo', scheduled: 'https://chatgpt.com/c/scheduled-demo',
  work: 'https://chatgpt.com/work?threadId=demo', codex: 'https://chatgpt.com/codex/tasks/demo',
  claude: 'https://claude.ai/chat/demo', gemini: 'https://gemini.google.com/app/demo'
};
function message(site, index, role, text) {
  const user = role === 'user';
  if (site === 'claude') return `<div data-turn-key="${index}">${user
    ? `<div data-testid="user-message" class="bubble">${text}</div>`
    : `<div data-testid="assistant-message" data-turn-key="${index}" data-is-streaming="false"><div class="prose"><div class="standard-markdown" data-perf-reply-text>${text}</div></div><button>Copy</button></div>`}</div>`;
  if (site === 'gemini') return `<div class="conversation-container" id="turn-${index}">${user
    ? `<user-query><div class="query-text"><h5 class="sr-only">你说 ${text}</h5><p class="query-text-line bubble">${text}</p></div></user-query>`
    : `<model-response><div class="markdown">${text}</div></model-response>`}</div>`;
  if (site === 'codex') return `<div data-turn-key="${index}">${user
    ? `<div class="self-end bg-token-bg-tertiary bubble"><div role="button" class="line-clamp-5"><div class="whitespace-pre-wrap">${text}</div></div></div>`
    : `<div class="markdown prose">${text}</div>`}</div>`;
  if (site === 'work') return `<div data-message-role="${role}" data-message-id="work-${index}"><div class="${user ? 'whitespace-pre-wrap bubble' : 'markdown'}">${text}</div></div>`;
  return `<div data-content-search-unit-key="turn-${index}:0:${role}"><h4 class="sr-only">${user ? '你说' : 'ChatGPT 说'}</h4><div class="${user ? 'bubble' : 'markdown'}" ${user ? 'data-user-message-bubble="true"' : ''}>${text}</div></div>`;
}
function fixture(site, count = 6) {
  const prompts = ['Help me outline a focused study plan.', 'Break this into clear weekly milestones.', 'Compare the available approaches.', 'Add a small, practical example.', 'Summarize the decisions so far.', 'What should I do next?'];
  const messages = Array.from({ length: count }, (_, i) => {
    const user = message(site, i * 2, 'user', prompts[i % prompts.length]);
    const answer = `<h2>${site === 'scheduled' ? `Task update ${i + 1}` : `Step ${i + 1} · A calmer workflow`}</h2><p>Keep the next step small and visible. Start with one objective, then review what changed.</p><ul><li>Make the goal concrete.</li><li>Leave space for reflection.</li></ul><pre><code class="language-js">const nextStep = "Keep it simple";</code></pre>`;
    return (site === 'scheduled' ? '' : user) + message(site, i * 2 + 1, 'assistant', answer);
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${site} · AI MiniMap demo</title><style>
    *{box-sizing:border-box}body{margin:0;font:14px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#242424;background:#fafafa;--sidebar:76px}
    body[data-expanded=true]{--sidebar:250px}.app{display:grid;grid-template-columns:var(--sidebar) 1fr;height:100vh}aside{height:100vh;width:var(--sidebar);background:#f0f0f2;padding:18px 14px;overflow:hidden;border-right:1px solid #e6e6e8}button{font:inherit;cursor:pointer}aside button{border:0;border-radius:10px;background:#fff;padding:8px}aside p{white-space:nowrap;color:#777}
    main{min-width:0}header{height:74px;padding:20px 32px;border-bottom:1px solid #e9e9ec;display:flex;justify-content:space-between;align-items:center;background:#ffffffa0}header strong{font-size:17px}header span{color:#888;font-size:11px}.thread-scroll-container{height:calc(100vh - 74px);overflow:auto;padding:28px max(30px,calc((100% - 620px)/2)) 120px;scrollbar-width:thin}
    .bubble{background:#ecebed;border-radius:20px;padding:16px 20px;margin:18px 0 24px 55px}.markdown,.font-claude-response{margin:22px 0 38px}h2{font-size:19px;letter-spacing:-.02em}p{margin:10px 0}pre{background:#f0f0f2;border-radius:14px;padding:18px;font:12px/1.6 ui-monospace,monospace;overflow:auto}.sr-only{display:none}user-query,model-response{display:block}
    @media(prefers-color-scheme:dark){body{background:#171719;color:#eee}aside{background:#202023;border-color:#333}aside button,header{background:#262629;color:#eee;border-color:#333}.bubble,pre{background:#2c2c30}}
  </style></head><body><div class="app"><aside id="sidebar" aria-label="Sidebar"><button id="toggle" aria-label="Toggle sidebar">☰</button><p>＋ New chat</p><div hidden data-testid="user-message">Sidebar decoy</div></aside><main><header><strong>${site === 'scheduled' ? 'Scheduled updates' : site === 'work' || site === 'codex' ? 'Work · Project notes' : site === 'claude' ? 'Claude · Project notes' : 'Project notes'}</strong><span>AI MiniMap demo · synthetic content</span></header><div class="thread-scroll-container" data-thread-find-target="conversation">${messages}<div hidden data-message-author-role="assistant">Hidden branch</div><div data-testid="tool-output"><div data-message-role="assistant">Tool output must stay out</div></div></div></main></div><script>document.querySelector('#toggle').onclick=()=>document.body.dataset.expanded=String(document.body.dataset.expanded!=='true');</script></body></html>`;
}
module.exports = { sites, fixture, message };
