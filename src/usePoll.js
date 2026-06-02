import { useEffect, useRef, useState } from "react";

// Live room poll over a WebSocket. Every connected client sees the same tally
// in real time; casting a vote broadcasts the new counts to the whole room.
export function usePoll() {
  const [tally, setTally] = useState({ flash: 0, plastic: 0 });
  const [voters, setVoters] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/ws`;
    let closed = false;
    let retry;

    function connect() {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "poll") {
            setTally(msg.tally);
            setVoters(msg.voters);
          }
        } catch (e) {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      wsRef.current?.close();
    };
  }, []);

  function vote(choice) {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "vote", choice }));
    }
  }

  return { tally, voters, connected, vote };
}
