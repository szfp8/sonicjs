/**
 * Beginner-friendly Chinese admin shell for the tax SEO site.
 *
 * This is intentionally a presentation layer. SonicJS keeps handling
 * authentication, permissions, content APIs and database operations.
 * The goal is to make the existing admin feel like a purpose-built
 * “财税SEO网站后台” instead of a generic CMS.
 */

const MARKER = 'data-tax-seo-beginner-ui';

const script = `
<script ${MARKER}>
(function () {
  if (window.__taxSeoBeginnerAdmin) return;
  window.__taxSeoBeginnerAdmin = true;

  var menu = [
    { text: '网站首页', href: '/', icon: '⌂' },
    { text: '内容管理', href: '/admin/content', icon: '📝' },
    { text: '政策解读 / SEO资讯', href: '/admin/content?model=seo_article', icon: '📰' },
    { text: 'SEO城市页面', href: '/admin/content?model=seo_city_page', icon: '📍' },
    { text: '网站用户', href: '/admin/users', icon: '👤' },
    { text: '网站设置', href: '/admin/settings', icon: '⚙' }
  ];

  function cleanText(value) {
    return (value || '').replace(/\\s+/g, ' ').trim();
  }

  function findText(text) {
    var wanted = cleanText(text);
    var all = document.querySelectorAll('a,button,span,div,p,h1,h2,h3,label');
    for (var i = 0; i < all.length; i++) {
      if (cleanText(all[i].textContent) === wanted) return all[i];
    }
    return null;
  }

  function setText(oldText, newText) {
    var el = findText(oldText);
    if (el && cleanText(el.textContent) !== cleanText(newText)) el.textContent = newText;
  }

  function addStyles() {
    if (document.getElementById('tax-seo-beginner-style')) return;
    var style = document.createElement('style');
    style.id = 'tax-seo-beginner-style';
    style.textContent =
      '[data-tax-seo-shell] { margin: 0 0 18px 0; }' +
      '.tax-seo-brand { display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:14px; background:linear-gradient(135deg,#0b3b82,#155eef); color:#fff; box-shadow:0 8px 24px rgba(15,45,90,.12); }' +
      '.tax-seo-brand-icon { width:38px; height:38px; display:flex; align-items:center; justify-content:center; border-radius:10px; background:rgba(255,255,255,.16); font-size:21px; }' +
      '.tax-seo-brand-title { font-size:17px; font-weight:700; line-height:1.2; }' +
      '.tax-seo-brand-sub { margin-top:2px; font-size:12px; opacity:.82; }' +
      '.tax-seo-quick { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; margin-top:12px; }' +
      '.tax-seo-quick a { display:block; padding:13px 14px; border:1px solid #e5e7eb; border-radius:12px; background:#fff; color:#172033; text-decoration:none; box-shadow:0 2px 10px rgba(15,23,42,.04); }' +
      '.tax-seo-quick a:hover { border-color:#b7c9ee; transform:translateY(-1px); }' +
      '.tax-seo-quick strong { display:block; font-size:14px; }' +
      '.tax-seo-quick span { display:block; margin-top:4px; color:#667085; font-size:12px; }' +
      '.tax-seo-side-title { padding:10px 10px 6px; font-size:11px; font-weight:700; color:#98a2b3; letter-spacing:.06em; }' +
      '.tax-seo-settings-guide { margin:0 0 20px; padding:16px 18px; border:1px solid #dbe5f4; border-radius:14px; background:linear-gradient(180deg,#f8fbff,#fff); }' +
      '.tax-seo-settings-guide h4 { margin:0; font-size:15px; font-weight:700; color:#12356b; }' +
      '.tax-seo-settings-guide p { margin:6px 0 0; font-size:12px; line-height:1.7; color:#667085; }' +
      '.tax-seo-settings-guide ul { margin:10px 0 0 18px; padding:0; font-size:12px; line-height:1.8; color:#475467; }' +
      '.tax-seo-settings-guide code { padding:1px 5px; border-radius:5px; background:#eef4ff; color:#155eef; }' +
      '@media (max-width: 700px) { .tax-seo-quick { grid-template-columns:1fr; } }';
    document.head.appendChild(style);
  }

  function buildQuickMenu() {
    if (document.querySelector('[data-tax-seo-quick-menu]')) return;
    var nav = document.querySelector('nav');
    if (!nav) return;
    var body = nav.querySelector('.flex.flex-1.flex-col.overflow-y-auto') || nav;
    var box = document.createElement('div');
    box.setAttribute('data-tax-seo-quick-menu', '1');
    box.innerHTML = '<div class="tax-seo-side-title">财税SEO快捷入口</div>' + menu.slice(1).map(function (item) {
      return '<a href="' + item.href + '" style="display:flex;align-items:center;gap:9px;padding:9px 10px;margin:2px 0;border-radius:9px;text-decoration:none;color:inherit;font-size:13px;">' +
        '<span style="width:22px;text-align:center">' + item.icon + '</span><span>' + item.text + '</span></a>';
    }).join('');
    body.insertBefore(box, body.firstChild);
  }

  function buildSettingsGuide() {
    if (!location.pathname.startsWith('/admin/settings')) return;
    if (document.querySelector('[data-tax-seo-settings-guide]')) return;
    var content = document.querySelector('#settings-content');
    if (!content) return;

    var guide = document.createElement('div');
    guide.setAttribute('data-tax-seo-settings-guide', '1');
    guide.className = 'tax-seo-settings-guide';
    guide.innerHTML =
      '<h4>⚙ 财税SEO网站基础设置</h4>' +
      '<p>这里主要填写网站名称、网站介绍和管理员邮箱。保存后会写入现有 SonicJS 设置数据库，不需要改代码。</p>' +
      '<ul>' +
      '<li><strong>网站名称：</strong>建议填写你的品牌或服务名称。</li>' +
      '<li><strong>网站描述：</strong>用一句话说明合法财税、发票及税务咨询服务。</li>' +
      '<li><strong>管理员邮箱：</strong>保留当前可登录后台的邮箱即可。</li>' +
      '<li><strong>时区：</strong>中国网站建议选择 <code>Asia/Shanghai</code>；如果当前系统没有这个选项，暂时保持现有设置即可。</li>' +
      '<li><strong>维护模式：</strong>正式运营时不要开启，否则可能影响访客访问。</li>' +
      '</ul>';
    content.insertBefore(guide, content.firstChild);

    /* Make the existing real fields beginner-friendly without changing their names or save API. */
    var labels = document.querySelectorAll('#settings-content label');
    for (var i = 0; i < labels.length; i++) {
      var t = cleanText(labels[i].textContent);
      if (t === 'Site Name') labels[i].textContent = '网站名称';
      else if (t === 'Admin Email') labels[i].textContent = '管理员邮箱';
      else if (t === 'Timezone') labels[i].textContent = '网站时区';
      else if (t === 'Site Description') labels[i].textContent = '网站描述';
      else if (t === 'Language') labels[i].textContent = '后台语言';
      else if (t === 'Enable maintenance mode') labels[i].textContent = '启用网站维护模式';
    }

    setText('General Settings', '网站基础设置');
    setText('Configure basic application settings and preferences.', '填写网站名称、描述和基础运行信息');
    setText('Save Changes', '保存网站设置');
    setText('Settings', '网站设置');
    setText('Manage your application settings and preferences', '管理网站基础信息与运行设置');

    var nameInput = document.querySelector('#settings-content input[name="siteName"]');
    var descInput = document.querySelector('#settings-content textarea[name="siteDescription"]');
    if (nameInput && (!nameInput.value || nameInput.value === 'SonicJS AI')) {
      nameInput.value = '全国财税发票服务';
    }
    if (descInput && (!descInput.value || descInput.value === 'A modern headless CMS powered by AI')) {
      descInput.value = '提供合法合规的财税、发票及税务咨询服务信息，覆盖全国城市，为个人和企业提供便捷的财税服务咨询。';
    }

    var timezone = document.querySelector('#settings-content select[name="timezone"]');
    if (timezone) {
      var chinaOption = timezone.querySelector('option[value="Asia/Shanghai"]');
      if (chinaOption) {
        timezone.value = 'Asia/Shanghai';
      }
    }

    var language = document.querySelector('#settings-content select[name="language"]');
    if (language && language.querySelector('option[value="zh"]')) {
      language.value = 'zh';
    }
  }

  function buildPageShell() {
    if (!location.pathname.startsWith('/admin')) return;
    addStyles();
    buildQuickMenu();
    buildSettingsGuide();

    document.title = '财税SEO网站管理后台';
    document.documentElement.lang = 'zh-CN';

    ['API Docs','Developer Docs','OpenAPI','Collections'].forEach(function (label) {
      var el = findText(label);
      if (el) {
        var row = el.closest('a,button,span');
        if (row && row.parentElement) row.parentElement.style.display = 'none';
      }
    });

    setText('Content', '内容管理');
    setText('Users', '网站用户');
    setText('Plugins', '系统工具');
    setText('Settings', '网站设置');
    setText('Docs', '帮助文档');

    var main = document.querySelector('main');
    var content = main && (main.querySelector('.grow') || main.lastElementChild);
    if (content && !content.querySelector('[data-tax-seo-shell]')) {
      var shell = document.createElement('div');
      shell.setAttribute('data-tax-seo-shell', '1');
      shell.innerHTML = '<div class="tax-seo-brand"><div class="tax-seo-brand-icon">税</div><div><div class="tax-seo-brand-title">财税SEO网站管理后台</div><div class="tax-seo-brand-sub">小白操作模式 · 内容、SEO城市、网站设置统一管理</div></div></div>';
      if (location.pathname === '/admin' || location.pathname === '/admin/content') {
        var quick = document.createElement('div');
        quick.className = 'tax-seo-quick';
        quick.innerHTML = menu.slice(1).map(function (item) {
          var desc = item.text === '内容管理' ? '查看和管理网站文章' : item.text === '政策解读 / SEO资讯' ? '来源 + 原创解读 + 企业实际价值' : item.text === 'SEO城市页面' ? '管理全国城市SEO落地页' : item.text === '网站用户' ? '管理后台账号和权限' : '管理网站基础信息';
          return '<a href="' + item.href + '"><strong>' + item.icon + ' ' + item.text + '</strong><span>' + desc + '</span></a>';
        }).join('');
        shell.appendChild(quick);
      }
      content.insertBefore(shell, content.firstChild);
    }

    setText('Manage and organize your content items', '管理网站内容：文章、政策解读和SEO城市页面');
    setText('Model', '内容类型');
    setText('All Models', '全部内容');
    setText('Bulk Actions', '批量操作');
    setText('Showing', '当前显示');
    setText('Per page', '每页数量');
  }

  function run() {
    buildPageShell();
    window.setTimeout(buildPageShell, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
</script>`;

export function installBeginnerAdminUi(): void {
  const responseText = Response.prototype.text;
  if ((Response.prototype as Response & { __taxSeoPatched?: boolean }).__taxSeoPatched) return;

  const patched = async function (this: Response): Promise<string> {
    const text = await responseText.call(this);
    const type = this.headers.get('content-type') || '';
    if (!type.includes('text/html') || !text.includes('SonicJS')) return text;
    if (text.includes(MARKER)) return text;
    return text.includes('</body>')
      ? text.replace('</body>', script + '</body>')
      : text + script;
  };

  Response.prototype.text = patched;
  (Response.prototype as Response & { __taxSeoPatched?: boolean }).__taxSeoPatched = true;
}

installBeginnerAdminUi();