import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        {children}
      </div>
    </div>
  );
}
