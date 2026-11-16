import { Toaster as Sonner, toast } from 'sonner';

export { toast };

/** Toast host; follows the system theme. */
export function Toaster() {
  return <Sonner theme="system" position="bottom-center" />;
}
