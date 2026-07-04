import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ title, open, onClose, children, wide }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-y-auto border-border/70 shadow-xl sm:max-w-lg",
          wide && "sm:max-w-2xl",
        )}
      >
        <DialogHeader className="border-b border-border/60 pb-4">
          <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
        </DialogHeader>
        <div className="pt-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
