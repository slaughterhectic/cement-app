export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateInput = (date?: string): string => {
  if (!date) return new Date().toISOString().split('T')[0];
  return date.split('T')[0];
};

export const formatNumber = (n: number): string => {
  return new Intl.NumberFormat('en-IN').format(n);
};
