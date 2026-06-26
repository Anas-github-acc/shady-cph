document.addEventListener("DOMContentLoaded", () => {
  const hostInput = document.getElementById("hostUrl") as HTMLInputElement;
  const consoleCheckbox = document.getElementById("consoleOnly") as HTMLInputElement;
  const saveButton = document.getElementById("saveBtn") as HTMLButtonElement;

  chrome.storage.local.get(["hostUrl", "consoleOnly"], (settings) => {
    if (settings.hostUrl) hostInput.value = settings.hostUrl;
    if (settings.consoleOnly !== undefined) consoleCheckbox.checked = settings.consoleOnly;
  });

  saveButton.addEventListener("click", () => {
    chrome.storage.local.set(
      {
        hostUrl: hostInput.value.trim(),
        consoleOnly: consoleCheckbox.checked,
      },
      () => {
        saveButton.innerText = "Saved! 🎉";
        setTimeout(() => { saveButton.innerText = "Save Settings"; }, 1500);
      }
    );
  });
});

