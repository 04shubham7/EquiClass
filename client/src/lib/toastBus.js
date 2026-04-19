let toastListeners = [];
let toastId = 0;

function getToasts() {
  return [];
}

export function showToast(message, type = 'info', action) {
  const id = ++toastId;
  const toast = { id, message, type, action };
  toastListeners.forEach((listener) => listener([toast, ...getToasts()]));
  return id;
}

export function dismissToast(id) {
  toastListeners.forEach((listener) =>
    listener((toasts) => toasts.filter((toast) => toast.id !== id))
  );
}

export function subscribeToasts(listener) {
  toastListeners.push(listener);

  return () => {
    toastListeners = toastListeners.filter((registered) => registered !== listener);
  };
}
