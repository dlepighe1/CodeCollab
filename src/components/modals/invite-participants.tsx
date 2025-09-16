// components/modals/invite-participants.tsx

import { useState, useEffect } from "react";
import { Copy, Check, Link } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/lib/use-toast";
import { MAX_PARTICIPANTS } from "../lib/constants";

interface InviteLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  participantCount: number; // Add new prop
}

const InviteLinkModal = ({ open, onOpenChange, sessionId, participantCount }: InviteLinkModalProps) => {
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const { toast } = useToast();
  const maxParticipantsReached = participantCount >= MAX_PARTICIPANTS;
  
  // Set the invite link only after the component has mounted on the client
  useEffect(() => {
    // Check if window is defined before accessing it
    if (typeof window !== 'undefined') {
      setInviteLink(`${window.location.origin}/session/${sessionId}`);
    }
  }, [sessionId]);

  // Show a toast if the max participants have been reached when the modal opens
  useEffect(() => {
    if (open && maxParticipantsReached) {
      toast({
        title: "Session is full",
        description: `This session has reached the maximum of ${MAX_PARTICIPANTS} participants.`,
        variant: "destructive",
      });
    }
  }, [open, maxParticipantsReached, toast]);

  const sessionCode = sessionId; 

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Invite link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      toast({
        title: "Code copied!",
        description: "Session code has been copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Link className="w-5 h-5 mr-2" />
            Invite Collaborators
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">          
          {maxParticipantsReached ? (
            <p className="text-sm text-red-400 font-bold">
              The session is currently full. No more participants can join.
            </p>
          ) : (
            <>
              {/* Invite Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Share this link</label>
                <div className="flex space-x-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="bg-slate-800/50 border-slate-600 text-white text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="bg-slate-800/50 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Direct link that others can click to join
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteLinkModal;