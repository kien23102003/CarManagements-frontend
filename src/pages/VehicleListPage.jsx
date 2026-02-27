import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import vehicleApi from '../api/vehicleApi';
import { Row, Col, Card, Statistic, Input, Select, Collapse, Table, Tag, Space, Button, message } from 'antd';
import { PlusOutlined, EditOutlined, CarOutlined, BankOutlined } from '@ant-design/icons';

const TRANG_THAI = {
  Active: { label: 'Hoạt động', color: 'green' },
  InMaintenance: { label: 'Đang bảo trì', color: 'orange' },
  InTransfer: { label: 'Đang điều chuyển', color: 'blue' },
  Disposed: { label: 'Đã thanh lý', color: 'red' },
};

export default function VehicleListPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadVehicles(); }, [statusFilter]);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await vehicleApi.getList(params);
      setVehicles(data.data || data || []);
    } catch { message.error('Không thể tải danh sách xe'); }
    setLoading(false);
  };

  const filtered = useMemo(() =>
    vehicles.filter((v) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (v.licensePlate || '').toLowerCase().includes(q) ||
        (v.manufacturer || '').toLowerCase().includes(q) ||
        (v.modelName || '').toLowerCase().includes(q) ||
        (v.currentBranchName || '').toLowerCase().includes(q);
    }), [vehicles, search]);

  const branches = useMemo(() => {
    const map = {};
    filtered.forEach((v) => {
      const key = v.currentBranchId || 0;
      if (!map[key]) map[key] = { branchId: key, branchName: v.currentBranchName || 'Chưa phân chi nhánh', vehicles: [] };
      map[key].vehicles.push(v);
    });
    return Object.values(map).sort((a, b) => {
      if (a.branchId === 0) return 1;
      if (b.branchId === 0) return -1;
      return a.branchName.localeCompare(b.branchName);
    });
  }, [filtered]);

  const stats = useMemo(() => {
    const s = { total: filtered.length, active: 0, maintenance: 0, branches: branches.length };
    filtered.forEach((v) => {
      if (v.status === 'Active') s.active++;
      if (v.status === 'InMaintenance') s.maintenance++;
    });
    return s;
  }, [filtered, branches]);

  const getModelBreakdown = (list) => {
    const m = {};
    list.forEach((v) => { const k = v.modelName || v.manufacturer || 'Khác'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  const columns = [
    { title: 'Biển số', dataIndex: 'licensePlate', key: 'plate', render: (v) => <strong>{v || '—'}</strong> },
    { title: 'Hãng xe', dataIndex: 'manufacturer', key: 'mfr', render: (v) => v || '—' },
    { title: 'Dòng xe', dataIndex: 'modelName', key: 'model', render: (v) => v || '—' },
    { title: 'Năm SX', dataIndex: 'yearManufacture', key: 'year', render: (v) => v || '—' },
    { title: 'Số km', dataIndex: 'mileage', key: 'km', render: (v) => v ? v.toLocaleString('vi-VN') : '—' },
    { title: 'Tài xế', dataIndex: 'currentDriverName', key: 'driver', render: (v) => v || '—' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (s) => { const info = TRANG_THAI[s] || { label: s, color: 'default' }; return <Tag color={info.color}>{info.label}</Tag>; },
    },
    {
      title: '', key: 'action', width: 80,
      render: (_, record) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/vehicles/${record.id}`)}>Sửa</Button>
      ),
    },
  ];

  const collapseItems = branches.map((branch) => {
    const models = getModelBreakdown(branch.vehicles);
    const statusCounts = {};
    branch.vehicles.forEach((v) => { statusCounts[v.status] = (statusCounts[v.status] || 0) + 1; });

    return {
      key: String(branch.branchId),
      label: (
        <Space>
          <BankOutlined style={{ color: '#3b82f6' }} />
          <strong>{branch.branchName}</strong>
          <Tag>{branch.vehicles.length} xe</Tag>
          {Object.entries(statusCounts).map(([s, c]) => {
            const info = TRANG_THAI[s] || { label: s, color: 'default' };
            return <Tag key={s} color={info.color}>{info.label}: {c}</Tag>;
          })}
        </Space>
      ),
      children: (
        <div>
          <Space wrap style={{ marginBottom: 12 }}>
            <CarOutlined style={{ color: '#8c8c8c' }} />
            {models.map(([name, count]) => (
              <Tag key={name}>{name} <strong>×{count}</strong></Tag>
            ))}
          </Space>
          <Table dataSource={branch.vehicles} columns={columns} rowKey="id" size="small" pagination={false} />
        </div>
      ),
    };
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Quản lý xe</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/vehicles/new')}>Thêm xe</Button>
      </div>

      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Tổng số xe" value={stats.total} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Chi nhánh" value={stats.branches} valueStyle={{ color: '#6366f1' }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Hoạt động" value={stats.active} valueStyle={{ color: '#22c55e' }} /></Card></Col>
        <Col xs={12} sm={6}><Card size="small"><Statistic title="Đang bảo trì" value={stats.maintenance} valueStyle={{ color: '#f59e0b' }} /></Card></Col>
      </Row>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder="Tìm biển số, hãng, dòng xe, chi nhánh..." allowClear style={{ width: 360 }}
          onSearch={setSearch} onChange={(e) => !e.target.value && setSearch('')} />
        <Select placeholder="Tất cả trạng thái" allowClear style={{ width: 180 }}
          value={statusFilter} onChange={setStatusFilter}
          options={Object.entries(TRANG_THAI).map(([k, v]) => ({ value: k, label: v.label }))} />
      </Space>

      {loading ? (
        <Card loading />
      ) : branches.length === 0 ? (
        <Card><div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>Không có xe nào.</div></Card>
      ) : (
        <Collapse items={collapseItems} defaultActiveKey={branches.length <= 3 ? branches.map((b) => String(b.branchId)) : []} />
      )}
    </div>
  );
}
