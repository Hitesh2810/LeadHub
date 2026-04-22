import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationBellProps {
  count?: number;
}

const NotificationBell = ({ count = 0 }: NotificationBellProps) => {
  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Button>
  );
};

export default NotificationBell;
