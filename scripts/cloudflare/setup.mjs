import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { writeFileSync } from 'node:fs';

const root = process.cwd();
const appDir = `${root}/my-sonicjs-app`;
const configPath = `${appDir}/wrangler.production.toml`;
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const runNpx = (args, opts = {}) => {
  console.log(`\n> npx ${args.join(' ')}`);
  execFileSync(npx, args, { cwd: appDir, stdio: 'inherit', shell: false, ...opts });
};

const runNpm = (args, opts = {}) => {
  console.log(`\n> npm ${args.join(' ')}`);
  execFileSync(npm, args, { cwd: appDir, stdio: 'inherit', shell: false, ...opts });
};

const putSecret = (name, value) => {
  console.log(`\n配置密钥：${name}`);
  execFileSync(npx, ['wrangler', 'secret', 'put', name, '--config', configPath], {
    cwd: appDir,
    input: `${value}\n`,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: false,
  });
};

const rl = createInterface({ input, output });
const ask = async (question, fallback = '') => {
  const answer = (await rl.question(`${question}${fallback ? ` [${fallback}]` : ''}: `)).trim();
  return answer || fallback;
};

try {
  console.log('================================================');
  console.log(' 财税 SEO Cloudflare 一键部署');
  console.log('================================================');
  console.log('本脚本只部署 Worker，不迁移、不重置、不删除 D1。');
  console.log('生产入口使用 my-sonicjs-app/src/entrypoint.ts。');

  try { runNpx(['wrangler', 'whoami']); }
  catch {
    console.log('\n首次使用需要登录 Cloudflare，浏览器会自动打开。');
    runNpx(['wrangler', 'login']);
  }

  const workerName = (await ask('Worker 名称', 'szfp8-tax-seo')).replace(/[^a-zA-Z0-9-]/g, '-');
  const domainInput = await ask('网站域名', 'szfp8.com');
  const domain = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain) throw new Error('网站域名不能为空。');

  const d1Name = await ask('现有 D1 数据库名称', 'szfp8-tax-seo-db');
  const siteName = await ask('网站名称', '全国财税发票服务');
  const phone = await ask('联系电话（可留空）', '');
  const siteUrl = `https://${domain}`;

  console.log('\n正在读取 D1 信息（只读，不修改数据库）...');
  let d1Id = '';
  try {
    const raw = execFileSync(npx, ['wrangler', 'd1', 'info', d1Name, '--json'], {
      cwd: appDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: false,
    });
    const info = JSON.parse(raw);
    d1Id = info.uuid || info.id || info.database_id || info.databaseId || '';
  } catch {
    throw new Error(`找不到 D1 数据库 ${d1Name}。请确认 Cloudflare 中的 D1 名称正确。`);
  }
  if (!d1Id) throw new Error(`D1 ${d1Name} 没有读取到 database_id。`);

  const config = `# Generated locally. Do not commit this file.\nname = "${workerName}"\nmain = "src/entrypoint.ts"\ncompatibility_date = "2026-09-01"\ncompatibility_flags = ["nodejs_compat"]\nworkers_dev = true\n\n[[d1_databases]]\nbinding = "DB"\ndatabase_name = "${d1Name}"\ndatabase_id = "${d1Id}"\nmigrations_dir = "./migrations"\n\n[[r2_buckets]]\nbinding = "MEDIA_BUCKET"\nbucket_name = "szfp8-tax-seo-media"\n\n[vars]\nENVIRONMENT = "production"\nSITE_NAME = "${siteName.replaceAll('"', '\\"')}"\nSITE_URL = "${siteUrl}"\nBETTER_AUTH_URL = "${siteUrl}"\nCONTACT_PHONE = "${phone.replaceAll('"', '\\"')}"\n\n[[routes]]\npattern = "${domain}"\ncustom_domain = true\n\n[triggers]\ncrons = ["0 */6 * * *"]\n\n[observability]\nenabled = true\n`;

  writeFileSync(configPath, config, 'utf8');
  console.log(`\n已生成临时 Cloudflare 配置：${configPath}`);

  console.log('\n安装应用目录依赖...');
  runNpm(['install']);

  // Critical: both secrets are required for login / CSRF / admin access.
  const authSecret = randomBytes(32).toString('base64url');
  const jwtSecret = randomBytes(32).toString('base64url');
  const indexNowKey = randomBytes(16).toString('hex');

  putSecret('BETTER_AUTH_SECRET', authSecret);
  putSecret('JWT_SECRET', jwtSecret);
  putSecret('INDEXNOW_KEY', indexNowKey);

  console.log('\n部署 Worker（不会执行 D1 migration）...');
  runNpx(['wrangler', 'deploy', '--config', configPath]);

  console.log('\n================================================');
  console.log(' 部署完成');
  console.log('================================================');
  console.log(`网站：https://${domain}`);
  console.log(`登录：https://${domain}/auth/login`);
  console.log('SEO：/robots.txt  /sitemap.xml  /news  /search  /contact');
  console.log('文章：/article/<slug>');
  console.log('城市：/city/<city-name>');
  console.log('');
  console.log('已自动写入密钥：BETTER_AUTH_SECRET / JWT_SECRET / INDEXNOW_KEY');
  console.log('若仍无法登录后台：打开 /auth/register 注册第一个用户，');
  console.log('系统会自动把首个用户提升为管理员。');
  console.log('D1：只读取信息，没有自动执行 migration。');
} catch (error) {
  console.error('\n部署失败：');
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  await rl.close();
}
