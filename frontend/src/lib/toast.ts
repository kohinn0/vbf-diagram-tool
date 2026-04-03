import { toast as sonner } from 'sonner';

export const toast = {
  success: (msg: string) =>
    sonner.success(msg, {
      classNames: {
        toast: 'bg-emerald-50 text-emerald-950 border border-emerald-200',
        title: 'text-emerald-950',
      },
    }),
  error: (msg: string) =>
    sonner.error(msg, {
      classNames: {
        toast: 'bg-rose-50 text-rose-950 border border-rose-200',
        title: 'text-rose-950',
      },
    }),
};
