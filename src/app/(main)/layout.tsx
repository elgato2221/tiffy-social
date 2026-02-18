import Navbar from "@/components/Navbar";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import DailyRewardModal from "@/components/DailyRewardModal";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <div className="flex">
        {/* Left sidebar - desktop only */}
        <LeftSidebar />

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>

        {/* Right sidebar - xl desktop only */}
        <RightSidebar />
      </div>

      {/* Bottom navbar - mobile only */}
      <div className="lg:hidden">
        <Navbar />
      </div>

      {/* Daily Reward Modal */}
      <DailyRewardModal />
    </div>
  );
}
