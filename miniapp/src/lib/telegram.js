// Thin wrapper around window.Telegram.WebApp so the app also runs in a normal browser during development.
export const tg = window.Telegram?.WebApp;

export const isInTelegram = Boolean(tg?.initData);

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  tg.expand();
  tg.setHeaderColor?.('#FBFBF9');
  tg.setBackgroundColor?.('#FBFBF9');
}

export const getInitData = () => tg?.initData ?? '';

export function haptic(type = 'light') {
  tg?.HapticFeedback?.impactOccurred(type);
}

export function hapticSuccess() {
  tg?.HapticFeedback?.notificationOccurred('success');
}

let backHandler = null;

/** Show Telegram's native back button while `active`, calling `onBack` when pressed. */
export function setBackButton(active, onBack) {
  const button = tg?.BackButton;
  if (!button) return;
  if (backHandler) button.offClick(backHandler);
  backHandler = active ? onBack : null;
  if (active) {
    button.onClick(onBack);
    button.show();
  } else {
    button.hide();
  }
}
