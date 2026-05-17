#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..'); // frontend root
const IGNORES = ['node_modules', '.git', 'dist', 'out', 'build', '.angular', '.vscode'];
const TEXT_EXTS = ['.ts', '.js', '.html', '.scss', '.css'];

/**
 * walk: TODO - describe this function
 */
function walk(dir, cb) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    if (IGNORES.includes(f)) continue;
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

/**
 * makeHeader: TODO - describe this function
 */
function makeHeader(relPath, ext) {
  const title = `Project: doublePlay (frontend)`;
  const fileLine = `File: ${relPath}`;
  const desc = `Description: Brief description of this file`;

  if (ext === '.html') {
    return `<!--\n  ${title}\n  ${fileLine}\n  ${desc}\n-->\n\n`;
  }
  // default: block comment
  return `/*\n  ${title}\n  ${fileLine}\n  ${desc}\n*/\n\n`;
}

function stripHeaderMetadata(content) {
  if (content.startsWith('/*')) {
    return content.replace(/^\/\*[\s\S]*?\*\/\n?/, (block) => {
      const cleaned = block
        .split('\n')
        .filter((line) => !/^\s*(\d{4}-\d{2}-\d{2}|Author:\s*TODO: add author)\s*$/.test(line))
        .join('\n');
      return cleaned;
    });
  }

  if (content.startsWith('<!--')) {
    return content.replace(/^<!--[\s\S]*?-->\n?/, (block) => {
      const cleaned = block
        .split('\n')
        .filter((line) => !/^\s*(\d{4}-\d{2}-\d{2}|Author:\s*TODO: add author)\s*$/.test(line))
        .join('\n');
      return cleaned;
    });
  }

  return content;
}

/**
 * hasHeader: TODO - describe this function
 */
function hasHeader(content, relPath) {
  return content.includes('Project: doublePlay') || content.includes('Project: doublePlay (frontend)');
}

/**
 * addFunctionComments: TODO - describe this function
 */
function addFunctionComments(content) {
  // Add simple JSDoc comments before top-level function declarations and arrow-assigned functions
  // Skip if a JSDoc /** */ already immediately precedes the function
  let out = content;

  // function declarations: export function foo(...)
  out = out.replace(/(^|\n)(export\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g, (m, p1, p2, name, offset, str) => {
    const before = str.slice(Math.max(0, offset - 200), offset + m.length);
    if (/\*\//.test(before) || /\*\*/.test(before)) return m; // existing comment
    const comment = `${p1}/**\n * ${name}: TODO - describe this function\n */\n${p2 || ''}function ${name}(`;
    return comment;
  });

  // const foo = (...) => {  OR  const foo = function(...)
  out = out.replace(/(^|\n)(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\(?[A-Za-z0-9_,\s]*\)?\s*=>\s*\{/g,
    (m, p1, decl, name) => {
      const offset = arguments[3] - m.length; // not reliable, so fallback to simple check
      // simple existence check: look a few chars before the match
      const before = out.slice(Math.max(0, out.indexOf(m) - 200), out.indexOf(m));
      if (/\/\*\*/.test(before)) return m;
      const comment = `${p1}/**\n * ${name}: TODO - describe this arrow function\n */\n${decl} ${name} = `;
      return comment;
    }
  );

  // const foo = function(...) {
  out = out.replace(/(^|\n)(const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*function\s*\(/g, (m, p1, decl, name) => {
    const idx = out.indexOf(m);
    const before = out.slice(Math.max(0, idx - 200), idx);
    if (/\/\*\*/.test(before)) return m;
    const comment = `${p1}/**\n * ${name}: TODO - describe this function expression\n */\n${decl} ${name} = function(`;
    return comment;
  });

  return out;
}

function processFile(full, options) {
  const rel = path.relative(ROOT, full).replace(/\\/g, '/');
  const ext = path.extname(full).toLowerCase();
  if (!TEXT_EXTS.includes(ext)) return;
  let content = fs.readFileSync(full, 'utf8');
  const original = content;

  if (options.stripMeta) {
    const stripped = stripHeaderMetadata(content);
    if (stripped !== content) {
      content = stripped;
      console.log(`Stripped header metadata from ${rel}`);
    }
  }

  if (!hasHeader(content, rel)) {
    const header = makeHeader(rel, ext);
    content = header + content;
    console.log(`Added header to ${rel}`);
  }

  if (ext === '.ts' || ext === '.js') {
    const withComments = addFunctionComments(content);
    if (withComments !== content) {
      content = withComments;
      console.log(`Added function comments in ${rel}`);
    }
  }

  if (content !== original) {
    fs.writeFileSync(full, content, 'utf8');
  }
}

/**
 * main: TODO - describe this function
 */
function main() {
  console.log('Running add_headers.js (dry-run option: pass --dry to skip writes)');
  const dry = process.argv.includes('--dry');
  const stripMeta = process.argv.includes('--strip-meta');

  const toProcess = [];
  walk(ROOT, (file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (
      rel.startsWith('node_modules') ||
      rel.startsWith('.angular') ||
      rel.startsWith('.vscode') ||
      rel.includes('/node_modules/') ||
      rel.includes('/.angular/') ||
      rel.includes('/.vscode/')
    ) return;
    const ext = path.extname(file).toLowerCase();
    if (TEXT_EXTS.includes(ext)) toProcess.push(file);
  });

  for (const f of toProcess) {
    if (dry) {
      console.log(`[dry] would process: ${path.relative(ROOT, f)}`);
    } else {
      try {
        processFile(f, { stripMeta });
      } catch (err) {
        console.error('Error processing', f, err.message);
      }
    }
  }

  console.log('Done. Review changes with git diff, then commit as needed.');
}

if (require.main === module) main();
