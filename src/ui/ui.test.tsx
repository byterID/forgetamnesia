import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { Button } from '@/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/ui/dialog';
import { Input } from '@/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/ui/sheet';
import { toast, Toaster } from '@/ui/toaster';

describe('Dialog', () => {
  it('opens and closes', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByText('open'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Sheet', () => {
  it('opens from the trigger', async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
          <SheetDescription>Description</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    await user.click(screen.getByText('open'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('Toast', () => {
  it('shows a message', async () => {
    render(<Toaster />);
    act(() => {
      toast('Saved');
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });
});

describe('Button and Input', () => {
  it('keep a 44px touch target', () => {
    render(
      <>
        <Button>go</Button>
        <Input aria-label="field" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'go' })).toHaveClass('min-h-11');
    expect(screen.getByLabelText('field')).toHaveClass('min-h-11');
  });
});
