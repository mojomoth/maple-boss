// The n8n-style board: one lane per gate, step nodes left to right, bezier wires between them, a wire from each
// gate's last step to the next gate's first, and each fail -> fix -> recheck loop drawn as an arc back to the check
// it repeats. Server-rendered at build time; fixed geometry, so nothing moves once the page has painted.
import type { CSSProperties } from "react";
import { KIND_LABEL, STATUS_LABEL, type Flow, type Kind, type Status, type Step } from "./flow.mjs";

const NODE_W = 192;
const NODE_H = 120;
const GAP = 52; // between nodes, where a wire runs
const PAD = 24; // board edge to lanes
const LANE_X = 40; // lane edge to its first node; the gate-to-gate wire turns down in this margin
const HEAD = 56; // lane title row
const LOOP = 56; // under the nodes, for the recheck arc
const FOOT = 20;
const LANE_GAP = 40; // the gate-to-gate wire crosses here
const ARC = 48; // control-point depth of the recheck arc: it bottoms out at 0.75 * ARC
const R = 16; // corner radius of the gate-to-gate wire

const ICON: Record<Kind, string> = {
  plan: "M9 4h6v3H9zM8 5.5H6v15h12v-15h-2M9 12h6M9 16h4",
  build: "M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12",
  critic: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  fix: "M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4",
  recheck: "M20 12a8 8 0 0 1-14.3 4.9M4 12a8 8 0 0 1 14.3-4.9M18.5 3v4.2h-4.2M5.5 21v-4.2h4.2",
  pass: "M5 21V4M5 4.5h12l-2.5 4 2.5 4H5",
};

export function KindIcon({ kind }: { kind: Kind }) {
  return (
    <span className="flow-kind-icon" aria-hidden="true">
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path d={ICON[kind]} />
      </svg>
    </span>
  );
}

export function Badge({ status }: { status: Status }) {
  return <span className={`flow-badge flow-badge--${status}`}>{STATUS_LABEL[status]}</span>;
}

type Tone = "done" | "todo" | "fail" | "loop";
type Wire = { d: string; tone: Tone; pending?: boolean };
type Label = { x: number; y: number; text: string; tone: "fail" | "loop" };

const tone = (s: Step): Tone => (s.status === "fail" ? "fail" : s.status === "pass" ? "done" : "todo");
const nodeX = (j: number) => PAD + LANE_X + j * (NODE_W + GAP);

function layout(flow: Flow) {
  const most = Math.max(...flow.gates.map((g) => g.steps.length));
  const laneW = LANE_X * 2 + most * NODE_W + (most - 1) * GAP;
  let y = PAD;
  const lanes = flow.gates.map((gate) => {
    // A recheck repeats the nearest check before it: the critic, or the previous recheck in a second round.
    const loops = gate.steps.flatMap((s, r) => {
      if (s.kind !== "recheck") return [];
      const c = gate.steps.slice(0, r).findLastIndex((p) => p.kind === "critic" || p.kind === "recheck");
      return c < 0 ? [] : [{ from: r, to: c }];
    });
    const lane = { gate, y, h: HEAD + NODE_H + (loops.length ? LOOP : 0) + FOOT, loops };
    y += lane.h + LANE_GAP;
    return lane;
  });
  return { width: laneW + 2 * PAD, height: y - LANE_GAP + PAD, laneW, lanes };
}

