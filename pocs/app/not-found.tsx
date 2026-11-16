import type { Metadata } from "next";
import Link from "next/link";
import StatusScreen from "./StatusScreen";

export const metadata: Metadata = { title: "없는 페이지" };

// Every URL no route matches (e.g. /pocs, which has no page of its own), in place of Next's English 404.
export default function NotFound() {
  return (
    <StatusScreen title="없는 페이지예요">
      <p className="empty-title">주소를 다시 확인해 주세요.</p>
      <Link className="btn btn--quiet" href="/">
        메인 화면으로
      </Link>
    </StatusScreen>
  );
}
