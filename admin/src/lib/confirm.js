import Swal from 'sweetalert2';

const MATCHA = '#517c38';
const DANGER = '#dc2626';

/** SweetAlert2 confirmation dialog in the Weeee Cafe colors. Resolves to true if confirmed. */
export async function confirmDialog({ title, text, html, confirmText = 'Confirm', danger = false, icon = 'question' }) {
  const result = await Swal.fire({
    title,
    text,
    html,
    icon,
    iconColor: danger ? DANGER : '#efa823',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    confirmButtonColor: danger ? DANGER : MATCHA,
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    ...(document.documentElement.classList.contains('dark') && { background: '#1b1f1b', color: '#e8ece6' }),
    focusCancel: danger, // an accidental Enter must not cancel/refund an order
  });
  return result.isConfirmed;
}
