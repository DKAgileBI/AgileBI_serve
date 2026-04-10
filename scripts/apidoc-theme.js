/**
 * @name apidoc-theme
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/24
 * @description apidoc 主题处理脚本，用于拷贝主题资源并向页面注入自定义样式。
 **/
const fs = require('fs');
const path = require('path');

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileSyncSafe(src, dest) {
  ensureDirSync(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function injectStylesheetLink(indexHtml, href) {
  if (indexHtml.includes(`href=\"${href}\"`) || indexHtml.includes(`href='${href}'`)) {
    return indexHtml;
  }

  // 优先插入在 main.css 后面
  const mainCssRe = /(<link\s+[^>]*href=\"assets\/main\.css\"[^>]*>)/i;
  if (mainCssRe.test(indexHtml)) {
    return indexHtml.replace(mainCssRe, `$1\n  <link href=\"${href}\" rel=\"stylesheet\" media=\"screen, print\">`);
  }

  // 否则插在 </head> 之前
  const headCloseRe = /\n<\/head>/i;
  if (headCloseRe.test(indexHtml)) {
    return indexHtml.replace(headCloseRe, `\n  <link href=\"${href}\" rel=\"stylesheet\" media=\"screen, print\">\n</head>`);
  }

  return indexHtml;
}

function injectScriptTag(indexHtml, src) {
  if (indexHtml.includes(`src="${src}"`) || indexHtml.includes(`src='${src}'`)) {
    return indexHtml;
  }

  const mainBundleRe = /(<script\s+[^>]*src="assets\/main\.bundle\.js"[^>]*><\/script>)/i;
  if (mainBundleRe.test(indexHtml)) {
    return indexHtml.replace(mainBundleRe, `$1\n<script src="${src}"></script>`);
  }

  const bodyCloseRe = /\n<\/body>/i;
  if (bodyCloseRe.test(indexHtml)) {
    return indexHtml.replace(bodyCloseRe, `\n<script src="${src}"></script>\n</body>`);
  }

  return indexHtml;
}

function removeThemeLinks(indexHtml) {
  // 移除我们自己注入过的主题（避免多个主题叠加）
  return indexHtml.replace(/\n\s*<link[^>]*href=\"assets\/(theme-tech|theme-xhs-like|theme-custom)\.css\"[^>]*>\s*/gi, '\n');
}

function removeThemeScripts(indexHtml) {
  return indexHtml.replace(/\n\s*<script[^>]*src="assets\/theme-custom\.js"[^>]*><\/script>\s*/gi, '\n');
}

function main() {
  const root = process.cwd();
  const themeSrc = path.join(root, 'apidoc_theme', 'theme-xhs-like.css');
  const themeJsSrc = path.join(root, 'apidoc_theme', 'theme-custom.js');
  const outDir = path.join(root, 'public', 'MrFan');
  const assetsDir = path.join(outDir, 'assets');
  const themeDest = path.join(assetsDir, 'theme-custom.css');
  const themeJsDest = path.join(assetsDir, 'theme-custom.js');
  const indexPath = path.join(outDir, 'index.html');

  if (!fs.existsSync(themeSrc)) {
    console.error('[apidoc-theme] theme source not found:', themeSrc);
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(indexPath)) {
    console.error('[apidoc-theme] index.html not found (apidoc not generated?):', indexPath);
    process.exitCode = 1;
    return;
  }

  copyFileSyncSafe(themeSrc, themeDest);

  if (fs.existsSync(themeJsSrc)) {
    copyFileSyncSafe(themeJsSrc, themeJsDest);
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  const cleaned = removeThemeScripts(removeThemeLinks(html));
  let next = injectStylesheetLink(cleaned, 'assets/theme-custom.css');
  if (fs.existsSync(themeJsSrc)) {
    next = injectScriptTag(next, 'assets/theme-custom.js');
  }
  if (next !== html) {
    fs.writeFileSync(indexPath, next, 'utf8');
  }

  console.log('[apidoc-theme] applied: assets/theme-custom.css and assets/theme-custom.js');
}

main();
