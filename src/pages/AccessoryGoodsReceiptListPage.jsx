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
        message.error(error.response?.data?.message || 'Khong the tai phieu nhap phu kien');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, message, readable]);

  const branchOptions = branches.map(branchOption);

  const columns = [
    { title: 'Ma phieu nhap', dataIndex: 'id', key: 'id', width: 120, render: (value) => `#${value}` },
    {
      title: 'Phieu de xuat',
      key: 'purchaseRequestCode',
      width: 180,
      render: (_, record) => record.purchaseRequestCode || `#${record.purchaseRequestId}`,
    },
    {
      title: 'Ngay nhap',
      dataIndex: 'receiptDate',
      key: 'receiptDate',
      width: 150,
      render: (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
    },
    {
      title: 'Nguoi nhan',
      dataIndex: 'receivedByName',
      key: 'receivedByName',
      width: 180,
      render: (value, record) => value || record.receivedBy,
    },
    {
      title: 'Trang thai',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (value) => {
        const meta = GOODS_RECEIPT_STATUS_META[value] || { label: value, color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Chi tiet',
      key: 'detailCount',
      width: 120,
      render: (_, record) => `${record.details?.length || 0} dong`,
    },
    {
      title: 'Thao tac',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button size="small" onClick={() => navigate(`/accessory-goods-receipts/${record.id}`)}>
          Chi tiet
        </Button>
      ),
    },
  ];

  if (canViewAcrossBranches) {
    columns.splice(2, 0, {
      title: 'Chi nhanh',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 180,
      render: (value, record) => value || `Chi nhanh #${record.branchId}`,
    });
  }

  if (!readable) {
    return <Card>Ban khong co quyen truy cap chuc nang nay.</Card>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Phieu nhap hang phu kien</h2>
        <Button onClick={() => navigate('/accessory-purchase-requests')}>Chon tu phieu de xuat</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          {canViewAcrossBranches && (
            <Select
              allowClear={!user?.branchId}
              placeholder="Chi nhanh"
              style={{ width: 180 }}
              disabled={Boolean(user?.branchId) && !canViewAcrossBranches}
              value={filters.branchId}
              options={branchOptions}
              onChange={(value) => setFilters((prev) => ({ ...prev, branchId: value, page: 1 }))}
            />
          )}
          <Select
            allowClear
            placeholder="Trang thai"
            style={{ width: 180 }}
            value={filters.status}
            options={Object.entries(GOODS_RECEIPT_STATUS_META).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
          />
          <InputNumber
            placeholder="Ma phieu de xuat"
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
