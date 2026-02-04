import toast from 'react-hot-toast';

export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'bottom-right',
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    duration: Infinity,
    position: 'bottom-right',
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    position: 'bottom-right',
  });
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

export const showPromise = <T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string }
) => {
  return toast.promise(promise, messages, {
    position: 'bottom-right',
  });
};
