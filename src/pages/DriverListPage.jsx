import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Empty, Input, message, Popconfirm, Select, Space, Statistic, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import driverApi from '../api/driverApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../services/AuthContext';

export default function DriverListPage() {
  const [drivers, setDrivers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles || [];
  const isBranchScoped = roles.includes('Operator') || roles.includes('Branch Asset Accountant');
  const currentUserBranchId = user?.branchId;

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const effectiveBranchId = isBranchScoped && currentUserBranchId ? currentUserBranchId : branchId;
      const [driverRes, branchRes] = await Promise.all([
        driverApi.getList(effectiveBranchId),
        assetApi.getBranches(),
      ]);
      setDrivers(driverRes.data || []);
      const allBranches = branchRes.data?.data || branchRes.data || [];
      const branchOptions = isBranchScoped && currentUserBranchId
        ? allBranches.filter((b) => b.id === currentUserBranchId)
        : allBranches;
      setBranches(branchOptions);
    } catch (e) {
      const msg = e.response?.data?.message || 'Không thể tải danh sách tài xế';
      setLoadError(msg);
      message.error(msg);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isBranchScoped && currentUserBranchId) {
      setBranchId(currentUserBranchId);
    }
  }, [isBranchScoped, currentUserBranchId]);

  useEffect(() => { loadData(); }, [branchId, isBranchScoped, currentUserBranchId]);

  const filtered = useMemo(() => drivers.filter((d) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (d.name || '').toLowerCase().includes(q) || (d.licenseNumber || '').toLowerCase().includes(q);
  }), [drivers, search]);

  const stats = useMemo(() => ({
    total: filtered.length,
    assigned: filtered.filter((d) => d.currentVehicleId != null).length,
    waiting: filtered.filter((d) => d.currentVehicleId == null).length,
  }), [filtered]);

  const onDelete = async (id) => {
    try {
      await driverApi.delete(id);
      message.success('Xóa tài xế thành công');
      loadData();
    } catch (e) {
      message.error(e.response?.data?.message || 'Không thể xóa tài xế');
    }
  };

  const columns = [
    { title: 'Tên tài xế', dataIndex: 'name' },
    { title: 'GPLX', dataIndex: 'licenseNumber' },
    { title: 'SĐT', dataIndex: 'phone', render: (v) => v || '-' },
    { title: 'Email', dataIndex: 'email', render: (v) => v || '-' },
    { title: 'Chi nhánh', dataIndex: 'branchName', render: (v) => v || '-' },
    { title: 'Phương tiện hiện tại', dataIndex: 'currentVehicleLicensePlate', render: (v) => v || '-' },
    { title: 'Dòng xe', dataIndex: 'currentVehicleModelName', render: (v) => v || '-' },
    {
      title: 'Trạng thái',
      render: (_, r) => r.currentVehicleId != null
        ? <Tag color="blue">Đang phân công</Tag>
        : <Tag color="gold">Chờ phân công</Tag>,
    },
    {
      title: 'Thao tác',
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/drivers/${r.id}/edit`)}>Sửa</Button>
          <Popconfirm title="Xóa tài xế?" onConfirm={() => onDelete(r.id)}>
            <Button size="small" danger>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Danh sách tài xế</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/drivers/new')}>Thêm tài xế</Button>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <Space wrap size={12} align="start">
          <Input.Search placeholder="Tìm tên/GPLX" onSearch={setSearch} allowClear style={{ width: 260 }} />
          <Select
            allowClear={!isBranchScoped}
            placeholder="Lọc chi nhánh"
            style={{ width: 240 }}
            value={branchId}
            onChange={setBranchId}
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            disabled={isBranchScoped}
          />
        </Space>
        <Space wrap size={12} align="center">
          <Card size="small" style={{ width: 150, minHeight: 72 }} bodyStyle={{ padding: '10px 12px' }}>
            <Statistic title="Tổng" value={stats.total} />
          </Card>
          <Card size="small" style={{ width: 150, minHeight: 72 }} bodyStyle={{ padding: '10px 12px' }}>
            <Statistic title="Đang phân công" value={stats.assigned} />
          </Card>
          <Card size="small" style={{ width: 150, minHeight: 72 }} bodyStyle={{ padding: '10px 12px' }}>
            <Statistic title="Chờ phân công" value={stats.waiting} />
          </Card>
        </Space>
      </div>
      {loadError && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message="Không tải được dữ liệu tài xế"
          description={loadError}
        />
      )}
      {isBranchScoped && (
        <Alert
          style={{ marginBottom: 12 }}
          type="info"
          showIcon
          message="Danh sách tài xế đang được mặc định lọc theo chi nhánh của bạn."
        />
      )}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có tài xế nào phù hợp điều kiện lọc."
            />
          ),
        }}
      />
    </div>
  );
}
