import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Card, InputNumber, Select, Space, Table, Tag } from 'antd';
import accessoryApi from '../api/accessoryApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../services/AuthContext';
import {
  GOODS_RECEIPT_STATUS_META,
  branchOption,
  canReadAccessoryModule,
  canViewAccessoryAcrossBranches,
  unwrapData,
} from '../services/accessoryHelpers';

export default function AccessoryGoodsReceiptListPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canReadAccessoryModule(roles), [roles]);
  const canViewAcrossBranches = useMemo(() => canViewAccessoryAcrossBranches(roles), [roles]);

  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    branchId: user?.branchId || undefined,
    status: undefined,
    purchaseRequestId: undefined,
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
        const { data } = await accessoryApi.getGoodsReceipts(filters);
        setItems(unwrapData(data));
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải phiếu nhập phụ kiện');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, message, readable]);

  const branchOptions = branches.map(branchOption);

  const columns = [
    { title: 'Mã phiếu nhập', dataIndex: 'id', key: 'id', width: 120, render: (value) => `#${value}` },
    {
      title: 'Phiếu đề xuất',
      key: 'purchaseRequestCode',
      width: 180,
      render: (_, record) => record.purchaseRequestCode || `#${record.purchaseRequestId}`,
    },
    {
      title: 'Ngày nhập',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 150,
      render: (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
    },
    {
      title: 'Người nhận',
      dataIndex: 'receivedByName',
      key: 'receivedByName',
      width: 180,
      render: (value, record) => value || record.receivedBy,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (value) => {
        const meta = GOODS_RECEIPT_STATUS_META[value] || { label: value, color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Chi tiết',
      key: 'detailCount',
      width: 120,
      render: (_, record) => `${record.details?.length || 0} dòng`,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button size="small" onClick={() => navigate(`/accessory-goods-receipts/${record.id}`)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  if (canViewAcrossBranches) {
    columns.splice(2, 0, {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 180,
      render: (value, record) => value || `Chi nhánh #${record.branchId}`,
    });
  }

  if (!readable) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Phiếu nhập hàng phụ kiện</h2>
        <Button onClick={() => navigate('/accessory-purchase-requests')}>Chọn từ phiếu đề xuất</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          {canViewAcrossBranches && (
            <Select
              allowClear={!user?.branchId}
              placeholder="Chi nhánh"
              style={{ width: 180 }}
              disabled={Boolean(user?.branchId) && !canViewAcrossBranches}
              value={filters.branchId}
              options={branchOptions}
              onChange={(value) => setFilters((prev) => ({ ...prev, branchId: value, page: 1 }))}
            />
          )}
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 180 }}
            value={filters.status}
            options={Object.entries(GOODS_RECEIPT_STATUS_META).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
          />
          <InputNumber
            placeholder="Mã phiếu đề xuất"
            min={1}
            value={filters.purchaseRequestId}
            onChange={(value) => setFilters((prev) => ({ ...prev, purchaseRequestId: value ?? undefined, page: 1 }))}
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
          total: (filters.page - 1) * filters.pageSize + items.length + (items.length === filters.pageSize ? filters.pageSize : 0),
          showSizeChanger: true,
          onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })),
        }}
      />
    </div>
  );
}
