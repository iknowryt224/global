import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "./ui/dialog";

export default function AuthErrorModal({ error, isOpen, onRetry, isRetrying }) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <DialogTitle>Authentication Error</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {error?.message || "An unexpected authentication error occurred"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-3 justify-end pt-4">
          {error?.retryable && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              className="bg-[#0A2463] hover:bg-[#1E3B8A]"
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
