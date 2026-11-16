import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ComponentProps } from 'react';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/** Shared chrome (portal, overlay, close button) for Dialog and Sheet; they differ only by `className`. */
export function ModalContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
      <DialogPrimitive.Content
        className={cn('fixed border-border bg-background p-6 shadow-lg', className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={t('common.close')}
          className="absolute top-2 right-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-muted"
        >
          ×
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
