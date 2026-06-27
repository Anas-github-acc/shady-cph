// apps/extension/src/background.ts
let socket: WebSocket | null = null;
let status: "connected" | "disconnected" | "connecting" = "disconnected";
let wsUrl = "";
const activePorts = new Set<chrome.runtime.Port>();
let reconnectTimeout: any = null;
let heartbeatInterval: any = null;

function updateStatus(newStatus: "connected" | "disconnected" | "connecting") {
  status = newStatus;
  // Send status update to popup if it's open and listening
  chrome.runtime.sendMessage({ type: "STATUS_UPDATE", status, wsUrl }).catch(() => {
    // Ignore error if popup is not open/active to listen
  });
}

function disconnectWebSocket() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (socket) {
    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    try {
      socket.close();
    } catch (e) {}
    socket = null;
  }
  updateStatus("disconnected");
}

function connectWebSocket() {
  if (activePorts.size === 0) {
    disconnectWebSocket();
    return;
  }
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  chrome.storage.local.get(["hostUrl", "consoleOnly"], (settings) => {
    if (settings.consoleOnly) {
      disconnectWebSocket();
      return;
    }
    
    if (activePorts.size === 0) {
      disconnectWebSocket();
      return;
    }

    const httpUrl = settings.hostUrl || "http://localhost:42585";
    // Convert e.g., http://localhost:42585 into ws://localhost:42585/stream
    wsUrl = `${httpUrl.replace(/^http/, "ws")}/stream`;

    updateStatus("connecting");
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      updateStatus("connected");
      
      // Start heartbeat interval to keep service worker active
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "PING" }));
        }
      }, 15000);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "SHADY_SUBMIT") {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, message);
            }
          });
        }
      } catch (e) {
        console.error("Error parsing message from WebSocket:", e);
      }
    };

    socket.onclose = () => {
      disconnectWebSocket();
      if (activePorts.size > 0) {
        // Fast reconnect (1 second) when active tabs are open
        reconnectTimeout = setTimeout(connectWebSocket, 1000);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  });
}

// Track connections from content scripts or popup
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "shady-connection") {
    activePorts.add(port);
    
    // Connect WebSocket if this is the first port
    if (activePorts.size === 1) {
      connectWebSocket();
    }

    port.onDisconnect.addListener(() => {
      activePorts.delete(port);
      // Disconnect WebSocket if no more ports are active
      if (activePorts.size === 0) {
        disconnectWebSocket();
      }
    });
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.hostUrl || changes.consoleOnly) {
    disconnectWebSocket();
    if (activePorts.size > 0) {
      connectWebSocket();
    }
  }
});

// Listen for status requests from the popup when it loads
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    sendResponse({ status, wsUrl });
    return true; // Keep message channel open for asynchronous response
  }
});
