import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NotificationBell from "./NotificationBell";
import { isPast, isToday } from "date-fns";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "@/hooks/use-toast";
import { fetchFollowUps } from "@/lib/api";

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header = ({ onToggleSidebar }: HeaderProps) => {
  const { user, logout } = useAuth();
  const { data: followUps = [] } = useQuery({
    queryKey: ["followups"],
    queryFn: fetchFollowUps,
  });
  const pendingFollowUps = useMemo(
    () => followUps.filter((f) => !f.completed && (isPast(new Date(f.date)) || isToday(new Date(f.date)))).length,
    [followUps]
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast({
        title: "Unable to log out",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const userInitial = user?.email?.[0]?.toUpperCase() || "A";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center gap-4">
        <div className="relative hidden w-full max-w-sm md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads, contacts..."
            className="pl-9 bg-secondary border-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell count={pendingFollowUps} />
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {userInitial}
        </div>
      </div>
    </header>
  );
};

export default Header;
