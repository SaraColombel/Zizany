"use client";

import * as React from "react";
import { io } from "socket.io-client";

export function PresenceBridge() {
  React.useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000", {
      withCredentials: true,
      transports: ["websocket"],
    });

    function notify(event: "presence:connected" | "presence:disconnected") {
      window.dispatchEvent(new Event(event));
    }

    socket.on("connect", () => notify("presence:connected"));
    socket.on("disconnect", () => notify("presence:disconnected"));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.disconnect();
    };
  }, []);

  return null;
}
