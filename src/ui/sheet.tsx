import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { ModalContent } from '@/ui/modal-content';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

/** Bottom sheet: the primary mobile surface for forms. */
export function SheetContent({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <ModalContent
      className={cn(
        'inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-xl border-t',
        className,
      )}
      {...props}
    />
  );
}
