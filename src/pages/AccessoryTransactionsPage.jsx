import { useEffect, useMemo, useState } from 'react';
import { Card, DatePicker, Select, Space, Table, Tag, InputNumber, message } from 'antd';
import dayjs from 'dayjs';
import accessoryApi from '../api/accessoryApi';
import { useAuth } from '../services/AuthContext';

const canRead = (roles) =>
  roles.includes('Operator') ||
  roles.includes('Executive Management') ||
  roles.includes('Branch Asset Accountant');

const TX_COLORS = {
  IMPORT: 'green',
  ISSUE: 'blue',
  RETURN: 'cyan',
  DAMAGED: 'red',
  LOST: 'volcano',
  ADJUST: 'purple',
};

export default function AccessoryTransactionsPage() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canRead(roles), [roles]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    accessoryId: undefined,
    vehicleId: undefined,
    transactionType: undefined,
    fromDate: null,
    toDate: null,
    page: 1,
    pageSize: 10,
  });

  const loadData = async () => {
    if (!readable) return;
    setLoading(true);
    try {
      const params = {
        accessoryId: filters.accessoryId,
        vehicleId: filters.vehicleId,
        transactionType: filters.transactionType,
        fromDate: filters.fromDate ? dayjs(filters.fromDate).format('YYYY-MM-DD') : undefined,
        toDate: filters.toDate ? dayjs(filters.toDate).format('YYYY-MM-DD') : undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      };
      const { data } = await accessoryApi.getAccessoryTransactions(params);
      setItems(data.data || data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải lịch sử giao dịch');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    readable,
    filters.accessoryId,
    filters.vehicleId,
    filters.transactionType,
    filters.fromDate,
    filters.toDate,
    filters.page,
    filters.pageSize,
  ]);

  const columns = [
    {
      title: 'Ngày giao dịch',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 180,
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    { title: 'Mã phụ kiện', dataIndex: 'accessoryId', key: 'accessoryId', width: 120 },
    { title: 'Mã xe', dataIndex: 'vehicleId', key: 'vehicleId', width: 120, render: (v) => v ?? '-' },
    { title: 'Mã gắn phụ kiện', dataIndex: 'vehicleAccessoryId', key: 'vehicleAccessoryId', width: 160, render: (v) => v ?? '-' },
    {
      title: 'Loại',
      dataIndex: 'transactionType',
      key: 'transactionType',
      width: 120,
      render: (v) => <Tag color={TX_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 140,
      render: (v) => (v == null ? '-' : `${Number(v).toLocaleString('vi-VN')} VND`),
    },
    { title: 'Người thực hiện', dataIndex: 'performedBy', key: 'performedBy', width: 120, render: (v) => v ?? '-' },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', render: (v) => v || '-' },
  ];

  if (!readable) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Lịch sử giao dịch phụ kiện</h2>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <InputNumber
            placeholder="Mã phụ kiện"
            min={1}
            value={filters.accessoryId}
            onChange={(v) => setFilters((prev) => ({ ...prev, accessoryId: v ?? undefined, page: 1 }))}
          />
          <InputNumber
            placeholder="Mã xe"
            min={1}
            value={filters.vehicleId}
            onChange={(v) => setFilters((prev) => ({ ...prev, vehicleId: v ?? undefined, page: 1 }))}
          />
          <Select
            allowClear
            placeholder="Loại giao dịch"
            style={{ width: 160 }}
            value={filters.transactionType}
            onChange={(v) => setFilters((prev) => ({ ...prev, transactionType: v, page: 1 }))}
            options={[
              { value: 'IMPORT', label: 'IMPORT' },
              { value: 'ISSUE', label: 'ISSUE' },
              { value: 'RETURN', label: 'RETURN' },
              { value: 'DAMAGED', label: 'DAMAGED' },
              { value: 'LOST', label: 'LOST' },
              { value: 'ADJUST', label: 'ADJUST' },
            ]}
          />
          <DatePicker
            placeholder="Từ ngày"
            value={filters.fromDate ? dayjs(filters.fromDate) : null}
            onChange={(v) => setFilters((prev) => ({ ...prev, fromDate: v ? v.toDate() : null, page: 1 }))}
          />
          <DatePicker
            placeholder="Đến ngày"
            value={filters.toDate ? dayjs(filters.toDate) : null}
            onChange={(v) => setFilters((prev) => ({ ...prev, toDate: v ? v.toDate() : null, page: 1 }))}
          />
        </Space>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total:
            (filters.page - 1) * filters.pageSize +
            items.length +
            (items.length === filters.pageSize ? filters.pageSize : 0),
          showSizeChanger: true,
          onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })),
        }}
      />
    </div>
  );
}
