(() => {
  'use strict';

  const STORAGE_KEY = 'shiyue-pwa-items-v1';
  const store = { items: [], filter: 'all', query: '', readOnly: false, toastTimer: 0 };
  const elements = {
    list: document.querySelector('#item-list'),
    empty: document.querySelector('#empty-state'),
    emptyTitle: document.querySelector('#empty-title'),
    emptyDescription: document.querySelector('#empty-description'),
    search: document.querySelector('#search-input'),
    total: document.querySelector('#total-count'),
    unread: document.querySelector('#unread-count'),
    tabCount: document.querySelector('#all-tab-count'),
    dialog: document.querySelector('#add-dialog'),
    form: document.querySelector('#add-form'),
    url: document.querySelector('#url-input'),
    title: document.querySelector('#title-input'),
    sourcePreview: document.querySelector('#source-preview'),
    sourceLabel: document.querySelector('#source-label'),
    error: document.querySelector('#form-error'),
    toast: document.querySelector('#toast')
  };

  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every(isValidItem)) throw new Error('收藏数据格式无法识别');
      store.items = parsed;
    } catch (error) {
      store.readOnly = true;
      showToast('本机收藏数据无法读取，已保护原数据');
      console.error('拾阅本机数据读取失败，已禁用写入以避免覆盖。', error);
    }
  }

  function isValidItem(item) {
    return item && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.title === 'string'
      && typeof item.url === 'string' && isHttpUrl(item.url)
      && typeof item.source === 'string' && typeof item.createdAt === 'string'
      && !Number.isNaN(Date.parse(item.createdAt)) && typeof item.isRead === 'boolean';
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
    } catch {
      return false;
    }
  }

  function normalizeUrl(raw) {
    const value = raw.trim();
    if (!value) return null;
    const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
    try {
      const url = new URL(withScheme);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;
      return url;
    } catch {
      return null;
    }
  }

  function sourceFor(url) {
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const sourceMap = [
      [['mp.weixin.qq.com', 'weixin.qq.com'], '公众号'],
      [['zhihu.com'], '知乎'],
      [['bilibili.com', 'b23.tv'], '哔哩哔哩'],
      [['douyin.com'], '抖音'],
      [['xiaohongshu.com', 'xhslink.com'], '小红书'],
      [['kuaishou.com'], '快手'],
      [['weibo.com'], '微博'],
      [['youtube.com', 'youtu.be'], 'YouTube'],
      [['github.com'], 'GitHub'],
      [['juejin.cn'], '掘金']
    ];
    for (const [domains, label] of sourceMap) {
      if (domains.some(domain => host === domain || host.endsWith(`.${domain}`))) return label;
    }
    return '网页';
  }

  function persist(nextItems) {
    if (store.readOnly) {
      showToast('本机数据当前为只读状态，无法覆盖');
      return false;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
      store.items = nextItems;
      return true;
    } catch (error) {
      showToast('浏览器存储空间不足，收藏没有更改');
      console.error('拾阅本机数据保存失败。', error);
      return false;
    }
  }

  function visibleItems() {
    const query = store.query.trim().toLocaleLowerCase();
    return [...store.items]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .filter(item => {
        if (store.filter === 'unread' && item.isRead) return false;
        if (store.filter === 'read' && !item.isRead) return false;
        if (!query) return true;
        return [item.title, item.url, item.source].some(value => value.toLocaleLowerCase().includes(query));
      });
  }

  function render() {
    const unreadCount = store.items.filter(item => !item.isRead).length;
    const items = visibleItems();
    elements.total.textContent = String(store.items.length);
    elements.unread.textContent = String(unreadCount);
    elements.tabCount.textContent = String(store.items.length);
    elements.list.replaceChildren(...items.map(createCard));
    elements.list.hidden = items.length === 0;
    elements.empty.hidden = items.length !== 0;

    if (store.items.length === 0) {
      elements.emptyTitle.textContent = store.query ? '没有找到匹配内容' : '这里还空着';
      elements.emptyDescription.textContent = store.query
        ? '试试标题、来源或网址关键词。'
        : '把刚看到的网页链接收进来，回头再读。';
      document.querySelector('#empty-add').hidden = Boolean(store.query);
    } else if (items.length === 0) {
      elements.emptyTitle.textContent = '没有符合条件的收藏';
      elements.emptyDescription.textContent = '换一个筛选条件，或试试其他关键词。';
      document.querySelector('#empty-add').hidden = true;
    }
  }

  function createCard(item) {
    const article = document.createElement('article');
    article.className = 'item-card';

    const main = document.createElement('div');
    main.className = 'item-main';
    const meta = document.createElement('div');
    meta.className = 'item-meta';
    const source = document.createElement('span');
    source.className = 'source-badge';
    source.textContent = item.source;
    const date = document.createElement('time');
    date.className = 'item-date';
    date.dateTime = item.createdAt;
    date.textContent = formatDate(item.createdAt);
    meta.append(source, date);

    const title = document.createElement('h3');
    title.className = 'item-title';
    const titleLink = document.createElement('a');
    titleLink.href = item.url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.textContent = item.title;
    title.append(titleLink);

    const url = document.createElement('span');
    url.className = 'item-url';
    url.textContent = hostnameFor(item.url) || item.url;
    main.append(meta, title, url);

    const side = document.createElement('div');
    side.className = 'item-side';
    const state = document.createElement('span');
    state.className = `read-state${item.isRead ? ' is-read' : ''}`;
    state.textContent = item.isRead ? '已读' : '待读';
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const toggle = document.createElement('button');
    toggle.className = 'card-action';
    toggle.type = 'button';
    toggle.textContent = item.isRead ? '标记未读' : '标记已读';
    toggle.setAttribute('aria-pressed', String(item.isRead));
    toggle.addEventListener('click', () => toggleRead(item.id));
    const remove = document.createElement('button');
    remove.className = 'card-action delete-action';
    remove.type = 'button';
    remove.textContent = '删除';
    remove.addEventListener('click', () => deleteItem(item.id));
    actions.append(toggle, remove);
    side.append(state, actions);
    article.append(main, side);
    return article;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  function hostnameFor(value) {
    try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  function toggleRead(id) {
    const next = store.items.map(item => item.id === id ? { ...item, isRead: !item.isRead } : item);
    if (persist(next)) render();
  }

  function deleteItem(id) {
    const item = store.items.find(candidate => candidate.id === id);
    if (!item || !window.confirm(`删除“${item.title}”？`)) return;
    if (persist(store.items.filter(candidate => candidate.id !== id))) {
      render();
      showToast('已从清单移除');
    }
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('is-visible');
    window.clearTimeout(store.toastTimer);
    store.toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
  }

  function openDialog() {
    elements.form.reset();
    elements.error.hidden = true;
    elements.sourcePreview.hidden = true;
    if (typeof elements.dialog.showModal === 'function') elements.dialog.showModal();
    else elements.dialog.setAttribute('open', '');
    window.setTimeout(() => elements.url.focus(), 30);
  }

  function closeDialog() {
    if (typeof elements.dialog.close === 'function') elements.dialog.close();
    else elements.dialog.removeAttribute('open');
  }

  function updateSourcePreview() {
    const url = normalizeUrl(elements.url.value);
    elements.sourcePreview.hidden = !url;
    if (url) elements.sourceLabel.textContent = sourceFor(url);
    elements.error.hidden = true;
  }

  function addItem(event) {
    event.preventDefault();
    const url = normalizeUrl(elements.url.value);
    if (!url) {
      elements.error.textContent = '请粘贴有效的网页链接（http 或 https）。';
      elements.error.hidden = false;
      elements.url.focus();
      return;
    }
    const canonical = url.href;
    if (store.items.some(item => item.url === canonical)) {
      elements.error.textContent = '这条链接已经在清单里了。';
      elements.error.hidden = false;
      return;
    }
    const suppliedTitle = elements.title.value.trim();
    const item = {
      id: globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: suppliedTitle || url.hostname.replace(/^www\./, ''),
      url: canonical,
      source: sourceFor(url),
      createdAt: new Date().toISOString(),
      isRead: false
    };
    if (!persist([item, ...store.items])) return;
    store.filter = 'all';
    store.query = '';
    elements.search.value = '';
    document.querySelectorAll('[data-filter]').forEach(button => {
      const active = button.dataset.filter === 'all';
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    closeDialog();
    render();
    showToast('已收进阅读清单');
  }

  document.querySelectorAll('[data-open-add]').forEach(button => button.addEventListener('click', openDialog));
  document.querySelectorAll('[data-close-add]').forEach(button => button.addEventListener('click', closeDialog));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    store.filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(tab => {
      const active = tab === button;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
    render();
  }));
  elements.search.addEventListener('input', () => {
    store.query = elements.search.value;
    render();
  });
  elements.url.addEventListener('input', updateSourcePreview);
  elements.form.addEventListener('submit', addItem);
  elements.dialog.addEventListener('click', event => {
    if (event.target === elements.dialog) closeDialog();
  });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !elements.dialog.open && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      elements.search.focus();
    }
    if (event.key === 'Escape' && elements.dialog.open) closeDialog();
  });

  loadItems();
  render();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' })
        .catch(error => console.error('离线缓存注册失败。', error));
    }, { once: true });
  }
})();
