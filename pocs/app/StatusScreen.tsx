import "./home.css";
import Image from "next/image";
import Link from "next/link";
import logo from "@/public/maple-boss-logo.png";

// A screen that only reports one thing (404, a page that failed to render), in the /import screen's frame: the
// main top bar, a titled section and an .empty box ending in the way back.
export default function StatusScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="home">
      <header className="topbar">
        <div className="shell topbar-row">
          <div className="logo">
            <Link href="/" aria-label="Maple Boss 메인 화면">
              <Image src={logo} alt="Maple Boss" width={272} height={77} priority unoptimized />
            </Link>
          </div>
        </div>
      </header>
      <main className="shell main">
        <section aria-labelledby="status-title">
          <div className="section-head">
            <h1 id="status-title">{title}</h1>
          </div>
          <div className="empty">{children}</div>
        </section>
      </main>
    </div>
  );
}
