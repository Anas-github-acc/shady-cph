# Shady-cph v1.0.0

The **Shady-cph** is a CLI tool for Competitive Programming Helper (CPH) 

### Features:
- One command Fetch Testcase from Codeforces via Browser Extension.
- Run you solution across these Testcase.
- Extremely Fast and Lightweight Performance.
- One command Submit solution to Codeforces.
- Auto Detect Languages.
- Full customization through shady.json

The [Shady-cph](https://github.com/Anas-github-acc/shady-cph) is distributed as a global CLI package for [Node.js](https://nodejs.org/) modules.

## Installation

Using npm:
```shell
$ npm i -g shady
```

Verify the installation:

```dash
sd --version
```

Initialize a competitive programming project:

```bash
sd init
```

Start the local server:

```bash
sd run
```

Before this download [Extension]() here and visit codeforces, you found a `Shady Insert`. The button insert the testcase to .testcase folder to your init directory
![Shady-Insert](https://raw.githubusercontent.com/Anas-github-acc/repo/main/assets/shady-insert-preview-image.png)

Run your solution against the latest downloaded testcases:

```bash
sd test main.cpp
```

Submit your solution to codeforces:

```bash
sd submit solution.cpp
```


See the [package source]() for more details.

<!-- **Note:**<br> -->

## CLI Commands & Options

| Command | Arguments / Options | Description |
| :--- | :--- | :--- |
| **`sd init`** | `[-y, --yes]` | Initializes `shady.json` and `.testcase/` directory. Use `-y` or `--yes` to skip interactive configuration prompts. |
| **`sd run`** | `[-p, --port <port>]` | Starts the local HTTP server in the background (as a daemon) to listen for testcase inputs. Port defaults to `42585`. |
| **`sd test`** | `<solution-file>`<br>`[--problem <number>]`<br>`[--platform <platform>]` | Compiles (if needed) and executes the specified solution file against testcases. Option `--problem` runs a specific problem's testcases, and `--platform` disambiguates when multiple matches exist. |
| **`sd status`** | — | Checks and shows the running status of the background server daemon. |
| **`sd stop`**| — | Stops the background server daemon. |
| **`sd logs`** | — | View and tail the log stream of the background server daemon. |
| **`sd submit`** | `<solution-file>`<br>`[--compiler <string>]`<br>| | submit the solution code to the **codeforces**. Submit to latest fetch question (e.g., 2304D ) and if you want to change the question (e.g., 2304A) edit file `.testcase/.run-latest` |
| **`sd clean`**| — | Stops the server and cleans up/deletes all downloaded testcase files. |

## Support

if you have doubt, need Demo or need new feature, Contact me on my email, i will respond in less than 6 hour
Email: anas.ahamad955@gmail.com

<!-- Tested in Chrome 74-75, Firefox 66-67, IE 11, Edge 18, Safari 11-12, & Node.js 8-12.<br> -->
<!-- Automated [browser](https://saucelabs.com/u/lodash) & [CI](https://travis-ci.org/lodash/lodash/) test runs are available. -->
