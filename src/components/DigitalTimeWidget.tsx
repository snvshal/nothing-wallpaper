import { useEffect, useState } from "react";

export default function DigitalTimeWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours() % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const period = now.getHours() < 12 ? "AM" : "PM";
  const displayHours = String(hours).padStart(2, "0");

  return (
    <div
      className="w-full h-full flex items-center justify-center select-none overflow-hidden"
      style={{ padding: "calc(var(--unit) * 0.5)" }}
    >
      <div className="flex items-baseline" style={{ gap: "calc(var(--unit) * 0.2)" }}>
        <time
          dateTime={now.toISOString()}
          aria-label={`${displayHours}:${minutes} ${period}`}
          className="font-body text-widget-time text-theme-primary leading-none tracking-tight tabular-nums"
        >
          {displayHours}:{minutes}
        </time>
        <span
          aria-hidden="true"
          className="font-dot text-widget-period text-theme-primary leading-none tracking-widest"
        >
          {period}
        </span>
      </div>
    </div>
  );
}
