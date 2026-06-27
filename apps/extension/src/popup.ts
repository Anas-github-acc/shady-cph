document.addEventListener("DOMContentLoaded", () => {
  const hostInput = document.getElementById("hostUrl") as HTMLInputElement;
  const consoleCheckbox = document.getElementById("consoleOnly") as HTMLInputElement;
  const saveButton = document.getElementById("saveBtn") as HTMLButtonElement;
  
  const statusDot = document.getElementById("statusDot") as HTMLSpanElement;
  const statusText = document.getElementById("statusText") as HTMLSpanElement;
  const statusDetails = document.getElementById("statusDetails") as HTMLDivElement;

  // Load saved settings
  chrome.storage.local.get(["hostUrl", "consoleOnly"], (settings) => {
    if (settings.hostUrl) hostInput.value = settings.hostUrl;
    if (settings.consoleOnly !== undefined) consoleCheckbox.checked = settings.consoleOnly;
    
    // Request status from background
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      if (chrome.runtime.lastError) {
        updateUI("disconnected", "Could not query daemon status.");
        return;
      }
      if (response) {
        updateUI(response.status, response.wsUrl);
      }
    });
  });

  // Listen for real-time status updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "STATUS_UPDATE") {
      updateUI(message.status, message.wsUrl);
    }
  });

  function updateUI(status: "connected" | "disconnected" | "connecting", wsUrl: string) {
    statusDot.className = `status-dot ${status}`;
    statusText.innerText = status;
    
    if (consoleCheckbox.checked) {
      statusDetails.innerText = "Disabled (Console Only)";
      statusDot.className = "status-dot disconnected";
      statusText.innerText = "inactive";
    } else if (status === "connected") {
      statusDetails.innerText = wsUrl;
    } else if (status === "connecting") {
      statusDetails.innerText = `Trying: ${wsUrl}`;
    } else {
      statusDetails.innerText = `Offline: ${wsUrl || "ws://localhost:42585/stream"}`;
    }
  }

  // Handle setting updates
  consoleCheckbox.addEventListener("change", () => {
    // If consoleOnly is checked, immediately update status indicators to inactive
    if (consoleCheckbox.checked) {
      updateUI("disconnected", "");
    } else {
      // Re-query current status
      chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
        if (response) updateUI(response.status, response.wsUrl);
      });
    }
  });

  saveButton.addEventListener("click", () => {
    chrome.storage.local.set(
      {
        hostUrl: hostInput.value.trim(),
        consoleOnly: consoleCheckbox.checked,
      },
      () => {
        saveButton.innerText = "Saved!";
        setTimeout(() => { saveButton.innerText = "Save Settings"; }, 1500);
      }
    );
  });

  // Open a long-lived port to keep the background script alive while popup is open
  try {
    chrome.runtime.connect({ name: "shady-connection" });
  } catch (e) {
    // Ignore
  }
});

