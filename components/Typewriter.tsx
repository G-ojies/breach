"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Types out `text` character-by-character. Re-runs whenever `text` changes.
 * Calls onDone when the full string is rendered.
 */
export default function Typewriter({
  text,
  speed = 12,
  className = "",
  onDone,
}: {
  text: string;
  speed?: number;
  className?: string;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState("");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        doneRef.current?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return <span className={`type-line ${className}`}>{shown}</span>;
}
