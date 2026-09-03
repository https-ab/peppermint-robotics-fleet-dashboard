import { useEffect, useRef, useState } from "react";

export function useFleet() {
  const [robots, setRobots] = useState([]);
  const [connected, setConnected] = useState(false);

  const mapRef = useRef(new Map());

  useEffect(() => {
    let ws;
    let stopped = false;
    let retryIn = 1000;
    let retryTimer;

    function applySnapshot(list) {
      const m = new Map();
      for (const r of list) m.set(r.robot_id, r);
      mapRef.current = m;
      setRobots([...m.values()]);
    }

    function applyUpdates(list) {
      for (const r of list) {
        mapRef.current.set(r.robot_id, r);
      }
      setRobots([...mapRef.current.values()]);
    }

    function connect() {
      if (stopped) return;

      const backendUrl = import.meta.env.VITE_API_URL;

      if (!backendUrl) {
        console.error("VITE_API_URL is not configured");
        setConnected(false);
        return;
      }

      const wsUrl =
        backendUrl.replace(/^http/, "ws") + "/ws/robots";

      console.log("[fleet] connecting to:", wsUrl);

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[fleet] WebSocket connected");
        retryIn = 1000;
        setConnected(true);
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);

          if (msg.type === "snapshot") {
            applySnapshot(msg.robots);
          } else if (msg.type === "update") {
            applyUpdates(msg.robots);
          }
        } catch (err) {
          console.error("[fleet] invalid WebSocket message", err);
        }
      };

      ws.onerror = (err) => {
        console.error("[fleet] WebSocket error", err);
        ws.close();
      };

      ws.onclose = () => {
        setConnected(false);

        if (stopped) return;

        console.log(`[fleet] reconnecting in ${retryIn}ms...`);

        retryTimer = setTimeout(connect, retryIn);
        retryIn = Math.min(retryIn * 2, 10000);
      };
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);

      if (ws) {
        ws.close();
      }
    };
  }, []);

  return { robots, connected };
}
