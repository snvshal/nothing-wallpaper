interface WidgetTogglesProps {
  widgets: Record<string, boolean>;
  onToggle: (widgets: Record<string, boolean>) => void;
}

const WIDGET_LABELS: Record<string, string> = {
  clock: "Clock",
  calendar: "Calendar",
  weather: "Weather",
  ram: "RAM",
  wifi: "Wi-Fi",
  bluetooth: "Bluetooth",
  volume: "Audio Mute",
  music: "Music",
  screentime: "Screen Time",
  countdown: "Sand Timer",
};

export default function WidgetToggles({ widgets, onToggle }: WidgetTogglesProps) {
  const toggle = (id: string) => {
    onToggle({ ...widgets, [id]: !widgets[id] });
  };

  return (
    <div className="settings-section">
      <div className="settings-section-title">Widgets</div>
      <div className="widget-list">
        {Object.keys(WIDGET_LABELS).map((id) => (
          <div key={id} className="widget-row">
            <span className="widget-label" id={`widget-label-${id}`}>
              {WIDGET_LABELS[id]}
            </span>
            <label className="toggle">
              <input
                id={`widget-toggle-${id}`}
                name={`widget-toggle-${id}`}
                type="checkbox"
                checked={widgets[id] ?? true}
                onChange={() => toggle(id)}
                aria-labelledby={`widget-label-${id}`}
              />
              <span className="toggle-track" />
              <span className="toggle-thumb" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
