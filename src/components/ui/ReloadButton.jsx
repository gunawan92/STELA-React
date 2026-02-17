import { showErrorAlert, showSuccessAlert } from '../../lib/alerts';

async function handleRefresh(onRefresh) {
  try {
    const result = await onRefresh();
    if (result?.error) {
      showErrorAlert(result.error.message || 'Refresh gagal');
      return;
    }

    showSuccessAlert('Data dashboard berhasil diperbarui');
  } catch (error) {
    showErrorAlert(error?.message || 'Refresh gagal');
  }
}

function ReloadButton({ onRefresh, isLoading }) {
  return (
    <button
      type="button"
      onClick={() => handleRefresh(onRefresh)}
      disabled={isLoading}
      className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? 'Memuat...' : 'Refresh Data'}
    </button>
  );
}

export default ReloadButton;
