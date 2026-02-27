import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import distributionApi from '../api/distributionApi';
import { Tabs, Table, Tag, Button, Card, Row, Col, Statistic, Select, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, PlayCircleOutlined, BankOutlined } from '@ant-design/icons';

const TRANG_THAI = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', Executed: 'Đã thực hiện', Cancelled: 'Đã huỷ' };
const TRANG_THAI_MAU = { Pending: 'orange', Approved: 'green', Rejected: 'red', Executed: 'blue', Cancelled: 'default' };

export default function DistributionPage() {
  const [tab, setTab] = useState('stock');
  const [stock, setStock] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles || [];
  const isAccountant = roles.includes('Branch Asset Accountant');
  const isExec = roles.includes('Executive Management');
  const isOperator = roles.includes('Operator');

  useEffect(() => { loadData(); }, [tab, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'stock') {
        const { data } = await distributionApi.getStock();
        setStock(data.data || data || []);
      } else {
        const params = {};
        if (statusFilter) params.status = statusFilter;
        const { data } = await distributionApi.getTransfers(params);
        setTransfers(data.data || data || []);
      }
    } catch { message.error('Không thể tải dữ liệu'); }
    setLoading(false);
  };

  const handleStatus = async (id, status) => {
    try {
      await distributionApi.updateTransferStatus(id, { status });
      message.success('Cập nhật thành công');
      loadData();
    } catch (err) { message.error(err.response?.data?.message || 'Có lỗi'); }
  };

  const transferColumns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
    { title: 'Biển số', dataIndex: 'licensePlate', key: 'plate', render: (v) => <strong>{v || '—'}</strong> },
    { title: 'Từ chi nhánh', dataIndex: 'fromBranchName', key: 'from', render: (v) => v || '—' },
    { title: 'Đến chi nhánh', dataIndex: 'toBranchName', key: 'to', render: (v) => v || '—' },
    { title: 'Ngày kế hoạch', dataIndex: 'planDate', key: 'date', render: (v) => v || '—' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s) => <Tag color={TRANG_THAI_MAU[s] || 'default'}>{TRANG_THAI[s] || s}</Tag> },
    {
      title: 'Hành động', key: 'action', width: 240,
      render: (_, t) => (
        <Space>
          {(isExec || isAccountant) && t.status === 'Pending' && (
            <>
              <Popconfirm title="Duyệt kế hoạch này?" onConfirm={() => handleStatus(t.id, 'Approved')}>
                <Button size="small" type="primary" icon={<CheckOutlined />}>Duyệt</Button>
              </Popconfirm>
              <Popconfirm title="Từ chối kế hoạch này?" onConfirm={() => handleStatus(t.id, 'Rejected')}>
                <Button size="small" danger icon={<CloseOutlined />}>Từ chối</Button>
              </Popconfirm>
            </>
          )}
          {isOperator && t.status === 'Approved' && (
            <Popconfirm title="Thực hiện điều chuyển?" onConfirm={() => handleStatus(t.id, 'Executed')}>
              <Button size="small" type="primary" icon={<PlayCircleOutlined />}>Thực hiện</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'stock',
      label: 'Tồn kho theo chi nhánh',
      children: loading ? <Card loading /> : stock.length === 0 ? (
        <Card><div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>Chưa có dữ liệu tồn kho</div></Card>
      ) : (
        <Row gutter={[16, 16]}>
          {stock.map((b) => (
            <Col xs={24} sm={12} lg={8} key={b.branchId}>
              <Card style={{ borderRadius: 12 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space><BankOutlined style={{ color: '#3b82f6', fontSize: 18 }} /><strong>{b.branchName || `Chi nhánh #${b.branchId}`}</strong></Space>
                  <Row gutter={16}>
                    <Col span={8}><Statistic title="Tổng" value={b.totalVehicles} /></Col>
                    <Col span={8}><Statistic title="Hoạt động" value={b.activeVehicles} valueStyle={{ color: '#22c55e' }} /></Col>
                    <Col span={8}><Statistic title="Đang chuyển" value={b.inTransferVehicles} valueStyle={{ color: '#06b6d4' }} /></Col>
                  </Row>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      ),
    },
    {
      key: 'transfers',
      label: 'Kế hoạch điều chuyển',
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Select placeholder="Tất cả trạng thái" allowClear style={{ width: 170 }} value={statusFilter} onChange={setStatusFilter}
              options={Object.entries(TRANG_THAI).map(([k, v]) => ({ value: k, label: v }))} />
          </Space>
          <Table dataSource={transfers} columns={transferColumns} rowKey="id" loading={loading} size="middle"
            pagination={{ pageSize: 10, showSizeChanger: true }} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Điều chuyển xe</h2>
        {isAccountant && <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/distribution/new')}>Tạo kế hoạch</Button>}
      </div>
      <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
    </div>
  );
}
