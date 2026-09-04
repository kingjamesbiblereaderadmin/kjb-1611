const FOOTER_AUTO_HIDE_KEY = 'kjb-footer-auto-hide-enabled';
const FOOTER_HIDE_TIME_KEY = 'kjb-footer-hide-time';

export function getFooterAutoHideEnabled() {
  try {
    return localStorage.getItem(FOOTER_AUTO_HIDE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setFooterAutoHideEnabled(enabled) {
  try {
    localStorage.setItem(FOOTER_AUTO_HIDE_KEY, String(enabled));
  } catch {}
}

export function getFooterHideTime() {
  try {
    return localStorage.getItem(FOOTER_HIDE_TIME_KEY) || '20:00';
  } catch {
    return '20:00';
  }
}

export function setFooterHideTime(time) {
  try {
    localStorage.setItem(FOOTER_HIDE_TIME_KEY, time);
  } catch {}
}