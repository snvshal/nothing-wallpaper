export default function WeatherWidget() {
  return (
    <>
      <div className="flex justify-end items-start">
        <span className="font-dot text-theme-primary select-none text-widget-title">28&deg;</span>
      </div>
      <div className="my-auto flex items-center justify-center">
        <span
          className="font-emoji text-theme-primary select-none leading-none"
          style={{ fontSize: "calc(var(--widget-size) * 0.39)" }}
        >
          {"\u2601"}
        </span>
      </div>
      <div className="font-body text-theme-secondary tracking-wider select-none text-widget-subtitle">
        Villupuram
      </div>
    </>
  );
}
