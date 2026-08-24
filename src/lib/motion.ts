// docs/widgets/README.md: dropped widgets glide into their snapped cell.
// Shared by DraggableWidget (declarative, while idle) and useDragSnap
// (imperative settle at drop time) so both always agree on the curve.
export const SETTLE_TRANSITION =
  "left 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)";
