import { useState, useEffect } from "react";

export default function CalendarWidget() {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const dayNum = date.getDate();
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <span
        className="absolute top-0 right-0 font-ndot text-nothing-red tracking-wider select-none"
        style={{ fontSize: "calc(var(--widget-size) * 0.07)" }}
      >
        {dayName}
      </span>
      <span
        className="font-ntype text-white tracking-wider select-none leading-none translate-y-2"
        style={{ fontSize: "calc(var(--widget-size) * 0.39)" }}
      >
        {dayNum}
      </span>
    </div>
  );
}
