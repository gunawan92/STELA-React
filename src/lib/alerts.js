import Swal from 'sweetalert2';

export function showSuccessAlert(text) {
  return Swal.fire({
    icon: 'success',
    title: 'Berhasil',
    text,
    timer: 4000,
    timerProgressBar: true,
    showConfirmButton: false,
  });
}

export function showErrorAlert(text) {
  return Swal.fire({
    icon: 'error',
    title: 'Terjadi Kesalahan',
    text,
    timer: 4000,
    timerProgressBar: true,
    showConfirmButton: false,
  });
}

function showNetworkToast({ icon, title, text }) {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    text,
    timer: 3000,
    timerProgressBar: true,
    showConfirmButton: false,
  });
}

export function showInternetOnlineAlert() {
  return showNetworkToast({
    icon: 'success',
    title: 'Internet Terhubung',
    text: 'Koneksi kembali normal. Data realtime aktif lagi.',
  });
}

export function showInternetOfflineAlert() {
  return showNetworkToast({
    icon: 'warning',
    title: 'Internet Terputus',
    text: 'Koneksi internet terputus. Mohon periksa jaringan Anda.',
  });
}
