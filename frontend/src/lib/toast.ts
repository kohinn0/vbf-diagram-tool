import { toast as sonner } from 'sonner';
import { vbfToast } from './vbfUi';

export const toast = {
  success: (msg: string) =>
    sonner.success(msg, {
      classNames: {
        toast: vbfToast.success,
        title: 'text-emerald-50',
      },
    }),
  error: (msg: string) =>
    sonner.error(msg, {
      classNames: {
        toast: vbfToast.error,
        title: 'text-rose-50',
      },
    }),
  neutral: (msg: string) =>
    sonner(msg, {
      classNames: {
        toast: vbfToast.neutral,
        title: 'text-[var(--color-text-main)]',
      },
    }),
};
