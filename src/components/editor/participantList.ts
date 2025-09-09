import { Users, Plus, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  nickname: string;
  email: string;
  color: string;
}

interface ParticipantListProps {
  users: User[];
  currentUserId: string;
  onInviteClick: () => void;
}

const ParticipantList = ({ users, currentUserId, onInviteClick }: ParticipantListProps) => {
  const otherUsers = users.filter(user => user.id !== currentUserId);
  const currentUser = users.find(user => user.id === currentUserId);
  const isAdmin = currentUserId === '1'; // First user is admin

  return (
    <div className="flex items-center space-x-2">
      {/* Participant Avatars */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-slate-300 hover:text-white hover:bg-slate-800/60 backdrop-blur-sm">
            <div className="flex -space-x-2">
              {users.slice(0, 3).map((user) => (
                <Avatar key={user.id} className="w-6 h-6 border-2 border-slate-700">
                  <AvatarFallback 
                    className="text-xs text-white"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {users.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-700 flex items-center justify-center">
                  <span className="text-xs text-slate-300">+{users.length - 3}</span>
                </div>
              )}
            </div>
            <Users className="w-4 h-4 ml-2" />
            <span className="text-sm">{users.length}</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Participants ({otherUsers.length + 1})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {/* Current User */}
            {currentUser && (
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/50">
                <Avatar className="w-8 h-8">
                  <AvatarFallback 
                    className="text-white"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {currentUser.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-white font-medium">{currentUser.nickname}</p>
                    <Badge variant="secondary" className="text-xs">You</Badge>
                    {isAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <p className="text-slate-400 text-sm">{currentUser.email}</p>
                </div>
              </div>
            )}
            
            {/* Other Users */}
            {otherUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800/30">
                <Avatar className="w-8 h-8">
                  <AvatarFallback 
                    className="text-white"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-white font-medium">{user.nickname}</p>
                    {user.id === '1' && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <p className="text-slate-400 text-sm">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onInviteClick}
        className="text-slate-300 hover:text-white hover:bg-slate-800/60 backdrop-blur-sm"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ParticipantList;