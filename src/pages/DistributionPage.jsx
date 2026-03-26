import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import distributionApi from '../api/distributionApi';
import { App, Tabs, Table, Tag, Button, Card, Row, Col, Statistic, Select, Space, Popconfirm, Descriptions } from 'antd';
import { PlusOutlined, StopOutlined, BankOutlined } from '@ant-design/icons';
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

const fmtDate = (v) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—';

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
  }, [tab, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatus = async (id, status) => {
    try {
      await distributionApi.updateTransferStatus(id, { status });
      message.success('Cập nhật thành công');
      loadData();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi');
    }
  };

  // Main columns — keep minimal
  const transferColumns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
    { title: 'Biển số', dataIndex: 'licensePlate', key: 'plate', render: (v) => <strong>{v || '—'}</strong> },
    {
      title: 'Lộ trình',
      key: 'route',
      render: (_, t) => `${t.fromBranchName || '—'} → ${t.toBranchName || '—'}`,
    },
    {
      title: 'Khởi hành DK',
      dataIndex: 'plannedDepartureDate',
      key: 'departure',
      render: (v, record) => {
        if (!v) return '—';
        const formatted = dayjs(v).format('DD/MM HH:mm');
        if (record.status === 'Pending' && dayjs().isAfter(dayjs(v)))
          return <>{formatted} <Tag color="red">Quá hạn</Tag></>;
        return formatted;
      },
    },
    {
      title: 'Đến nơi DK',
      dataIndex: 'plannedArrivalDate',
      key: 'arrival',
      render: (v, record) => {
        if (!v) return '—';
        const formatted = dayjs(v).format('DD/MM HH:mm');
        if (record.status === 'InTransit' && dayjs().isAfter(dayjs(v)))
          return <>{formatted} <Tag color="red">Quá hạn</Tag></>;
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
      title: 'Hành động',
      key: 'action',
      width: 100,
      render: (_, t) => (
        <Space>
          {isExec && (t.status === 'Pending' || t.status === 'InTransit') && (
            <Popconfirm title="Huỷ yêu cầu điều chuyển?" onConfirm={() => handleStatus(t.id, 'Cancelled')}>
              <Button size="small" danger icon={<StopOutlined />}>Huỷ</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Expandable detail row — styled cards
  const expandedRowRender = (record) => {
    const hasCheckout = !!record.checkoutDate;
    const hasCheckin = !!record.checkinDate;

    const InfoCard = ({ title, color, icon, children }) => (
      <div style={{
        flex: 1, minWidth: 220, background: '#fff', borderRadius: 10,
        border: `1px solid ${color}22`, overflow: 'hidden',
      }}>
        <div style={{
          padding: '8px 14px', background: `${color}0d`,
          borderBottom: `1px solid ${color}22`, fontWeight: 600, fontSize: 13, color,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {icon} {title}
        </div>
        <div style={{ padding: '10px 14px', fontSize: 13, lineHeight: 1.8 }}>
          {children}
        </div>
      </div>
    );

    const Row = ({ label, value, highlight }) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: '#8c8c8c' }}>{label}</span>
        <span style={{ fontWeight: highlight ? 600 : 400, color: highlight ? '#cf1322' : '#262626', textAlign: 'right' }}>
          {value || '—'}
        </span>
      </div>
    );

    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '4px 0' }}>
        {/* Timeline */}
        <InfoCard title="Lịch trình" color="#1677ff" >
          <Row label="Khởi hành dự kiến" value={fmtDate(record.plannedDepartureDate)} />
          <Row label="Đến nơi dự kiến" value={fmtDate(record.plannedArrivalDate)} />
          <Row label="Người tạo" value={record.managerName} />
          <Row label="Ngày tạo" value={fmtDate(record.createdAt)} />
        </InfoCard>

        {/* Checkout */}
        <InfoCard title="Xe ra (Checkout)" color={hasCheckout ? '#52c41a' : '#bfbfbf'}>
          <Row label="Thời gian" value={fmtDate(record.checkoutDate)} />
          {isExec && <Row label="Người xác nhận" value={record.checkoutByName} />}
          {record.checkoutNote && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#fff1f0', borderRadius: 6, border: '1px solid #ffa39e' }}>
              <span style={{ fontSize: 12, color: '#cf1322' }}>⚠ Lý do trễ: </span>
              <span style={{ fontSize: 12, color: '#434343' }}>{record.checkoutNote}</span>
            </div>
          )}
          {!hasCheckout && <span style={{ color: '#bfbfbf', fontSize: 12 }}>Chưa thực hiện</span>}
        </InfoCard>

        {/* Checkin */}
        <InfoCard title="Xe vào (Checkin)" color={hasCheckin ? '#52c41a' : '#bfbfbf'} >
          <Row label="Thời gian" value={fmtDate(record.checkinDate)} />
          {isExec && <Row label="Người xác nhận" value={record.checkinByName} />}
          {record.checkinNote && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#fff1f0', borderRadius: 6, border: '1px solid #ffa39e' }}>
              <span style={{ fontSize: 12, color: '#cf1322' }}>⚠ Lý do trễ: </span>
              <span style={{ fontSize: 12, color: '#434343' }}>{record.checkinNote}</span>
            </div>
          )}
          {!hasCheckin && <span style={{ color: '#bfbfbf', fontSize: 12 }}>Chưa thực hiện</span>}
          {record.executedDate && <Row label="Ngày hoàn thành" value={record.executedDate} />}
        </InfoCard>
      </div>
    );
  };

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
            expandable={{
              expandedRowRender,
              rowExpandable: () => true,
            }}
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
