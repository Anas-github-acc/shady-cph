# CPH (Fetch Testcases From Codeforces)

A lightweight Competitive Programming Helper (CPH) CLI that automatically receives sample testcases via browser extension, stores them locally, and runs your solution against them directly from your terminal via **shady cli**.

No complex setup, No heavy UI. Just a fast CLI and minimal command to get the testcase and run.

---

### Suppoted Coding Platform
[![Codeforces](https://img.shields.io/badge/Codeforces-Compatible-blue.svg)](https://codeforces.com/)

### Language Support
[![C++](https://img.shields.io/badge/C%2B%2B-Supported-success.svg?logo=cplusplus&logoColor=white)](#)
[![Python](https://img.shields.io/badge/Python-Supported-success.svg?logo=python&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-Supported-success.svg?logo=javascript&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Supported-success.svg?logo=typescript&logoColor=white)](#)
[![Java](https://img.shields.io/badge/Java-Supported-success.svg?logo=openjdk&logoColor=white)](#)
[![Go](https://img.shields.io/badge/Go-Supported-success.svg?logo=go&logoColor=white)](#)
[![Rust](https://img.shields.io/badge/Rust-Supported-success.svg?logo=rust&logoColor=white)](#)

---

## About

**Shady CPH** is a command-line tool built for competitive programmers who prefer fast performance via our **shady-cli** and automatic testcase fetching via our **browser extension**.

**Shady CP Parser** browser extension parses sample testcases directly from competitive programming platforms (like Codeforces) and sends them to your local CLI server.

The CLI starts a small local background daemon/server that listens for incoming testcase, stores them in your project, and lets you test solutions with a single command.

---

## Quick Start

### 1. Installation
Install the CLI globally via npm:
```bash
npm install -g shady-cph
```

### 2. Initialize a Project
Run the initialization command in your competitive programming workspace:
```bash
sd init
```
This creates:
- `.testcase/` (directory where testcase are stored)
- `shady.json` (configuration file)

### 3. Start the Local Server
Start the daemon to listen for incoming testcase payloads:
```bash
sd run
```
The server listens on `http://localhost:42585` by default.

### 4. Fetch Testcases
1. Open a supported problem on Codeforces (or other supported platforms) in your browser.
2. Click the **Shady Insert** extension button on top of Testcase to send the sample testcases to Shady.
3. The samples are automatically parsed and saved inside your local project:
   ```
   .testcase/1230A.codeforces.test
   ```

### 5. Run & Test Your Solution
To execute your code against the downloaded testcases, run:
```bash
sd test main.cpp
# or
sd test solution.py
```
The runner compiles your solution (if needed), executes it against all saved testcases, and displays a beautiful colored diff of any failing cases in the terminal.

---

## CLI Commands & Options

| Command | Arguments / Options | Description |
| :--- | :--- | :--- |
| **`sd init`** | `[-y, --yes]` | Initializes `shady.json` and `.testcase/` directory. Use `-y` or `--yes` to skip interactive configuration prompts. |
| **`sd run`** | `[-p, --port <port>]` | Starts the local HTTP server in the background (as a daemon) to listen for testcase inputs. Port defaults to `42585`. |
| **`sd test <solution-file>`** | `[--problem <number>]`<br>`[--platform <platform>]` | Compiles (if needed) and executes the specified solution file against testcases. Option `--problem` runs a specific problem's testcases, and `--platform` disambiguates when multiple matches exist. |
| **`sd status`** | — | Checks and shows the running status of the background server daemon. |
| **`sd stop`**| — | Stops the background server daemon. |
| **`sd logs`** | — | View and tail the log stream of the background server daemon. |
| **`sd submit <solution-file>`** | `[--compiler <string>]`<br>| | submit the solution code to the **codeforces**. Submit to latest fetch question (e.g., 2304D ) and if you want to change the question (e.g., 2304A) edit file `.testcase/.run-latest` |
| **`sd clean`**| — | Stops the server and cleans up/deletes all downloaded testcase files. |
---

## Features
- Terminal Lover
- Automated testcase fetching.
- Lightweight background daemon (`sd run`, `sd stop`, `sd status`, `sd logs`).
- No heavy IDE dependencies.
- Multi-language compilation and runner.
- Flexible configuration (`shady.json`).
- Colored terminal diffs.
- Runtime error and compilation error.

---

## License

[MIT](file:///home/anas/myspace/personal/shady/LICENSE)
