"use client";

// n8n's node details view: a click (or Enter/Space, the nodes are buttons) on any [data-step] node in the board
// opens a modal side panel with the step's note, agent and evidence. Esc, the close button or the backdrop
// closes it and focus goes back to the node.
import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "../ui";

export type StepDetail = {
  gate: string;
  kind: string;
  title: string;
  status: string;
  statusLabel: string;
  agent: string;
  note: string;
  evidence: { path: string; href: string }[];
};

export default function StepPanel({ steps, children }: { steps: Record<string, StepDetail>; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [id, setId] = useState<string | null>(null);
  const step = id ? steps[id] : undefined;

  // Opens after the step has rendered, so the dialog moves focus into its content (the close button).
  useEffect(() => {
    if (step && !dialog.current?.open) dialog.current?.showModal();
  }, [step]);

  function open(e: React.MouseEvent) {
    const node = (e.target as Element).closest<HTMLElement>("[data-step]");
    if (!node?.dataset.step || !steps[node.dataset.step]) return;
    opener.current = node;
    setId(node.dataset.step);
  }

  return (
    <>
      <div className="flow-canvas" onClick={open}>
        {children}
      </div>
      <dialog
        ref={dialog}
        className="flow-panel"
        aria-labelledby="flow-panel-title"
        onClose={(e) => {
          // "close" is dispatched as a task: after a quick Esc then Enter on another node it can land once the
          // panel is open again, and must not empty it.
          if (e.currentTarget.open) return;
          setId(null);
          opener.current?.focus();
        }}
        // The body fills the dialog, so a click that lands on the dialog itself is on the backdrop.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        {step && (
          <div className="flow-panel-body">
            <div className="flow-panel-head">
              <p>
                {step.gate} · {step.kind}
              </p>
              <form method="dialog">
                <button className="icon-btn" aria-label="닫기">
                  <CloseIcon />
                </button>
              </form>
            </div>
            <h2 id="flow-panel-title">{step.title}</h2>
            <span className={`flow-badge flow-badge--${step.status}`}>{step.statusLabel}</span>
            <dl className="flow-panel-facts">
              <div>
                <dt>담당</dt>
                <dd>{step.agent || "미정"}</dd>
              </div>
              <div>
                <dt>메모</dt>
                <dd>{step.note || "아직 메모가 없어요."}</dd>
              </div>
              <div>
                <dt>근거</dt>
                <dd>
                  {step.evidence.length ? (
                    <ul>
                      {step.evidence.map((ev) => (
                        <li key={ev.path}>
                          <a href={ev.href}>{ev.path}</a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "아직 근거 파일이 없어요."
                  )}
                </dd>
              </div>
            </dl>
            <p className="flow-panel-help">근거 링크는 GitHub의 dev-v1 브랜치로 열려요.</p>
          </div>
        )}
      </dialog>
    </>
  );
}
