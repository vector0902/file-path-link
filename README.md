# File Path Linker

A VS Code / code-server extension.

Make file paths clickable in any editor file. In any language or plain-text file, paths
such as `/abs/path/file.ext:12`, `./rel/file.js`, `../up/file.ts:3:5` and `C:\path\file.txt`
become Ctrl+Click links that open the target file and jump to the given line (and column).

![File Path Linker screenshot](images/screenshot.png)

## Features

- Registers a `DocumentLinkProvider` for every language (`*` scope).
- Matches absolute paths, relative paths (`./`, `../`), and Windows drive paths (`C:\...`).
- Optional `:line` and `:line:col` suffixes.
- Relative paths are resolved against the directory of the file being read, not the workspace root.
- A negative lookbehind prevents URLs (`http://...`) and code identifiers from being linked;
  only strings with a known file extension (or a trailing `/` or `\`) are linked.

## Installation

### code-server

```bash
mkdir -p ~/.local/share/code-server/extensions/file-path-linker
cp package.json extension.js ~/.local/share/code-server/extensions/file-path-linker/
```

Then reload the window: `Ctrl+Shift+P` -> `Developer: Reload Window`.

### VS Code (desktop)

Copy `package.json` and `extension.js` into an extension folder such as
`~/.vscode/extensions/file-path-linker/`, then reload the window as above.

## Usage

Open any file that mentions a file path (`.log`, `.md`, `.txt`, source files, ...) and
Ctrl+Click (Cmd+Click on macOS) the path to jump to it.

Supported forms:

```text
/path/to/file.js           opens the file
/path/to/file.js:42        opens at line 42
/path/to/file.js:42:10     opens at line 42, column 10
./relative/file.py:7       resolved against the current file's directory
../up/file.ts              parent-relative path
C:\path\file.txt           Windows path
```

If the target does not exist, an error message is shown.

## How it works

- `extension.js` registers a document link provider for the `*` language scope and scans
  the document for path-like strings.
- A single regex handles matching and captures an optional `:line` and `:line:col`.
- Each match is emitted as a `command:filePathLinker.open?{...}` link. Clicking the link
  runs the command, resolves relative paths against the current file's directory, and
  opens the target with the requested line/column.

## Tests

The `tests/` directory contains:

- `run-regex-test.js` - automated check that mirrors the production regex and reports pass/fail per line.
- `test_links.txt` - manual Ctrl+Click cases (absolute, relative, and negative cases).
- `sample.txt` - a small jump target used by the bare-relative test case.

Run the automated check:

```bash
node tests/run-regex-test.js
```

## License

MIT
