import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { path: "/create", label: "Create", icon: "M12 4v16m8-8H4" },
  { path: "/history", label: "History", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-celo-green text-white px-4 py-3 flex items-center justify-between shadow-sm">
        <Link to="/" className="text-lg font-bold tracking-tight">
          Natillera
        </Link>
        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">On-Chain</span>
      </header>

      <main className="flex-1 pb-28 overflow-y-auto">{children}</main>

      <div className="fixed bottom-14 left-0 right-0 flex justify-center py-1.5 pointer-events-none safe-area-bottom">
        <a
          href="https://human.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto inline-flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-purple-600 transition bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-gray-100 shadow-sm"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Powered by Human.Tech
        </a>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 px-4 safe-area-bottom">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 text-xs ${active ? "text-celo-green" : "text-gray-400"}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
