import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserDropdownProps {
  nickname: string;
  onSettingsClick: () => void;
  onEndSession: () => void;
}

const UserDropdown = ({ nickname, onSettingsClick, onEndSession }: UserDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800/60 backdrop-blur-sm rounded-full border-2">
          <Avatar className="w-6 h-6 mr-2">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {nickname.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
            <span className="text-sm">{nickname}</span>
            <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-slate-900/95 backdrop-blur-xl border-slate-700">
        <DropdownMenuItem onClick={onSettingsClick} className="text-slate-300 hover:text-white hover:bg-slate-800/60">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEndSession} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
          <LogOut className="w-4 h-4 mr-2" />
          End Session
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;