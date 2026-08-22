import { useState, useEffect } from "react";

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours() % 12;

  const secondAngle = seconds * 6;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = hours * 30 + minutes * 0.5;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full h-full rounded-full bg-nothing-black flex items-center justify-center overflow-hidden">
        <div
          className="absolute pointer-events-none rounded-full bg-nothing-white z-10"
          style={{
            width: "12%",
            height: "30%",
            left: "calc(50% - 6%)",
            top: "calc(50% - 24%)",
            transformOrigin: "50% 80%",
            transform: `rotate(${hourAngle}deg)`,
          }}
        />
        <div
          className="absolute pointer-events-none rounded-full bg-nothing-dgrey z-20"
          style={{
            width: "3%",
            height: "36%",
            left: "calc(50% - 1.5%)",
            top: "calc(50% - 36%)",
            transformOrigin: "50% 100%",
            transform: `rotate(${minuteAngle}deg)`,
          }}
        />
        <div
          className="absolute inset-0 flex items-start justify-center pointer-events-none z-30"
          style={{
            transform: `rotate(${secondAngle}deg)`,
          }}
        >
          <div
            className="bg-nothing-widget-red rounded-full"
            style={{
              width: "calc(var(--widget-size) * 0.03)",
              height: "calc(var(--widget-size) * 0.03)",
              marginTop: "4%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
