/**
 * Beginner-friendly Chinese admin shell for the tax SEO site.
 * Presentation layer only; settings are persisted by the existing settings service.
 */

const MARKER = 'data-tax-seo-beginner-ui';

const script = `
<script ${MARKER}>
(function () {
  if (window.__taxSeoBeginnerAdmin) return;
  window.__taxSeoBeginnerAdmin = true;

  var menu = [
    { text: '网站首页', href: '/', icon: '⌂' },
    { text: '网站概况', href: '/admin/content', icon: '📊' },
    { text: '内容管理', href: '/admin/content', icon: '📝' },
    { text: '网站资讯', href: '/admin/content?model=blog_post', icon: '📄' },
    { text: '政策解读 / SEO资讯', href: '/admin/content?model=seo_article', icon: '📰' },
    { text: 'SEO城市页面', href: '/admin/content?model=seo_city_page', icon: '📍' },
    { text: 'SEO设置', href: '/admin/settings/seo', icon: '🔎' },
    { text: '获客设置', href: '/admin/settings/lead', icon: '☎' },
    { text: '全国城市SEO', href: '/admin/content?model=seo_city_page', icon: '🗺' },
    { text: '搜索引擎收录', href: '/sitemap.xml', icon: '🚀' },
    { text: '网站用户', href: '/admin/users', icon: '👤' },
    { text: '网站设置', href: '/admin/settings/general', icon: '⚙' },
    { text: '系统状态', href: '/admin/settings/database-tools', icon: '🛠' }
  ];

  function cleanText(value) { return (value || '').replace(/\\s+/g, ' ').trim(); }
  function findText(text) {
    var wanted = cleanText(text);
    var all = document.querySelectorAll('a,button,span,div,p,h1,h2,h3,label');
    for (var i = 0; i < all.length; i++) if (cleanText(all[i].textContent) === wanted) return all[i];
    return null;
  }
  function setText(oldText, newText) {
    var el = findText(oldText);
    if (el && cleanText(el.textContent) !== cleanText(newText)) el.textContent = newText;
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>\"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]; });
  }

  function addStyles() {
    if (document.getElementById('tax-seo-beginner-style')) return;
    var style = document.createElement('style');
    style.id = 'tax-seo-beginner-style';
    style.textContent =
      '[data-tax-seo-shell]{margin:0 0 18px}' +
      '.tax-seo-brand{display:flex;align-items:center;gap:12px;padding:16px;border-radius:14px;background:linear-gradient(135deg,#0b3b82,#155eef);color:#fff;box-shadow:0 8px 24px rgba(15,45,90,.12)}' +
      '.tax-seo-brand-icon{width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(255,255,255,.16);font-size:21px}' +
      '.tax-seo-brand-title{font-size:17px;font-weight:700;line-height:1.2}.tax-seo-brand-sub{margin-top:3px;font-size:12px;opacity:.82}' +
      '.tax-seo-quick{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-top:12px}' +
      '.tax-seo-quick a{display:block;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;color:#172033;text-decoration:none;box-shadow:0 2px 10px rgba(15,23,42,.04)}' +
      '.tax-seo-quick a:hover{border-color:#b7c9ee;transform:translateY(-1px)}.tax-seo-quick strong{display:block;font-size:14px}.tax-seo-quick span{display:block;margin-top:4px;color:#667085;font-size:12px}' +
      '.tax-seo-side-title{padding:10px 10px 6px;font-size:11px;font-weight:700;color:#98a2b3;letter-spacing:.06em}' +
      '.tax-seo-settings-guide{margin:0 0 18px;padding:17px 18px;border:1px solid #dbe5f4;border-radius:14px;background:linear-gradient(180deg,#f8fbff,#fff)}' +
      '.tax-seo-settings-guide h4{margin:0;font-size:16px;color:#12356b}.tax-seo-settings-guide p{margin:6px 0 0;font-size:12px;line-height:1.7;color:#667085}' +
      '.tax-seo-setting-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}' +
      '.tax-seo-setting-card{padding:14px;border:1px solid #e4e7ec;border-radius:12px;background:#fff}.tax-seo-setting-card b{display:block;font-size:14px;color:#172033}.tax-seo-setting-card span{display:block;margin-top:5px;font-size:12px;line-height:1.6;color:#667085}.tax-seo-setting-card a{display:inline-block;margin-top:9px;color:#155eef;text-decoration:none;font-size:12px;font-weight:700}' +
      '.tax-seo-status{margin-top:14px;padding:12px 14px;border-radius:10px;background:#f0fdf4;color:#166534;font-size:12px}' +
      '.tax-seo-panel{margin:0 0 18px;padding:20px;border:1px solid #dbe5f4;border-radius:14px;background:#fff;box-shadow:0 2px 10px rgba(15,23,42,.04)}' +
      '.tax-seo-panel h3{margin:0;color:#12356b;font-size:18px}.tax-seo-panel .hint{margin:6px 0 16px;color:#667085;font-size:12px;line-height:1.7}' +
      '.tax-seo-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.tax-seo-field{display:flex;flex-direction:column;gap:6px}.tax-seo-field.full{grid-column:1/-1}.tax-seo-field label{font-size:13px;font-weight:600;color:#344054}.tax-seo-field input,.tax-seo-field textarea,.tax-seo-field select{width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:9px;padding:10px 11px;font:inherit;background:#fff}.tax-seo-field textarea{min-height:90px;resize:vertical}.tax-seo-save{margin-top:16px;border:0;border-radius:9px;padding:10px 18px;background:#155eef;color:#fff;font-weight:700;cursor:pointer}.tax-seo-msg{display:inline-block;margin-left:10px;font-size:12px;color:#166534}' +
      '@media(max-width:700px){.tax-seo-quick,.tax-seo-setting-grid,.tax-seo-form-grid{grid-template-columns:1fr}.tax-seo-field.full{grid-column:auto}}';
    document.head.appendChild(style);
  }

  function buildQuickMenu() {
    if (document.querySelector('[data-tax-seo-quick-menu]')) return;
    var nav = document.querySelector('nav');
    if (!nav) return;
    var body = nav.querySelector('.flex.flex-1.flex-col.overflow-y-auto') || nav;
    var box = document.createElement('div');
    box.setAttribute('data-tax-seo-quick-menu','1');
    box.innerHTML = '<div class="tax-seo-side-title">财税SEO快捷入口</div>' + menu.slice(1).map(function(item){
      return '<a href="'+item.href+'" style="display:flex;align-items:center;gap:9px;padding:9px 10px;margin:2px 0;border-radius:9px;text-decoration:none;color:inherit;font-size:13px"><span style="width:22px;text-align:center">'+item.icon+'</span><span>'+item.text+'</span></a>';
    }).join('');
    body.insertBefore(box, body.firstChild);
  }

  function buildSettingsGuide() {
    if (!location.pathname.startsWith('/admin/settings')) return;
    if (document.querySelector('[data-tax-seo-settings-guide]')) return;
    var content = document.querySelector('#settings-content');
    if (!content) return;
    var guide = document.createElement('div');
    guide.setAttribute('data-tax-seo-settings-guide','1');
    guide.className = 'tax-seo-settings-guide';
    guide.innerHTML =
      '<h4>⚙ 财税SEO网站设置中心</h4>' +
      '<p>小白模式：先完成基础资料，再设置SEO和获客。下面入口使用现有 SonicJS 设置存储，不新增D1表。</p>' +
      '<div class="tax-seo-setting-grid">' +
        '<div class="tax-seo-setting-card"><b>① 网站基础信息</b><span>网站名称、管理员邮箱、网站描述、时区。</span><a href="/admin/settings/general">进入基础设置 →</a></div>' +
        '<div class="tax-seo-setting-card"><b>② SEO设置</b><span>SEO标题、关键词、描述、规范网址和Robots。</span><a href="/admin/settings/seo">进入SEO设置 →</a></div>' +
        '<div class="tax-seo-setting-card"><b>③ 获客设置</b><span>联系电话、微信、线索入口和合规提示。</span><a href="/admin/settings/lead">进入获客设置 →</a></div>' +
        '<div class="tax-seo-setting-card"><b>④ 全国城市SEO</b><span>管理全国城市落地页和城市关键词。</span><a href="/admin/content?model=seo_city_page">管理城市页面 →</a></div>' +
        '<div class="tax-seo-setting-card"><b>⑤ 内容发布</b><span>网站资讯、政策解读和SEO资讯。</span><a href="/admin/content">进入内容管理 →</a></div>' +
        '<div class="tax-seo-setting-card"><b>⑥ 收录工具</b><span>Sitemap、Robots和IndexNow入口。</span><a href="/sitemap.xml" target="_blank">查看Sitemap →</a></div>' +
      '</div>' +
      '<div class="tax-seo-status">✓ 当前版本不新增D1表、不执行迁移；只有保存设置时才写入现有设置文档。</div>';
    content.insertBefore(guide, content.firstChild);

    var labels = document.querySelectorAll('#settings-content label');
    for (var i=0;i<labels.length;i++) {
      var t=cleanText(labels[i].textContent);
      if(t==='Site Name') labels[i].textContent='网站名称';
      else if(t==='Admin Email') labels[i].textContent='管理员邮箱';
      else if(t==='Timezone') labels[i].textContent='网站时区';
      else if(t==='Site Description') labels[i].textContent='网站描述';
      else if(t==='Language') labels[i].textContent='后台语言';
      else if(t==='Enable maintenance mode') labels[i].textContent='启用网站维护模式';
    }
    setText('General Settings','网站基础设置');
    setText('Configure basic application settings and preferences.','填写网站名称、描述和基础运行信息');
    setText('Save Changes','保存网站设置');
    setText('Settings','网站设置');
    setText('Manage your application settings and preferences','管理网站基础信息与运行设置');

    var nameInput=document.querySelector('#settings-content input[name="siteName"]');
    var descInput=document.querySelector('#settings-content textarea[name="siteDescription"]');
    if(nameInput && (!nameInput.value || nameInput.value==='SonicJS AI')) nameInput.value='全国财税发票服务';
    if(descInput && (!descInput.value || descInput.value==='A modern headless CMS powered by AI')) descInput.value='提供合法合规的财税、发票及税务咨询服务信息，覆盖全国城市，为个人和企业提供便捷的财税服务咨询。';
    var timezone=document.querySelector('#settings-content select[name="timezone"]');
    if(timezone && timezone.querySelector('option[value="Asia/Shanghai"]')) timezone.value='Asia/Shanghai';
    var language=document.querySelector('#settings-content select[name="language"]');
    if(language && language.querySelector('option[value="zh"]')) language.value='zh';
  }

  function apiPanel(title, hint, endpoint, fields) {
    if (!document.querySelector('#settings-content') || document.querySelector('[data-tax-seo-panel="'+endpoint+'"]')) return;
    var content=document.querySelector('#settings-content');
    var panel=document.createElement('div');
    panel.className='tax-seo-panel'; panel.setAttribute('data-tax-seo-panel',endpoint);
    panel.innerHTML='<h3>'+title+'</h3><div class="hint">'+hint+'</div><form class="tax-seo-form-grid">'+fields.map(function(f){
      var control=f.type==='textarea' ? '<textarea name="'+f.name+'" placeholder="'+esc(f.placeholder||'')+'"></textarea>' : f.type==='checkbox' ? '<input type="checkbox" name="'+f.name+'" style="width:auto;align-self:flex-start">' : '<input name="'+f.name+'" type="'+(f.type||'text')+'" placeholder="'+esc(f.placeholder||'')+'">';
      return '<div class="tax-seo-field '+(f.full?'full':'')+'"><label>'+f.label+'</label>'+control+(f.help?'<small style="color:#667085">'+f.help+'</small>':'')+'</div>';
    }).join('')+'<div class="full"><button class="tax-seo-save" type="submit">保存设置</button><span class="tax-seo-msg"></span></div></form>';
    content.insertBefore(panel,content.firstChild);
    var form=panel.querySelector('form');
    fetch(endpoint,{credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).then(function(data){
      if(!data||!data.data)return;
      Object.keys(data.data).forEach(function(k){var el=form.elements[k]; if(!el)return; if(el.type==='checkbox')el.checked=!!data.data[k]; else el.value=data.data[k]||'';});
    }).catch(function(){});
    form.addEventListener('submit',function(ev){
      ev.preventDefault();
      var msg=panel.querySelector('.tax-seo-msg'); msg.textContent='保存中…';
      var data={}; Array.prototype.forEach.call(form.elements,function(el){if(!el.name)return; data[el.name]=el.type==='checkbox'?el.checked:el.value;});
      fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(function(r){return r.json().then(function(x){return {ok:r.ok,data:x};});}).then(function(x){msg.textContent=x.ok?'✓ 已保存':('保存失败：'+(x.data.error||'请重试'));}).catch(function(){msg.textContent='保存失败，请重试';});
    });
  }

  function buildSeoAndLeadPanels() {
    if (!location.pathname.startsWith('/admin/settings/')) return;
    apiPanel('🔎 SEO设置','设置首页和城市页面使用的基础SEO信息。保存后写入现有设置文档，不增加数据库表。','/admin/settings/api/seo',[
      {name:'seoTitle',label:'SEO标题',placeholder:'全国财税发票服务｜财税与发票咨询',full:true},
      {name:'seoKeywords',label:'SEO关键词',placeholder:'发票,财税,税务咨询,增值税发票'},
      {name:'canonicalUrl',label:'规范网址',placeholder:'https://szfp8.com'},
      {name:'seoDescription',label:'SEO描述',type:'textarea',full:true},
      {name:'robots',label:'Robots规则',placeholder:'index,follow'},
      {name:'indexNowEnabled',label:'启用IndexNow',type:'checkbox',help:'只控制站点设置，不会自动向搜索引擎制造大量请求。'}
    ]);
    apiPanel('☎ 获客设置','填写真实联系方式，并保留合规提示。不要用于虚假交易、虚开发票或其他违法用途。','/admin/settings/api/lead',[
      {name:'contactPhone',label:'联系电话',placeholder:'请输入真实客服电话'},
      {name:'wechat',label:'微信号',placeholder:'请输入实际业务微信'},
      {name:'leadEnabled',label:'启用线索入口',type:'checkbox'},
      {name:'leadMessage',label:'线索提示语',type:'textarea',full:true}
    ]);
  }

  function buildHomePanel() {
    if (!(location.pathname === '/admin' || location.pathname === '/admin/content')) return;
    var main=document.querySelector('main');
    var content=main && (main.querySelector('.grow') || main.lastElementChild);
    if(!content || content.querySelector('[data-tax-seo-shell]')) return;
    var shell=document.createElement('div'); shell.setAttribute('data-tax-seo-shell','1');
    shell.innerHTML='<div class="tax-seo-brand"><div class="tax-seo-brand-icon">税</div><div><div class="tax-seo-brand-title">财税SEO网站管理后台</div><div class="tax-seo-brand-sub">小白操作模式 · 内容、SEO城市、获客与网站设置统一管理</div></div></div>';
    var quick=document.createElement('div'); quick.className='tax-seo-quick';
    quick.innerHTML=menu.slice(1,11).map(function(item){
      var desc=item.text==='内容管理'?'管理网站文章':item.text==='网站资讯'?'普通网站资讯':item.text==='政策解读 / SEO资讯'?'来源 + 原创解读 + 企业实际价值':item.text==='SEO城市页面'?'全国城市SEO落地页':item.text==='SEO设置'?'设置标题、关键词、描述':'查看或管理网站功能';
      return '<a href="'+item.href+'"><strong>'+item.icon+' '+item.text+'</strong><span>'+desc+'</span></a>';
    }).join('');
    shell.appendChild(quick); content.insertBefore(shell,content.firstChild);
  }

  function buildPageShell() {
    if(!location.pathname.startsWith('/admin')) return;
    addStyles(); buildQuickMenu(); buildSettingsGuide(); buildSeoAndLeadPanels(); buildHomePanel();
    document.title='财税SEO网站管理后台'; document.documentElement.lang='zh-CN';
    ['API Docs','Developer Docs','OpenAPI','Collections'].forEach(function(label){
      var el=findText(label); if(el){var row=el.closest('a,button,span'); if(row&&row.parentElement) row.parentElement.style.display='none';}
    });
    setText('Content','内容管理'); setText('Users','网站用户'); setText('Plugins','系统工具'); setText('Settings','网站设置'); setText('Docs','帮助文档');
    setText('Manage and organize your content items','管理网站内容：文章、政策解读和SEO城市页面');
    setText('Model','内容类型'); setText('All Models','全部内容'); setText('Bulk Actions','批量操作'); setText('Showing','当前显示'); setText('Per page','每页数量');
  }

  function run(){ buildPageShell(); window.setTimeout(buildPageShell,300); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
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
    return text.includes('</body>') ? text.replace('</body>', script + '</body>') : text + script;
  };
  Response.prototype.text = patched;
  (Response.prototype as Response & { __taxSeoPatched?: boolean }).__taxSeoPatched = true;
}

installBeginnerAdminUi();
