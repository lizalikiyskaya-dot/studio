"use client";

import { useEffect } from "react";
import { pingPresence } from "./actions";

export default function PresencePing() {
  useEffect(() => {
    pingPresence();
    const id = setInterval(() => pingPresence(), 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