export default function Canvas({ flow }: { flow: Flow }) {
  const { width, height, laneW, lanes } = layout(flow);
  const wires: Wire[] = [];
  const labels: Label[] = [];

  lanes.forEach(({ gate, y, h, loops }, i) => {
    const mid = y + HEAD + NODE_H / 2;
    const bottom = y + HEAD + NODE_H;
    gate.steps.slice(1).forEach((_, j) => {
      const [x1, x2] = [nodeX(j) + NODE_W, nodeX(j + 1)];
      const from = gate.steps[j];
      wires.push({ d: `M${x1} ${mid}C${x1 + GAP / 2} ${mid} ${x2 - GAP / 2} ${mid} ${x2} ${mid}`, tone: tone(from) });
      if (from.status === "fail") labels.push({ x: (x1 + x2) / 2, y: mid - 16, text: "실패", tone: "fail" });
    });
    for (const { from, to } of loops) {
      const [xr, xc] = [nodeX(from) + NODE_W / 2, nodeX(to) + NODE_W / 2];
      const pending = !["pass", "fail"].includes(gate.steps[from].status);
      wires.push({ d: `M${xr} ${bottom}C${xr} ${bottom + ARC} ${xc} ${bottom + ARC} ${xc} ${bottom}`, tone: "loop", pending });
      labels.push({ x: (xr + xc) / 2, y: bottom + ARC * 0.75, text: "수정 후 다시 검증", tone: "loop" });
    }
    // Last step of this gate -> first step of the next: right, down into the gap between lanes, left, down, right.
    const next = lanes[i + 1];
    if (!next) return;
    const last = gate.steps.at(-1)!;
    const [sx, rx, lx, ex] = [nodeX(gate.steps.length - 1) + NODE_W, nodeX(gate.steps.length - 1) + NODE_W + 26, PAD + LANE_X / 2, PAD + LANE_X];
    const gy = y + h + LANE_GAP / 2;
    const ey = next.y + HEAD + NODE_H / 2;
    wires.push({
      d:
        `M${sx} ${mid}H${rx - R}Q${rx} ${mid} ${rx} ${mid + R}V${gy - R}Q${rx} ${gy} ${rx - R} ${gy}` +
        `H${lx + R}Q${lx} ${gy} ${lx} ${gy + R}V${ey - R}Q${lx} ${ey} ${lx + R} ${ey}H${ex}`,
      tone: tone(last),
    });
  });

  const vars = { width, height, "--pad": `${PAD}px`, "--lane-x": `${LANE_X}px`, "--head": `${HEAD}px`, "--node-w": `${NODE_W}px`, "--node-h": `${NODE_H}px` } as CSSProperties;
  return (
    <div className="flow-board" style={vars}>
      <ol className="flow-lanes">
        {lanes.map(({ gate, y, h }) => (
          <li key={gate.id} className={`flow-lane flow-lane--${gate.status}`} style={{ top: y, height: h, width: laneW }}>
            <div className="flow-lane-head">
              <h3>
                {gate.id} <span>{gate.title}</span>
              </h3>
              <Badge status={gate.status} />
            </div>
            <ol className="flow-nodes">
              {gate.steps.map((s, j) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`flow-node flow-node--${s.status}`}
                    data-step={s.id}
                    aria-haspopup="dialog"
                    style={{ left: LANE_X + j * (NODE_W + GAP), top: HEAD }}
                  >
                    <span className="flow-node-head">
                      <span className="flow-kind">
                        <KindIcon kind={s.kind} />
                        {KIND_LABEL[s.kind]}
                      </span>
                      <Badge status={s.status} />
                    </span>
                    <span className="flow-node-title">{s.title}</span>
                    <span className="flow-node-agent">{s.agent || "담당 미정"}</span>
                  </button>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
      <svg className="flow-wires" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
        <defs>
          {(["done", "todo", "fail", "loop"] as const).map((t) => (
            <marker key={t} id={`flow-arrow-${t}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto">
              <path className={`flow-arrow--${t}`} d="M0 0L10 5L0 10z" />
            </marker>
          ))}
        </defs>
        {wires.map((w, k) => (
          <path key={k} className={`flow-wire flow-wire--${w.tone}${w.pending ? " is-pending" : ""}`} d={w.d} markerEnd={`url(#flow-arrow-${w.tone})`} />
        ))}
      </svg>
      {labels.map((l, k) => (
        <span key={k} className={`flow-wire-label flow-wire-label--${l.tone}`} style={{ left: l.x, top: l.y }} aria-hidden="true">
          {l.text}
        </span>
      ))}
    </div>
  );
}
