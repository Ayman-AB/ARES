"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";

export const Dialog = DialogPrimitive.Root;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={[
        "fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:duration-200 data-[state=closed]:duration-150",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={[
          "fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border border-white/10 bg-[#0b111a] p-5 text-slate-100 shadow-[0_28px_90px_rgba(0,0,0,0.65)] focus:outline-none",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="Close dialog"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        >
          ×
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={["flex flex-col gap-1.5 pr-8 text-left", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={["flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={["text-base font-semibold text-white", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={["text-sm text-slate-400", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

export {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
};
