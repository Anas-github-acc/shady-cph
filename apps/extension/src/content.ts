import { codeforcesParser } from "./parsers/codeforces";
import { CPPayload } from "@repo/shared-schemas";

let config = {
  hostUrl: "http://localhost:42585",
  consoleOnly: false,
};

function updateConfigAndRun(callback?: () => void) {
  chrome.storage.local.get(["hostUrl", "consoleOnly"], (settings) => {
    if (settings.hostUrl) config.hostUrl = settings.hostUrl;
    if (settings.consoleOnly !== undefined) config.consoleOnly = settings.consoleOnly;
    if (callback) callback();
  });
}

async function routePayload(payload: CPPayload) {
  if (config.consoleOnly) {
    console.log("🚀 [Shady Insert - Console Output]:", payload);
    return;
  }

  try {
    const response = await fetch(config.hostUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`✅ Shady Insert sent successfully to ${config.hostUrl}`);
    } else {
      alert(`❌ Server responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Shady Insert Error:", error);
    alert(`❌ Could not connect to host at ${config.hostUrl}.`);
  }
}

function injectShadyButtons() {
  let parser = null;
  if (window.location.hostname.includes("codeforces.com")) {
    parser = codeforcesParser;
  }
  if (!parser) return;

  const sampleTestBlocks = document.querySelectorAll(".sample-test");

  sampleTestBlocks.forEach((block) => {
    if (block.querySelector(".shady-insert-btn")) return;

    const btn = document.createElement("button");
    btn.innerText = "Shady Insert";
    btn.className = "shady-insert-btn";

    Object.assign(btn.style, {
      padding: "5px 10px",
      backgroundColor: "#3b5998",
      color: "white",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "bold",
      marginBottom: "10px",
      display: "block",
    });

    btn.addEventListener("click", () => {
      updateConfigAndRun(() => {
        const metadata = parser.getMetadata();
        const testCases = parser.getTestCases();

        if (testCases.length === 0) {
          alert("No testcases found to parse.");
          return;
        }

        if (config.consoleOnly) {
          alert("⚡ Console Only Mode active! Check your devtools console tab.");
        }

        testCases.forEach((tc) => {
          const payload: CPPayload = {
            parser: { version: "1.2.0", name: "Shady CP Extension" },
            ...metadata,
            testcase: tc,
          };
          routePayload(payload);
        });
      });
    });

    block.insertBefore(btn, block.firstChild);
  });
}

// Kick off initialization sequence
updateConfigAndRun(injectShadyButtons);
