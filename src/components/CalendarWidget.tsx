import { useState, useEffect } from "react";

export default function CalendarWidget() {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const dayNum = String(date.getDate()).padStart(2, "0");
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <span className="absolute top-0 right-0 font-dot text-widget-title text-nothing-widget-red tracking-wider select-none">
        {dayName}
      </span>
      <span
        className="font-body text-nothing-white tracking-wider select-none leading-none text-widget-display"
        style={{ transform: "translateY(calc(var(--widget-size) * 0.028))" }}
      >
        {dayNum}
      </span>
    </div>
  );
}
