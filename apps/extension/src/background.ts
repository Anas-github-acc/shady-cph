// apps/extension/src/background.ts
let socket: WebSocket | null = null;

function connectWebSocket() {
  chrome.storage.local.get(["hostUrl", "consoleOnly"], (settings) => {
    if (settings.consoleOnly) return;
    
    const httpUrl = settings.hostUrl || "http://localhost:42585";
    // Convert e.g., http://localhost:42585 into ws://localhost:42585/stream
    const wsUrl = `${httpUrl.replace(/^http/, "ws")}/stream`;

    socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "SHADY_SUBMIT") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, message);
          }
        });
      }
    };

    socket.onclose = () => { setTimeout(connectWebSocket, 5000); };
    socket.onerror = () => { socket?.close(); };
  });
}

connectWebSocket();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.hostUrl || changes.consoleOnly) {
    socket?.close();
    connectWebSocket();
  }
});
