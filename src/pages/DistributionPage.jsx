import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import distributionApi from '../api/distributionApi';
import { App, Tabs, Table, Tag, Button, Card, Row, Col, Statistic, Select, Space, Popconfirm } from 'antd';
import { PlusOutlined, LoginOutlined, LogoutOutlined, StopOutlined, BankOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const TRANG_THAI = {
  Pending: 'Chờ thực hiện',
  InTransit: 'Đang di chuyển',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã huỷ',
};

const TRANG_THAI_MAU = {
  Pending: 'orange',
  InTransit: 'blue',
  Completed: 'green',
  Cancelled: 'default',
};

export default function DistributionPage() {
  const { message } = App.useApp();
  const [tab, setTab] = useState('stock');
  const [stock, setStock] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles || [];
  const isExec = roles.includes('Executive Management');
  const isOperator = roles.includes('Operator');
  const userBranchId = user?.branchId;

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
    } catch {
      message.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tab, statusFilter]);

  const handleStatus = async (id, status) => {
    try {
      await distributionApi.updateTransferStatus(id, { status });
      message.success('Cập nhật thành công');
      loadData();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi');
    }
  };

  const transferColumns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
    { title: 'Biển số', dataIndex: 'licensePlate', key: 'plate', render: (v) => <strong>{v || '—'}</strong> },
    { title: 'Từ chi nhánh', dataIndex: 'fromBranchName', key: 'from', render: (v) => v || '—' },
    { title: 'Đến chi nhánh', dataIndex: 'toBranchName', key: 'to', render: (v) => v || '—' },
    {
      title: 'Ngày kế hoạch',
      dataIndex: 'planDate',
      key: 'date',
      render: (v, record) => {
        if (!v) return '—';
        const formatted = dayjs(v).format('DD/MM/YYYY');
        if (record.status !== 'Pending') return formatted;
        const today = dayjs().startOf('day');
        const planDay = dayjs(v).startOf('day');
        if (planDay.isBefore(today)) return <>{formatted} <Tag color="red">Quá hạn</Tag></>;
        if (planDay.isSame(today)) return <>{formatted} <Tag color="orange">Hôm nay</Tag></>;
        return formatted;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={TRANG_THAI_MAU[s] || 'default'}>{TRANG_THAI[s] || s}</Tag>,
    },
    {
      title: 'Xe ra',
      dataIndex: 'checkoutDate',
      key: 'checkout',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
    },
    ...(isExec ? [{
      title: 'Người xác nhận ra', dataIndex: 'checkoutByName', key: 'checkoutBy',
      render: (v) => v || '—',
    }] : []),
    {
      title: 'Xe vào',
      dataIndex: 'checkinDate',
      key: 'checkin',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
    },
    ...(isExec ? [{
      title: 'Người xác nhận vào', dataIndex: 'checkinByName', key: 'checkinBy',
      render: (v) => v || '—',
    }] : []),
    {
      title: 'Hành động',
      key: 'action',
      width: 200,
      render: (_, t) => (
        <Space>
          {isOperator && t.status === 'Pending' && t.fromBranchId === userBranchId && (
            <Popconfirm title="Xác nhận xe rời chi nhánh?" onConfirm={() => handleStatus(t.id, 'Checkout')}>
              <Button size="small" type="primary" icon={<LogoutOutlined />}>Xe ra</Button>
            </Popconfirm>
          )}
          {isOperator && t.status === 'InTransit' && t.toBranchId === userBranchId && (
            <Popconfirm title="Xác nhận xe đã đến?" onConfirm={() => handleStatus(t.id, 'Checkin')}>
              <Button size="small" type="primary" style={{ background: '#22c55e', borderColor: '#22c55e' }} icon={<LoginOutlined />}>Xe vào</Button>
            </Popconfirm>
          )}
          {isExec && (t.status === 'Pending' || t.status === 'InTransit') && (
            <Popconfirm title="Huỷ yêu cầu điều chuyển?" onConfirm={() => handleStatus(t.id, 'Cancelled')}>
              <Button size="small" danger icon={<StopOutlined />}>Huỷ</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'stock',
      label: 'Theo chi nhánh',
      children: loading ? <Card loading /> : stock.length === 0 ? (
        <Card><div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>Chưa có dữ liệu tồn kho</div></Card>
      ) : (
        <Row gutter={[16, 16]}>
          {stock.map((b) => (
            <Col xs={24} sm={12} lg={8} key={b.branchId}>
              <Card style={{ borderRadius: 12 }}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Space><BankOutlined style={{ color: '#3b82f6', fontSize: 18 }} /><strong>{b.branchName || `Chi nhánh #${b.branchId}`}</strong></Space>
                  <Row gutter={16}>
                    <Col span={8}><Statistic title="Tổng" value={b.totalVehicles} /></Col>
                    <Col span={8}><Statistic title="Hoạt động" value={b.activeVehicles} styles={{ content: { color: '#22c55e' } }} /></Col>
                    <Col span={8}><Statistic title="Đang chuyển" value={b.inTransferVehicles} styles={{ content: { color: '#06b6d4' } }} /></Col>
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
      label: 'Yêu cầu điều chuyển',
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="Tất cả trạng thái"
              allowClear
              style={{ width: 170 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={Object.entries(TRANG_THAI).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Space>
          <Table
            dataSource={transfers}
            columns={transferColumns}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Điều chuyển xe</h2>
        {isExec && <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/distribution/new')}>Tạo yêu cầu</Button>}
      </div>
      <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
    </div>
  );
}
