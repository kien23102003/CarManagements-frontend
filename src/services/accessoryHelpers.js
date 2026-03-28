export const ACCESSORY_TYPE_OPTIONS = [
  { value: 'Reusable', label: 'Tái sử dụng' },
  { value: 'Consumable', label: 'Tiêu hao' },
  { value: 'Fixed', label: 'Cố định' },
];

export const PURCHASE_REQUEST_STATUS_META = {
  Pending: { label: 'Chờ duyệt', color: 'orange' },
  Approved: { label: 'Đã duyệt', color: 'blue' },
  Rejected: { label: 'Từ chối', color: 'red' },
  PartiallyReceived: { label: 'Nhận một phần', color: 'gold' },
  Received: { label: 'Đã nhận đủ', color: 'green' },
  Cancelled: { label: 'Đã hủy', color: 'default' },
};

export const GOODS_RECEIPT_STATUS_META = {
  Draft: { label: 'Nháp', color: 'default' },
  Completed: { label: 'Hoàn tất', color: 'green' },
  Cancelled: { label: 'Đã hủy', color: 'red' },
};

export const VEHICLE_ACCESSORY_STATUS_META = {
  Installed: { label: 'Đang gắn', color: 'blue' },
  Returned: { label: 'Đã thu hồi', color: 'green' },
  Damaged: { label: 'Hỏng', color: 'red' },
  Lost: { label: 'Mất', color: 'volcano' },
  Removed: { label: 'Đã tháo', color: 'default' },
};

export const ACCESSORY_TRANSACTION_TYPE_META = {
  IMPORT: { label: 'Nhập kho', color: 'green' },
  ISSUE: { label: 'Cấp phát', color: 'blue' },
  RETURN: { label: 'Thu hồi', color: 'cyan' },
  DAMAGED: { label: 'Hỏng', color: 'red' },
  LOST: { label: 'Mất', color: 'volcano' },
  ADJUST: { label: 'Điều chỉnh', color: 'purple' },
};

export const ACCESSORY_REFERENCE_TYPE_META = {
  PURCHASE_REQUEST: 'Phiếu đề xuất',
  PURCHASE_RECEIPT: 'Phiếu nhập',
  ISSUE: 'Cấp phát',
  RETURN: 'Thu hồi',
  DAMAGED: 'Hỏng',
  LOST: 'Mất',
  ADJUST: 'Điều chỉnh',
};

export const STOCK_CONDITION_META = {
  NEW: { label: 'Mới', color: 'green' },
  USED: { label: 'Đã qua sử dụng', color: 'gold' },
  DAMAGED: { label: 'Hư hỏng', color: 'red' },
};

export const STOCK_CONDITION_OPTIONS = Object.entries(STOCK_CONDITION_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

export const canReadAccessoryModule = (roles = []) =>
  roles.includes('Operator') ||
  roles.includes('Executive Management') ||
  roles.includes('Branch Asset Accountant') ||
  roles.includes('Manager');

export const canViewAccessoryAcrossBranches = (roles = []) =>
  roles.includes('Executive Management') || roles.includes('Manager');

export const canWriteAccessoryCatalog = (roles = []) =>
  roles.includes('Operator') || roles.includes('Executive Management');

export const canIssueAccessory = (roles = []) =>
  roles.includes('Operator') ||
  roles.includes('Executive Management') ||
  roles.includes('Branch Asset Accountant') ||
  roles.includes('Manager');

export const canManageBranchStock = (roles = []) =>
  roles.includes('Operator') ||
  roles.includes('Executive Management') ||
  roles.includes('Branch Asset Accountant') ||
  roles.includes('Manager');

export const canApproveAccessoryPurchase = (roles = []) =>
  roles.includes('Executive Management') ||
  roles.includes('Branch Asset Accountant') ||
  roles.includes('Manager');

export const canManageAccessoryRequirements = (roles = []) =>
  roles.includes('Executive Management') ||
  roles.includes('Branch Asset Accountant') ||
  roles.includes('Manager');

export const isDisposedVehicleStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'disposed' || normalized === 'liquidated';
};

export const unwrapData = (payload) => payload?.data || payload || [];

export const formatCurrency = (value) =>
  value == null ? '-' : `${Number(value).toLocaleString('vi-VN')} VND`;

export const branchLabel = (branch) =>
  branch?.branchName ||
  branch?.name ||
  branch?.Name ||
  (branch?.branchId ?? branch?.id ?? branch?.Id
    ? `Chi nhánh #${branch?.branchId ?? branch?.id ?? branch?.Id}`
    : 'Chưa có chi nhánh');

export const branchIdValue = (branch) => branch?.branchId ?? branch?.id ?? branch?.Id;

export const branchNameValue = (branch) => branch?.branchName ?? branch?.name ?? branch?.Name;

export const branchOption = (branch) => {
  const value = branchIdValue(branch);
  return {
    value,
    label: branchNameValue(branch) || (value ? `Chi nhánh #${value}` : 'Chưa có chi nhánh'),
  };
};

export const vehicleLabel = (vehicle) =>
  vehicle?.licensePlate || vehicle?.vehicleLicensePlate || (vehicle?.id ? `Xe #${vehicle.id}` : 'Chưa có xe');
