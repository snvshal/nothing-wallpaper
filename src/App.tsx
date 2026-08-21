import { useDragSnap } from "./hooks/useDragSnap";
import DraggableWidget from "./components/DraggableWidget";
import ClockWidget from "./components/ClockWidget";
import CalendarWidget from "./components/CalendarWidget";
import WeatherWidget from "./components/WeatherWidget";
import RamWidget from "./components/RamWidget";
import "./styles/global.css";

const INITIAL_POSITIONS = {
  clock: { x: 96, y: 96 },
  calendar: { x: 256, y: 96 },
  weather: { x: 96, y: 256 },
  ram: { x: 256, y: 256 },
};

const WIDGET_SIZE = 144;

const WIDGET_RADIUS: Record<string, string> = {
  clock: "50%",
};

export default function App() {
  const { positions, draggingId, fluidPos, dropTarget, containerRef, handleMouseDown } =
    useDragSnap({ initialPositions: INITIAL_POSITIONS, widgetSize: WIDGET_SIZE });

  const widgetContent: Record<string, React.ReactNode> = {
    clock: <ClockWidget />,
    calendar: <CalendarWidget />,
    weather: <WeatherWidget />,
    ram: <RamWidget />,
  };

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden text-white select-none"
      style={{
        background: `url("/background.jpg") center / cover no-repeat`,
      }}
    >
      {draggingId && (
        <div
          style={{
            position: "absolute",
            left: `${dropTarget.x}px`,
            top: `${dropTarget.y}px`,
            width: `${WIDGET_SIZE}px`,
            height: `${WIDGET_SIZE}px`,
            borderRadius: WIDGET_RADIUS[draggingId] ?? "var(--radius-widget)",
          }}
          className="border-2 border-dashed border-nothing-red/60 z-0 flex items-center justify-center pointer-events-none"
        />
      )}

      {Object.keys(INITIAL_POSITIONS).map((id) => {
        const isDragging = draggingId === id;
        const pos = isDragging ? fluidPos : positions[id];

        return (
          <DraggableWidget
            key={id}
            x={pos.x}
            y={pos.y}
            isDragging={isDragging}
            onMouseDown={(e) => handleMouseDown(id, e)}
            radius={WIDGET_RADIUS[id]}
            noPadding={id === "clock"}
          >
            {widgetContent[id]}
          </DraggableWidget>
        );
      })}
    </div>
  );
}
