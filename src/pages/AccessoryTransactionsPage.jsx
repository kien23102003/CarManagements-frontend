import { useEffect, useMemo, useState } from 'react';
import { App, Card, DatePicker, InputNumber, Select, Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import accessoryApi from '../api/accessoryApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../services/AuthContext';
import {
  ACCESSORY_REFERENCE_TYPE_META,
  ACCESSORY_TRANSACTION_TYPE_META,
  branchOption,
  canReadAccessoryModule,
  canViewAccessoryAcrossBranches,
  formatCurrency,
  unwrapData,
} from '../services/accessoryHelpers';

export default function AccessoryTransactionsPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canReadAccessoryModule(roles), [roles]);
  const canViewAcrossBranches = useMemo(() => canViewAccessoryAcrossBranches(roles), [roles]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({
    branchId: user?.branchId || undefined,
    accessoryId: undefined,
    vehicleId: undefined,
    transactionType: undefined,
    referenceType: undefined,
    fromDate: null,
    toDate: null,
    page: 1,
    pageSize: 10,
  });

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const { data } = await assetApi.getBranches();
        setBranches(unwrapData(data));
      } catch {
        setBranches([]);
      }
    };

    loadBranches();
  }, []);

  useEffect(() => {
    if (!readable) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const params = {
          branchId: filters.branchId,
          accessoryId: filters.accessoryId,
          vehicleId: filters.vehicleId,
          transactionType: filters.transactionType,
          referenceType: filters.referenceType,
          fromDate: filters.fromDate ? dayjs(filters.fromDate).format('YYYY-MM-DD') : undefined,
          toDate: filters.toDate ? dayjs(filters.toDate).format('YYYY-MM-DD') : undefined,
          page: filters.page,
          pageSize: filters.pageSize,
        };
        const { data } = await accessoryApi.getAccessoryTransactions(params);
        setItems(unwrapData(data));
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải lịch sử giao dịch');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, message, readable]);

  const branchOptions = branches.map(branchOption);

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 180,
      render: (value) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: 'Phụ kiện',
      key: 'accessory',
      render: (_, record) => (
        <div>
          <div>{record.accessoryName || '-'}</div>
          <div style={{ color: '#888' }}>{record.accessoryCode || `#${record.accessoryId}`}</div>
        </div>
      ),
    },
    {
      title: 'Xe',
      key: 'vehicle',
      width: 150,
      render: (_, record) => record.vehicleLicensePlate || (record.vehicleId ? `Xe #${record.vehicleId}` : '-'),
    },
    {
      title: 'Loại giao dịch',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 140,
      render: (value) => {
        const meta = ACCESSORY_TRANSACTION_TYPE_META[value] || { label: value, color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Nguồn',
      key: 'reference',
      width: 170,
      render: (_, record) =>
        `${ACCESSORY_REFERENCE_TYPE_META[record.referenceType] || record.referenceType || '-'}${record.referenceId ? ` #${record.referenceId}` : ''}`,
    },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 150,
      render: formatCurrency,
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'performedByName',
      key: 'performedBy',
      width: 180,
      render: (_, record) => record.performedByName || record.performedBy || '-',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      render: (value) => value || '-',
    },
  ];

  if (canViewAcrossBranches) {
    columns.splice(2, 0, {
      title: 'Chi nhánh',
      key: 'branch',
      width: 180,
      render: (_, record) => record.branchName || (record.branchId ? `Chi nhánh #${record.branchId}` : '-'),
    });
  }

  if (!readable) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Lịch sử giao dịch phụ kiện</h2>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          {canViewAcrossBranches && (
            <Select
              allowClear
              placeholder="Chi nhánh"
              style={{ width: 180 }}
              value={filters.branchId}
              disabled={Boolean(user?.branchId) && !canViewAcrossBranches}
              options={branchOptions}
              onChange={(value) => setFilters((prev) => ({ ...prev, branchId: value, page: 1 }))}
            />
          )}
          <InputNumber
            placeholder="Mã phụ kiện"
            min={1}
            value={filters.accessoryId}
            onChange={(value) => setFilters((prev) => ({ ...prev, accessoryId: value ?? undefined, page: 1 }))}
          />
          <InputNumber
            placeholder="Mã xe"
            min={1}
            value={filters.vehicleId}
            onChange={(value) => setFilters((prev) => ({ ...prev, vehicleId: value ?? undefined, page: 1 }))}
          />
          <Select
            allowClear
            placeholder="Loại giao dịch"
            style={{ width: 180 }}
            value={filters.transactionType}
            onChange={(value) => setFilters((prev) => ({ ...prev, transactionType: value, page: 1 }))}
            options={Object.entries(ACCESSORY_TRANSACTION_TYPE_META).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
          />
          <Select
            allowClear
            placeholder="Nguồn"
            style={{ width: 180 }}
            value={filters.referenceType}
            onChange={(value) => setFilters((prev) => ({ ...prev, referenceType: value, page: 1 }))}
            options={Object.entries(ACCESSORY_REFERENCE_TYPE_META).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <DatePicker
            placeholder="Từ ngày"
            value={filters.fromDate ? dayjs(filters.fromDate) : null}
            onChange={(value) => setFilters((prev) => ({ ...prev, fromDate: value ? value.toDate() : null, page: 1 }))}
          />
          <DatePicker
            placeholder="Đến ngày"
            value={filters.toDate ? dayjs(filters.toDate) : null}
            onChange={(value) => setFilters((prev) => ({ ...prev, toDate: value ? value.toDate() : null, page: 1 }))}
          />
        </Space>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        scroll={{ x: 1300 }}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total: (filters.page - 1) * filters.pageSize + items.length + (items.length === filters.pageSize ? filters.pageSize : 0),
          showSizeChanger: true,
          onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })),
        }}
      />
    </div>
  );
}
