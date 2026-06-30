# Shady-cph 1.0.6

The [Shady-cph](https://github.com/Anas-github-acc/shady-cph) is a CLI tool for Competitive Programming Helper (CPH) 

### Features:
- Single Command for Fetch Testcase from codeforces.
- Test your solution across the Testcase.
- Single command for Submit Solution to codeforces.
- Extremely Fast and Lightweight Performance.
- Auto Detect Languages.
- Customisable config via shady.json

The **Shady-cph** is distributed as a global CLI package for [Node.js](https://nodejs.org/) modules.

Note: Currently we only support [codeforces](https://codeforces.com/) (other platform would be added on [request](#Support)) 

## Installation

Using npm:

```bash
npm i -g shady-cph
```

This will install Shady CLI (`sd` or `shady`)

Verify the installation:

```bash
sh --version
```

### Get Started:

Note: We use [Browser Extension](https://github.com/Anas-github-acc/shady-cph/releases/tag/ext-latest) to interact with codeforces but do not worry about installing it, it will automatically install with `sd init`

1. Run `init` command in the folder where you practice CP:
*This is setup test environment (.testcase fodler and shady.json) and install zip file of [browser extension](https://github.com/Anas-github-acc/shady-cph/releases/tag/ext-latest) and give instruction to setup in your browser*
```bash
sd init
```

2. Start the local server to **Fetch** and **Submit**:

```bash
sd run
```

### How to Fetch Testcase
Visit codeforces, you found a `Shady Insert` button that inserts the testcase to .testcase folder to your init directory
<br>
![Shady-Insert](https://github.com/Anas-github-acc/shady-cph/blob/main/assets/shady-insert-preview-image.png)

Run your solution against the latest downloaded testcases:

### Run Test
```bash
sd test main.cpp
```

### Submit your solution:

```bash
sd submit solution.cpp
```


See the [package source](https://github.com/Anas-github-acc/shady-cph/tree/1.0.6-npm) for more details.

<!-- **Note:**<br> -->

## Commands & Options

| Command | Arguments / Options | Description |
| :--- | :--- | :--- |
| **`sd init`** | `[-y, --yes]` | Initializes `shady.json` and `.testcase/` directory. Use `-y` or `--yes` to skip interactive configuration prompts. |
| **`sd run`** | `[-p, --port <port>]` | Starts the local HTTP server in the background (as a daemon) to listen for testcase inputs. Port defaults to `42585`. |
| **`sd test <file>`** | `[--problem <number>]`<br>`[--platform <platform>]` | Compiles (if needed) and executes the specified solution file against testcases. Option `--problem` runs a specific problem's testcases, and `--platform` disambiguates when multiple matches exist. |
| **`sd stop`**| — | Stops the background server daemon. |
| **`sd submit <ile>`** | `[--compiler <string>]`| | submit the solution code to the **codeforces**. Submit to latest fetch question (e.g., 2304D ) and if you want to change the question (e.g., 2304A) edit file `.testcase/.run-latest` |
| **`sd status`** | — | Checks and shows the running status of the background server daemon. |
| **`sd logs`** | — | View and tail the log stream of the background server daemon. |
| **`sd clean`**| — | Stops the server and cleans up/deletes all downloaded testcase files. |

<br>

## Support

Contect Email: anas.ahamad955@gmail.com \\
We will response within **3hr time window** 

### For what i can email
- Need Some new Features
- Have Some Doubt
- Asking Demo
- Want to contribute or open issue (visit [shady-cph](https://github.com/Anas-github-acc/shady-cph))

<!-- Tested in Chrome 74-75, Firefox 66-67, IE 11, Edge 18, Safari 11-12, & Node.js 8-12.<br> -->
<!-- Automated [browser](https://saucelabs.com/u/lodash) & [CI](https://travis-ci.org/lodash/lodash/) test runs are available. -->
