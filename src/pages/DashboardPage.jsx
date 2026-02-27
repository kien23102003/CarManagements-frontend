import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import vehicleApi from '../api/vehicleApi';
import maintenanceApi from '../api/maintenanceApi';
import distributionApi from '../api/distributionApi';
import pendingApi from '../api/pendingApi';
import { Row, Col, Card, Statistic, Table, Tag, Typography } from 'antd';
import { CarOutlined, ToolOutlined, SwapOutlined, FileSearchOutlined } from '@ant-design/icons';

const STATUS_VI = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', InProgress: 'Đang xử lý', Completed: 'Hoàn thành' };
const STATUS_COLOR = { Pending: 'orange', Approved: 'green', Rejected: 'red', InProgress: 'blue', Completed: 'green' };
const TYPE_VI = { Routine: 'Định kỳ', Emergency: 'Khẩn cấp', Repair: 'Sửa chữa' };

export default function DashboardPage() {
  const [stats, setStats] = useState({ vehicles: 0, maintenance: 0, transfers: 0, pending: 0 });
  const [recentMaintenance, setRecentMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [vRes, mRes, tRes, pRes] = await Promise.allSettled([
        vehicleApi.getList(),
        maintenanceApi.getList({ status: 'Pending' }),
        distributionApi.getTransfers({ status: 'Pending' }),
        pendingApi.getList(),
      ]);

      const vehicles = vRes.status === 'fulfilled' ? (vRes.value.data?.data || vRes.value.data || []) : [];
      const maintenance = mRes.status === 'fulfilled' ? (mRes.value.data?.data || mRes.value.data || []) : [];
      const transfers = tRes.status === 'fulfilled' ? (tRes.value.data?.data || tRes.value.data || []) : [];
      const pending = pRes.status === 'fulfilled' ? (pRes.value.data?.data || pRes.value.data || []) : [];

      setStats({
        vehicles: Array.isArray(vehicles) ? vehicles.length : 0,
        maintenance: Array.isArray(maintenance) ? maintenance.length : 0,
        transfers: Array.isArray(transfers) ? transfers.length : 0,
        pending: Array.isArray(pending) ? pending.length : 0,
      });
      setRecentMaintenance(Array.isArray(maintenance) ? maintenance.slice(0, 5) : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const STAT_CARDS = [
    { icon: <CarOutlined />, title: 'Tổng số xe', value: stats.vehicles, color: '#3b82f6', path: '/vehicles' },
    { icon: <ToolOutlined />, title: 'Bảo trì chờ duyệt', value: stats.maintenance, color: '#f59e0b', path: '/maintenance' },
    { icon: <SwapOutlined />, title: 'Điều chuyển chờ', value: stats.transfers, color: '#8b5cf6', path: '/distribution' },
    { icon: <FileSearchOutlined />, title: 'Yêu cầu chờ', value: stats.pending, color: '#06b6d4', path: '/pending' },
  ];

  const columns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}` },
    { title: 'Loại', dataIndex: 'maintenanceType', key: 'type', render: (v) => TYPE_VI[v] || v },
    { title: 'Mô tả', dataIndex: 'description', key: 'desc', render: (v) => v || '—' },
    { title: 'Chi phí ước tính', dataIndex: 'estimatedCost', key: 'cost', render: (v) => v ? v.toLocaleString('vi-VN') + ' đ' : '—' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s) => <Tag color={STATUS_COLOR[s] || 'default'}>{STATUS_VI[s] || s}</Tag> },
  ];

  return (
    <div>
      <Typography.Title level={3}>Tổng quan</Typography.Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {STAT_CARDS.map(({ icon, title, value, color, path }) => (
          <Col xs={24} sm={12} lg={6} key={title}>
            <Card hoverable onClick={() => navigate(path)} style={{ borderRadius: 12 }}>
              <Statistic
                title={title}
                value={loading ? '...' : value}
                prefix={<span style={{ color, fontSize: 24 }}>{icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {recentMaintenance.length > 0 && (
        <Card title="Yêu cầu bảo trì gần đây" style={{ borderRadius: 12 }}>
          <Table
            dataSource={recentMaintenance}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        </Card>
      )}
    </div>
  );
}
