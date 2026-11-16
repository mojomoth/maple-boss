"use client"; // error boundaries are client components

import Link from "next/link";
import StatusScreen from "./StatusScreen";

// A page that threw while rendering, e.g. / or /pocs/party with the database down, in place of Next's bare 500.
// The server already logged the cause; production sends the browser only a digest, so nothing is shown from it.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <StatusScreen title="화면을 불러오지 못했어요">
      <p className="empty-title is-error">저장소에 연결하지 못했거나 서버에서 오류가 났어요.</p>
      <p>잠시 뒤 다시 시도해 주세요.</p>
      <div className="empty-actions">
        <button type="button" className="btn btn--primary" onClick={() => retry()}>
          다시 시도
        </button>
        <Link className="btn btn--quiet" href="/">
          메인 화면으로
        </Link>
      </div>
    </StatusScreen>
  );
}
