import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Button, Card, Select, Space, Table, Tag } from 'antd';
import accessoryApi from '../api/accessoryApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../services/AuthContext';
import {
  PURCHASE_REQUEST_STATUS_META,
  branchOption,
  canApproveAccessoryPurchase,
  canReadAccessoryModule,
  canViewAccessoryAcrossBranches,
  unwrapData,
} from '../services/accessoryHelpers';

export default function AccessoryPurchaseRequestListPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canReadAccessoryModule(roles), [roles]);
  const canApprove = useMemo(() => canApproveAccessoryPurchase(roles), [roles]);
  const canViewAcrossBranches = useMemo(() => canViewAccessoryAcrossBranches(roles), [roles]);

  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    branchId: user?.branchId || undefined,
    status: undefined,
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
        const { data } = await accessoryApi.getPurchaseRequests(filters);
        setItems(unwrapData(data));
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải phiếu đề xuất mua phụ kiện');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, message, readable]);

  const branchOptions = branches.map(branchOption);

  const columns = [
    { title: 'Mã phiếu', dataIndex: 'requestCode', key: 'requestCode', width: 180 },
    { title: 'Người đề xuất', dataIndex: 'requesterName', key: 'requesterName', width: 180 },
    {
      title: 'Ngày đề xuất',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 150,
      render: (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
    },
    {
      title: 'Ngày duyệt',
      dataIndex: 'approvedDate',
      key: 'approvedDate',
      width: 150,
      render: (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (value) => {
        const meta = PURCHASE_REQUEST_STATUS_META[value] || { label: value, color: 'default' };
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
      width: 180,
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/accessory-purchase-requests/${record.id}`)}>
            Chi tiết
          </Button>
          {canApprove && record.status === 'Pending' && (
            <Button size="small" type="primary" onClick={() => navigate(`/accessory-purchase-requests/${record.id}`)}>
              Duyệt
            </Button>
          )}
        </Space>
      ),
    },
  ];

  if (canViewAcrossBranches) {
    columns.splice(1, 0, {
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
        <h2 style={{ margin: 0 }}>Phiếu đề xuất mua phụ kiện</h2>
        <Button type="primary" onClick={() => navigate('/accessory-purchase-requests/new')}>
          Tạo phiếu đề xuất
        </Button>
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
            options={Object.entries(PURCHASE_REQUEST_STATUS_META).map(([value, meta]) => ({
              value,
              label: meta.label,
            }))}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
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
