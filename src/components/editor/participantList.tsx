import { useState, useMemo } from "react";
import { Users, Crown, Eye, UserX } from "lucide-react";
import { AiOutlineUserAdd } from 'react-icons/ai';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import InviteLinkModal from "../modals/invite-participants";
import { MAX_PARTICIPANTS } from "../libs/constants";
import { useToast } from "@/components/libs/use-toast";

interface User {
  id: string;        // socket.id for self; nickname for others if id is unknown
  nickname: string;
  color: string;
}

interface ParticipantListProps {
  users: User[];
  currentUserId: string;         // socket.id of current user
  adminNickname: string;         // admin is identified by nickname from server
  onInviteClick: () => void;
  sessionId: string;
  onAddUser: () => void;
  onRemoveUser: () => void;
  onKick: (userId: string) => void;
}

const ParticipantList = ({
  users,
  currentUserId,
  adminNickname,
  onInviteClick,
  sessionId,
  onAddUser,
  onRemoveUser,
  onKick
}: ParticipantListProps) => {
  const { toast } = useToast();

  const currentUser = useMemo(() => users.find(u => u.id === currentUserId), [users, currentUserId]);
  const participants = useMemo(() => users.filter(u => u.id !== currentUserId), [users, currentUserId]);
  const isAdmin = currentUser?.nickname === adminNickname;
  const maxParticipantsReached = users.length >= MAX_PARTICIPANTS;

  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false);

  const handleInviteClick = () => {
    if (maxParticipantsReached) {
      toast({
        title: "Session is Full",
        description: `Cannot add more users. The session has reached the limit of ${MAX_PARTICIPANTS} participants.`,
        variant: "destructive",
      });
    } else {
      setShowInviteLinkModal(true);
    }
  };

  const handleKickClick = (user: User) => {
    onKick(user.id);
    toast({
      title: "Participant Removed",
      description: `${user.nickname} has been removed from the session.`,
      variant: "destructive",
    });
  };

  const handleFollowClick = (user: User) => {
    toast({
      title: "Following User",
      description: `Now following ${user.nickname}'s cursor.`,
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center space-x-1 text-slate-300 hover:text-white hover:bg-slate-800/60 backdrop-blur-sm rounded-full border-2"
          >
            <div className="flex -space-x-2">
              {participants.map((user) => (
                <Avatar key={user.id} className="w-6 h-6 border-2 border-slate-700">
                  <AvatarFallback
                    className="text-xs text-white"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </Button>
        </DialogTrigger>

        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700 text-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Participants
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
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
                </div>
              </div>
            )}

            {participants.map((user) => {
              const isUserAdmin = user.nickname === adminNickname;
              return (
                <div key={user.id} className="flex items-center justify-between space-x-3 p-3 rounded-lg hover:bg-slate-800/30">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback
                        className="text-white"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.nickname.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium">{user.nickname}</p>
                      {isUserAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" className="rounded-full text-slate-400 hover:text-black" onClick={() => handleFollowClick(user)}>
                      <Eye className="w-4 h-4" /> Follow
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-slate-400 hover:text-red-500"
                        onClick={() => handleKickClick(user)}
                      >
                        <UserX className="w-4 h-4" /> Kick
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleInviteClick}
        className="text-slate-300 hover:text-white hover:bg-slate-800/60 backdrop-blur-sm rounded-full border-2"
      >
        <AiOutlineUserAdd className="w-4 h-4" />
      </Button>

      <InviteLinkModal
        open={showInviteLinkModal}
        onOpenChange={setShowInviteLinkModal}
        sessionId={sessionId}
        participantCount={users.length}
      />
    </div>
  );
};

export default ParticipantList;
