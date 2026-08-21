export default function WeatherWidget() {
  return (
    <>
      <div className="flex justify-end items-start">
        <span
          className="font-ndot text-white select-none"
          style={{ fontSize: "calc(var(--widget-size) * 0.1)" }}
        >
          28&deg;
        </span>
      </div>
      <div className="my-auto flex items-center justify-center">
        <span
          className="font-emoji select-none leading-none"
          style={{ fontSize: "calc(var(--widget-size) * 0.39)" }}
        >
          {"\u2601"}
        </span>
      </div>
      <div
        className="font-ntype text-nothing-ngrey tracking-wider select-none"
        style={{ fontSize: "calc(var(--widget-size) * 0.07)" }}
      >
        Villupuram
      </div>
    </>
  );
}
