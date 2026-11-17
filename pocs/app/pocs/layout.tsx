import "../home.css";
import "./pocs.css";
import Image from "next/image";
import Link from "next/link";
import logo from "@/public/maple-boss-logo.png";
import PocsNav from "./PocsNav";

// The PoC screens' frame: the main screen's top bar, with the screens as links and the way back to /.
export default function PocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="home">
      <header className="topbar">
        <div className="shell pocs-top">
          <div className="logo">
            <Link href="/" aria-label="Maple Boss 메인 화면">
              <Image src={logo} alt="Maple Boss" width={272} height={77} priority unoptimized />
            </Link>
          </div>
          <PocsNav />
        </div>
      </header>
      {children}
    </div>
  );
}
