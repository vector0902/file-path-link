// File Path Linker - make file paths clickable in ANY editor file.
// Matches: /abs/path/file.ext, ./rel/file.ext, ../rel/file.ext, C:\path\file.ext
// optionally followed by :line and/or :line:col, and/or #anchor (heading/item token).
const path = require('path');
const fs = require('fs');

const MAX_ANCHOR_FILE_BYTES = 5 * 1024 * 1024;
const HEADING_RE = /^\s{0,3}#{1,6}\s/;
const ITEM_RE = /^\s*[-*]\s+\[[ xIICPF]\]/;

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5\-]+/g, '-');
}

// Returns a 1-based line number, or 0 when the token is not found.
function findAnchorLine(lines, token) {
  if (!token) return 0;
  const asLine = /^L(\d+)$/.exec(token);
  if (asLine) return parseInt(asLine[1], 10);
  const t = token.toLowerCase();
  const slug = slugify(token);
  const hit = (line) => {
    const low = line.toLowerCase();
    return low.includes(t) || (slug.length > 0 && slugify(line).includes(slug));
  };
  for (const re of [HEADING_RE, ITEM_RE]) {
    const i = lines.findIndex((line) => re.test(line) && hit(line));
    if (i >= 0) return i + 1;
  }
  const i = lines.findIndex(hit);
  return i >= 0 ? i + 1 : 0;
}

function activate(ctx) {
  const vscode = require('vscode');
  // Negative lookbehind avoids matching inside URLs (http://...) or identifiers.
  // Branches: absolute /abs, ./rel, ../rel, drive C:\, and bare relative name.ext (logs/stack traces).
  const RE = /(?<![A-Za-z0-9_./:])((?:\/[\w.\-]+)+|\.{1,2}\/[\w.\-\/]+|[A-Za-z0-9_][\w.\-\/]*\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|java|rs|rb|c|cc|cpp|h|hpp|php|sh|bash|zsh|json|jsonc|md|markdown|yml|yaml|toml|txt|log|xml|html|htm|css|scss|less|sql|lua|pl|r|kt|swift|dart|gradle|vue|svelte|csv|ini|cfg|conf)|[A-Za-z]:\\[^\s:]+|\.\\[\w.\-\\]+)(?::(\d+))?(?::(\d+))?(?:#([\w.\-]+))?/g;

  const provider = {
    provideDocumentLinks(doc, _token) {
      const links = [];
      const text = doc.getText();
      let m;
      while ((m = RE.exec(text)) !== null) {
        const p = m[1];
        const line = m[2] ? parseInt(m[2], 10) : undefined;
        const col = m[3] ? parseInt(m[3], 10) : undefined;
        const anchor = m[4] || undefined;
        // Only linkify things that look like files (have an extension), end with
        // a slash, or (for dotless candidates) actually exist on disk as a file or directory.
        if (!/\.[A-Za-z0-9]{1,12}$/.test(p) && !p.endsWith('/') && !p.endsWith('\\')) {
          let target = p;
          if (!path.isAbsolute(p)) {
            target = path.resolve(path.dirname(doc.uri.fsPath), p);
          }
          try {
            fs.statSync(target);
          } catch {
            continue;
          }
        }
        const start = doc.positionAt(m.index);
        const end = doc.positionAt(m.index + m[0].length);
        const range = new vscode.Range(start, end);
        const args = { path: p, line: line, col: col, anchor: anchor, from: doc.uri.fsPath };
        const uri = vscode.Uri.parse(
          'command:filePathLinker.open?' + encodeURIComponent(JSON.stringify(args))
        );
        links.push(new vscode.DocumentLink(range, uri));
      }
      return links;
    }
  };

  ctx.subscriptions.push(vscode.languages.registerDocumentLinkProvider('*', provider));

  ctx.subscriptions.push(
    vscode.commands.registerCommand('filePathLinker.open', (args) => {
      if (!args || !args.path) {
        return;
      }
      let filePath = args.path;
      if (!path.isAbsolute(filePath)) {
        const base = args.from
          ? path.dirname(args.from)
          : vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;
        if (base) {
          filePath = path.resolve(base, filePath);
        }
      }
      const uri = vscode.Uri.file(filePath);
      // Directories cannot be opened as text documents; reveal them in the Explorer instead.
      let st = null;
      try {
        st = fs.statSync(uri.fsPath);
      } catch {}
      if (st && st.isDirectory()) {
        if (vscode.workspace.getWorkspaceFolder(uri)) {
          // Inside an open workspace: locate/reveal it in the Explorer.
          vscode.commands.executeCommand('revealInExplorer', uri);
        } else {
          // Outside the workspace: open the directory in a new window.
          vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
        }
        return;
      }
      const opts = { preview: false, preserveFocus: false };
      const openFailed = (e) =>
        vscode.window.showErrorMessage('Cannot open: ' + filePath + ' (' + e.message + ')');

      let targetLine = typeof args.line === 'number' ? args.line : 0;
      if (!targetLine && args.anchor) {
        try {
          const st = fs.statSync(uri.fsPath);
          if (st.isFile() && st.size <= MAX_ANCHOR_FILE_BYTES) {
            const text = fs.readFileSync(uri.fsPath, 'utf8');
            targetLine = findAnchorLine(text.split('\n'), args.anchor);
          }
        } catch {}
      }
      if (targetLine > 0) {
        const pos = new vscode.Position(
          Math.max(0, targetLine - 1),
          Math.max(0, (args.col || 1) - 1)
        );
        vscode.window.showTextDocument(uri, opts).then((ed) => {
          ed.selection = new vscode.Selection(pos, pos);
          ed.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
        }, openFailed);
      } else {
        // No line/col requested: open with the default editor so binary/media
        // files (images, audio, video) open in their viewer instead of as text.
        vscode.commands.executeCommand('vscode.open', uri).then(undefined, openFailed);
      }
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate, findAnchorLine };
