# CPH (Fetch Testcases From Codeforces)

A lightweight CLI Tool for Competitive Programming Helper (CPH) that fetched sample testcases, stores them locally, runs your solution against them directly from your terminal via **shady cli** and submit the solution to the coding platform.

> [!NOTE]
> No complex setup, No heavy UI. Just a fast CLI and minimal command to fetch the Testcase, Run and Submit.

The [Shady-cph](https://www.npmjs.com/package/shady-cph) is distributed as a global CLI package on **npm package**.

### Coding Platform Supported
- [Codeforces](https://codeforces.com/)

### Language Support
[![C++](https://img.shields.io/badge/C%2B%2B-Supported-success.svg?logo=cplusplus&logoColor=white)](#)
[![Python](https://img.shields.io/badge/Python-Supported-success.svg?logo=python&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-Supported-success.svg?logo=javascript&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Supported-success.svg?logo=typescript&logoColor=white)](#)
[![Java](https://img.shields.io/badge/Java-Supported-success.svg?logo=openjdk&logoColor=white)](#)
[![Go](https://img.shields.io/badge/Go-Supported-success.svg?logo=go&logoColor=white)](#)
[![Rust](https://img.shields.io/badge/Rust-Supported-success.svg?logo=rust&logoColor=white)](#)


## Must Read

**Shady CPH** is a command-line tool built for competitive programmers who prefer fast performance and automat majority of the coding processes like fetching testcase, running test and submitting code.

We uses **Browser Extension** to parses Sample Testcases directly from competitive programming platforms (like Codeforces) and sends them to your workspace.

The CLI starts a small local background daemon server that listens for incoming testcase and lets you **Submit** solutions back to **Coding Platform**.

Uses your system coding environment to run Test across the Testcases. If you want to edit testcase you can do inside .testcase/* and to change the config edit **shady.json**

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
```

The runner compiles your solution (if needed), executes it against all saved testcases, and displays a beautiful colored diff of any failing cases in the terminal.

### 6. Submit Code to Coding Platform
While submitting the solution your question page should be opened in the background and your browser extension should be showing connected to daemon
```bash
sd submit main.cpp
```

## Commands & Options

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

## Features
- Single Command for Fetch Testcase from codeforces.
- Test your solution across the Testcase.
- Single command for Submit Solution to codeforces.
- Extremely Fast and Lightweight Performance.
- Auto Detect Languages.
- Customisable config via shady.json
- No heavy IDE dependencies.
- Multi-language compilation and runner.
- Flexible configuration (`shady.json`).
- Colored terminal output.
- Runtime error and compilation error.

---

## License

[MIT](file:///home/anas/myspace/personal/shady/LICENSE)
