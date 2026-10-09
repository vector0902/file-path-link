// File Path Linker - make file paths clickable in ANY editor file.
// Matches: /abs/path/file.ext, ./rel/file.ext, ../rel/file.ext, C:\path\file.ext
// optionally followed by :line and/or :line:col.
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(ctx) {
  // Negative lookbehind avoids matching inside URLs (http://...) or identifiers.
  // Branches: absolute /abs, ./rel, ../rel, drive C:\, and bare relative name.ext (logs/stack traces).
  const RE = /(?<![A-Za-z0-9_./:])((?:\/[\w.\-]+)+|\.{1,2}\/[\w.\-\/]+|[A-Za-z0-9_][\w.\-\/]*\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|java|rs|rb|c|cc|cpp|h|hpp|php|sh|bash|zsh|json|jsonc|md|markdown|yml|yaml|toml|txt|log|xml|html|htm|css|scss|less|sql|lua|pl|r|kt|swift|dart|gradle|vue|svelte|csv|ini|cfg|conf)|[A-Za-z]:\\[^\s:]+|\.\\[\w.\-\\]+)(?::(\d+))?(?::(\d+))?/g;

  const provider = {
    provideDocumentLinks(doc, _token) {
      const links = [];
      const text = doc.getText();
      let m;
      while ((m = RE.exec(text)) !== null) {
        const p = m[1];
        const line = m[2] ? parseInt(m[2], 10) : undefined;
        const col = m[3] ? parseInt(m[3], 10) : undefined;
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
        const args = { path: p, line: line, col: col, from: doc.uri.fsPath };
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

      if (typeof args.line === 'number') {
        const pos = new vscode.Position(
          Math.max(0, args.line - 1),
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

module.exports = { activate, deactivate };
