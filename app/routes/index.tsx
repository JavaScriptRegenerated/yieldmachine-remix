import { useRef, useEffect, useState } from "react";
import { listenTo, on, entry, start, accumulate, exit } from "yieldmachine";

function DraggableMachine(el: HTMLElement) {
  let dragOrigin: null | { x: number; y: number } = null;
  let origPos: null | { left: number; top: number } = null;

  function* Up() {
    yield entry(({ signal }) => {
      el.addEventListener("pointerdown", (event) => {
        (event.target as any).setPointerCapture(event.pointerId);
        dragOrigin = { x: event.clientX, y: event.clientY };
        const { left, top } = el.getBoundingClientRect();
        origPos = { left, top };
      }, { signal });
    });
    yield listenTo(el, ["pointerdown"]);
    yield on("pointerdown", Down);

  }
  function* Down() {
    yield listenTo(el, ["pointermove", "pointerup"]);
    yield on("pointermove", Dragging);
    yield on("pointerup", Clicked);
  }
  function* Dragging() {
    yield entry(({ signal }) => {
      el.addEventListener("pointermove", (event) => {
        if (dragOrigin == null || origPos == null) return;

        const deltaX = event.clientX - dragOrigin.x;
        const deltaY = event.clientY - dragOrigin.y;
        el.style.left = `${origPos.left + deltaX}px`;
        el.style.top = `${origPos.top + deltaY}px`;
      }, { signal });

      window.addEventListener('keydown', (event) => {
        if (event.key === "Escape" && origPos !== null) {
          dragOrigin = null;
          el.style.left = `${origPos.left}px`;
          el.style.top = `${origPos.top}px`;
          el.dispatchEvent(new Event('CANCEL'));
        }
      }, { signal });
    });
    yield listenTo(el, ["pointerup", "CANCEL"]);
    yield on("pointerup", Dropped);
    yield on("CANCEL", Cancelled);
  }
  function* Clicked() {
    yield* Up();
  }
  function* Dropped() {
    yield* Up();
  }
  function* Cancelled() {
    yield* Up();
  }

  return Up;
}

export default function Index() {
  const [currentState, updateState] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current == null) return;

    const aborter = new AbortController();
    const signal = aborter.signal;
    const machine = start(DraggableMachine.bind(null, ref.current), { signal });

    updateState(machine.value.state as string);
    machine.eventTarget.addEventListener('StateChanged', (event) => {
      updateState((event as unknown as { value: string }).value);
    }, { signal });

    return () => {
      aborter.abort();
    }
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4", padding: '2rem' }}>
      <div>{currentState}</div>
      <div style={{ marginTop: '2rem'}}>
        <div ref={ref} style={{ position: "absolute", width: 40, height: 40, background: "red" }}></div>
      </div>
    </div>
  );
}
