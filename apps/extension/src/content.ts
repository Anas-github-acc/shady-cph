import { codeforcesParser } from "./parsers/codeforces";
import { CPSubmission, CPPayload } from "@repo/shared-schemas";

const EXTENSION_COMPILER_MAP: Record<string, string> = {
  "cpp": "54", // GNU G++17 7.3.0
  "cc": "89",  // GNU G++20 13.2
  "c": "43",   // GNU GCC C11 5.1.0
  "py": "31",  // Python 3.13.2
  "java": "87",// Java 21 64bit
  "rs": "75",  // Rust 1.89.0 (2021)
  "go": "32",  // Go 1.22.2
  "js": "55"   // Node.js 15.8.0 (64bit)
};

function inferProgramTypeId(filename: string): string | undefined {
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_COMPILER_MAP[extension] || undefined;
}

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
    console.log("[Shady Insert - Console Output]:", payload);
    return;
  }

  try {
    const response = await fetch(config.hostUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`Shady Insert sent successfully to ${config.hostUrl}`);
    } else {
      alert(`Server responded with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Shady Insert Error:", error);
    alert(`Could not connect to host at ${config.hostUrl}.`);
  }
}

function handleIncomingSubmission(submission: CPSubmission) {
  const selectElement = document.querySelector("select[name='programTypeId']") as HTMLSelectElement;
  const fileInputElement = document.querySelector("input[name='sourceFile']") as HTMLInputElement;
  const submitButton = document.getElementById("sidebarSubmitButton") as HTMLInputElement;

  if (!selectElement || !fileInputElement || !submitButton) {
    console.warn("Submission form items missing on this view.");
    return;
  }

  const targetCompiler = submission.programTypeId || inferProgramTypeId(submission.filename);

  if (!targetCompiler) {
    alert(`${submission.language} not supported`)
    return;
  }

  selectElement.value = targetCompiler;
  selectElement.dispatchEvent(new Event("change", { bubbles: true }));

  const codeBlob = new Blob([submission.sourceCode], { type: "text/plain" });
  const mockFile = new File([codeBlob], submission.filename, { type: "text/plain" });

  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(mockFile);
  fileInputElement.files = dataTransfer.files;
  fileInputElement.dispatchEvent(new Event("change", { bubbles: true }));

  console.log(`Real-time execution triggered for compiler: ${targetCompiler}`);
  submitButton.click();
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
      btn.disabled = true;
      btn.textContent = "Sendign...";
      
      try {
        updateConfigAndRun(async () => {
          const metadata = parser.getMetadata();
          const testCases = parser.getTestCases();

          if (testCases.length === 0) {
            alert("No testcases found to parse.");
            return;
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
      } finally {
        btn.disabled = false;
        btn.textContent = "Shady Insert";
      }
    });

    block.insertBefore(btn, block.firstChild);
  });
}

// Kick off initialization sequence
updateConfigAndRun(injectShadyButtons);

// Listen for immediate real-time socket relays from background.ts
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHADY_SUBMIT") {
    handleIncomingSubmission(message.data);
  }
});

