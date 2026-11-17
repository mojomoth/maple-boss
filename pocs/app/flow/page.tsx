import "../home.css";
import "./flow.css";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "@/public/maple-boss-logo.png";
import Canvas, { Badge, KindIcon } from "./Canvas";
import StepPanel, { type StepDetail } from "./StepPanel";
import { BLOCKER_LABEL, KIND_LABEL, STATUS_LABEL, flowHash, parseFlow, readStamp, type Flow, type Kind, type Status } from "./flow.mjs";

export const metadata: Metadata = {
  title: "개발 진행",
  description: "Maple Boss v1을 만드는 게이트별 진행 상황이에요.",
};

// Built once from docs/dev-v1/flow.json; a missing or invalid file fails the build.
export const dynamic = "force-static";

const DOCS = path.join(process.cwd(), "..", "docs", "dev-v1");
const REPO = "https://github.com/mojomoth/maple-boss";
const when = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });

function load() {
  const file = path.join(DOCS, "flow.json");
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch (e) {
    throw new Error(`/flow: ${file}을 읽지 못했어요 (${(e as NodeJS.ErrnoException).code ?? e}). docs/dev-v1/flow.json이 있어야 빌드할 수 있어요.`);
  }
  let flow: Flow;
  try {
    flow = parseFlow(raw);
  } catch (e) {
    throw new Error(`/flow: ${file}\n${(e as Error).message}`);
  }
  let status = "";
  try {
    status = readFileSync(path.join(DOCS, "STATUS.md"), "utf8");
  } catch {} // no STATUS.md reads as "never synced"
  return { flow, stamp: readStamp(status), hash: flowHash(flow) };
}

const github = (p: string) => `${REPO}/${p.endsWith("/") ? "tree" : "blob"}/dev-v1/${p.split("/").map(encodeURIComponent).join("/")}`;

// The stamp's date comes from STATUS.md and may have been edited by hand: show it as is if it does not parse.
function Time({ iso }: { iso: string }) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? <span>{iso}</span> : <time dateTime={iso}>{when.format(d)}</time>;
}

export default function FlowPage() {
  const { flow, stamp, hash } = load();
  const current = flow.gates.find((g) => g.status !== "pass");
  const details: Record<string, StepDetail> = Object.fromEntries(
    flow.gates.flatMap((g) =>
      g.steps.map((s) => [
        s.id,
        {
          gate: `${g.id} ${g.title}`,
          kind: KIND_LABEL[s.kind],
          title: s.title,
          status: s.status,
          statusLabel: STATUS_LABEL[s.status],
          agent: s.agent,
          note: s.note,
          evidence: s.evidence.map((p) => ({ path: p, href: github(p) })),
        },
      ]),
    ),
  );

  return (
    <div className="home">
      <header className="topbar">
        <div className="shell flow-top">
          <h1 className="logo">
            <Link href="/" aria-label="Maple Boss 메인 화면">
              <Image src={logo} alt="Maple Boss" width={272} height={77} priority unoptimized />
            </Link>
          </h1>
          <Link className="btn btn--quiet" href="/">
            메인 화면으로
          </Link>
        </div>
      </header>

      <main className="shell main">
        <section aria-labelledby="flow-title">
          <div className="section-head">
            <h2 id="flow-title">개발 진행</h2>
            <span className="badge">{current ? `${current.id} ${current.title} ${STATUS_LABEL[current.status]}` : "모든 게이트 통과"}</span>
            <p className="section-help section-help--end">
              <Time iso={flow.updatedAt} /> 기준
            </p>
          </div>
          <p className="section-help">
            게이트마다 계획, 구현, 검증 순서로 진행하고, 검증에서 실패하면 수정한 뒤 다시 검증해요. 단계를 누르면 담당, 메모, 근거 파일이
            나와요.
          </p>

          <div className="flow-meta">
            <p className="flow-sync">
              <strong>문서 반영</strong>
              {stamp?.hash === hash ? (
                <>
                  <span className="flow-badge flow-badge--pass">반영됨</span>
                  <span>STATUS.md가 이 흐름과 같아요.</span>
                </>
              ) : (
                <>
                  <span className="flow-badge flow-badge--fail">반영 안 됨</span>
                  <span>
                    {stamp ? (
                      <>
                        STATUS.md는 <Time iso={stamp.updatedAt} /> 흐름 기준이에요.
                      </>
                    ) : (
                      "STATUS.md에 동기화 기록이 없어요."
                    )}{" "}
                    <code>npm run flow:sync</code>로 맞춰 주세요.
                  </span>
                </>
              )}
            </p>
            <Legend />
          </div>

          <StepPanel steps={details}>
            <Canvas flow={flow} />
          </StepPanel>
        </section>

        <section aria-labelledby="blockers-title">
          <div className="section-head">
            <h2 id="blockers-title">막힌 일</h2>
            <span className="count num">{flow.blockers.filter((b) => b.status === "open").length}</span>
          </div>
          {flow.blockers.length ? (
            <ul className="flow-blockers">
              {flow.blockers.map((b) => (
                <li key={b.id}>
                  <strong className="num">{b.id}</strong>
                  <span>{b.title}</span>
                  <span className={`flow-badge flow-badge--${b.status === "open" ? "blocked" : "pass"}`}>{BLOCKER_LABEL[b.status]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="section-help">막힌 일이 없어요.</p>
          )}
        </section>
      </main>

      <footer>
        <div className="shell foot-row">
          <strong>Maple Boss</strong>
          <nav aria-label="다른 화면" className="foot-nav">
            <Link href="/">메인 화면</Link>
            <Link href="/pocs/character">캐릭터 등록</Link>
            <Link href="/pocs/boss">보스 조회</Link>
            <Link href="/pocs/party">파티 편성</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

const WIRES = [
  ["done", "지난 흐름"],
  ["todo", "남은 흐름"],
  ["fail", "실패해서 수정으로"],
  ["loop", "수정 후 다시 검증"],
] as const;

function Legend() {
  return (
    <div className="flow-legend">
      <h3 className="visually-hidden">범례</h3>
      <ul aria-label="단계 종류">
        {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
          <li key={k}>
            <KindIcon kind={k} />
            {KIND_LABEL[k]}
          </li>
        ))}
      </ul>
      <ul aria-label="상태">
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <li key={s}>
            <Badge status={s} />
          </li>
        ))}
      </ul>
      <ul aria-label="연결선">
        {WIRES.map(([tone, label]) => (
          <li key={tone}>
            <svg width={28} height={10} viewBox="0 0 28 10" aria-hidden="true" focusable="false">
              <path className={`flow-wire flow-wire--${tone}`} d="M1 5H27" />
            </svg>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
