import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import distributionApi from '../api/distributionApi';
import { App, Tabs, Table, Tag, Button, Card, Row, Col, Statistic, Select, Space, Popconfirm } from 'antd';
import { PlusOutlined, LoginOutlined, LogoutOutlined, StopOutlined, BankOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const TRANG_THAI = {
  Pending: 'Chá» thá»±c hiá»‡n',
  InTransit: 'Äang di chuyá»ƒn',
  Completed: 'HoÃ n thÃ nh',
  Cancelled: 'ÄÃ£ huá»·',
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
      message.error('KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u');
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
      message.success('Cáº­p nháº­t thÃ nh cÃ´ng');
      loadData();
    } catch (err) {
      message.error(err.response?.data?.message || 'CÃ³ lá»—i');
    }
  };

  const transferColumns = [
    { title: 'MÃ£', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
    { title: 'Biá»ƒn sá»‘', dataIndex: 'licensePlate', key: 'plate', render: (v) => <strong>{v || 'â€”'}</strong> },
    { title: 'Tá»« chi nhÃ¡nh', dataIndex: 'fromBranchName', key: 'from', render: (v) => v || 'â€”' },
    { title: 'Äáº¿n chi nhÃ¡nh', dataIndex: 'toBranchName', key: 'to', render: (v) => v || 'â€”' },
    {
      title: 'NgÃ y káº¿ hoáº¡ch',
      dataIndex: 'planDate',
      key: 'date',
      render: (v, record) => {
        if (!v) return 'â€”';
        const formatted = dayjs(v).format('DD/MM/YYYY');
        if (record.status !== 'Pending') return formatted;
        const today = dayjs().startOf('day');
        const planDay = dayjs(v).startOf('day');
        if (planDay.isBefore(today)) return <>{formatted} <Tag color="red">QuÃ¡ háº¡n</Tag></>;
        if (planDay.isSame(today)) return <>{formatted} <Tag color="orange">HÃ´m nay</Tag></>;
        return formatted;
      },
    },
    {
      title: 'Tráº¡ng thÃ¡i',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={TRANG_THAI_MAU[s] || 'default'}>{TRANG_THAI[s] || s}</Tag>,
    },
    {
      title: 'Xe ra',
      dataIndex: 'checkoutDate',
      key: 'checkout',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : 'â€”',
    },
    ...(isExec ? [{
      title: 'Người xác nhận ra', dataIndex: 'checkoutByName', key: 'checkoutBy',
      render: (v) => v || '—',
    }] : []),
    {
      title: 'Xe vÃ o',
      dataIndex: 'checkinDate',
      key: 'checkin',
      render: (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : 'â€”',
    },
    ...(isExec ? [{
      title: 'Người xác nhận vào', dataIndex: 'checkinByName', key: 'checkinBy',
      render: (v) => v || '—',
    }] : []),
    {
      title: 'HÃ nh Ä‘á»™ng',
      key: 'action',
      width: 200,
      render: (_, t) => (
        <Space>
          {isOperator && t.status === 'Pending' && t.fromBranchId === userBranchId && (
            <Popconfirm title="XÃ¡c nháº­n xe rá»i chi nhÃ¡nh?" onConfirm={() => handleStatus(t.id, 'Checkout')}>
              <Button size="small" type="primary" icon={<LogoutOutlined />}>Xe ra</Button>
            </Popconfirm>
          )}
          {isOperator && t.status === 'InTransit' && t.toBranchId === userBranchId && (
            <Popconfirm title="XÃ¡c nháº­n xe Ä‘Ã£ Ä‘áº¿n?" onConfirm={() => handleStatus(t.id, 'Checkin')}>
              <Button size="small" type="primary" style={{ background: '#22c55e', borderColor: '#22c55e' }} icon={<LoginOutlined />}>Xe vÃ o</Button>
            </Popconfirm>
          )}
          {isExec && (t.status === 'Pending' || t.status === 'InTransit') && (
            <Popconfirm title="Huá»· yÃªu cáº§u Ä‘iá»u chuyá»ƒn?" onConfirm={() => handleStatus(t.id, 'Cancelled')}>
              <Button size="small" danger icon={<StopOutlined />}>Huá»·</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'stock',
      label: 'Theo chi nhÃ¡nh',
      children: loading ? <Card loading /> : stock.length === 0 ? (
        <Card><div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>ChÆ°a cÃ³ dá»¯ liá»‡u tá»“n kho</div></Card>
      ) : (
        <Row gutter={[16, 16]}>
          {stock.map((b) => (
            <Col xs={24} sm={12} lg={8} key={b.branchId}>
              <Card style={{ borderRadius: 12 }}>
                <Space orientation="vertical" style={{ width: '100%' }}>
                  <Space><BankOutlined style={{ color: '#3b82f6', fontSize: 18 }} /><strong>{b.branchName || `Chi nhÃ¡nh #${b.branchId}`}</strong></Space>
                  <Row gutter={16}>
                    <Col span={8}><Statistic title="Tá»•ng" value={b.totalVehicles} /></Col>
                    <Col span={8}><Statistic title="Hoáº¡t Ä‘á»™ng" value={b.activeVehicles} styles={{ content: { color: '#22c55e' } }} /></Col>
                    <Col span={8}><Statistic title="Äang chuyá»ƒn" value={b.inTransferVehicles} styles={{ content: { color: '#06b6d4' } }} /></Col>
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
      label: 'YÃªu cáº§u Ä‘iá»u chuyá»ƒn',
      children: (
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="Táº¥t cáº£ tráº¡ng thÃ¡i"
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
        <h2 style={{ margin: 0 }}>Äiá»u chuyá»ƒn xe</h2>
        {isExec && <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/distribution/new')}>Táº¡o yÃªu cáº§u</Button>}
      </div>
      <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
    </div>
  );
}
