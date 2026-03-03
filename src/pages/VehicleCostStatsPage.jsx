import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Select, Typography, Tag, Spin } from 'antd';
import {
  DollarOutlined,
  FallOutlined,
  CarOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../services/AuthContext';

const fmt = (v) => (v || 0).toLocaleString('vi-VN') + ' đ';
const fmtKm = (v) => (v || 0).toLocaleString('vi-VN') + ' km';
const pct = (loss, orig) => orig ? ((loss / orig) * 100).toFixed(1) + '%' : '—';

export default function VehicleCostStatsPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const { user } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await vehicleApi.getList();
      const list = res.data?.data || res.data || [];
      setVehicles(Array.isArray(list) ? list : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const { branchStats, totalStats, branches, filteredVehicles } = useMemo(() => {
    const map = {};
    let tOriginal = 0, tCurrent = 0, tMileage = 0;

    vehicles.forEach((v) => {
      const branch = v.currentBranchName || 'Không xác định';
      if (!map[branch]) map[branch] = { branch, count: 0, original: 0, current: 0, mileage: 0 };
      map[branch].count++;
      map[branch].original += v.originalCost || 0;
      map[branch].current += v.currentValue || 0;
      map[branch].mileage += v.mileage || 0;
      tOriginal += v.originalCost || 0;
      tCurrent += v.currentValue || 0;
      tMileage += v.mileage || 0;
    });

    const branchStats = Object.values(map).map((b) => ({
      ...b,
      loss: b.original - b.current,
      lossPct: b.original ? ((b.original - b.current) / b.original * 100).toFixed(1) : 0,
    }));

    const totalLoss = tOriginal - tCurrent;
    const totalStats = {
      count: vehicles.length,
      original: tOriginal,
      current: tCurrent,
      loss: totalLoss,
      lossPct: tOriginal ? (totalLoss / tOriginal * 100).toFixed(1) : 0,
      mileage: tMileage,
    };

    const branches = [...new Set(vehicles.map((v) => v.currentBranchName).filter(Boolean))];
    const filteredVehicles = selectedBranch === 'all'
      ? vehicles
      : vehicles.filter((v) => v.currentBranchName === selectedBranch);

    return { branchStats, totalStats, branches, filteredVehicles };
  }, [vehicles, selectedBranch]);

  const detailData = useMemo(() => filteredVehicles.map((v) => {
    const loss = (v.originalCost || 0) - (v.currentValue || 0);
    const costPerKm = v.mileage > 0 ? loss / v.mileage : 0;
    return { ...v, loss, costPerKm };
  }), [filteredVehicles]);

  const SUMMARY_CARDS = [
    { icon: <CarOutlined />, title: 'Tổng số xe', value: totalStats.count, color: '#3b82f6', suffix: ' xe', isCurrency: false },
    { icon: <DollarOutlined />, title: 'Tổng giá gốc', value: totalStats.original, color: '#10b981', isCurrency: true },
    { icon: <DollarOutlined />, title: 'Tổng giá hiện tại', value: totalStats.current, color: '#f59e0b', isCurrency: true },
    { icon: <FallOutlined />, title: 'Tổng khấu hao', value: totalStats.loss, color: '#ef4444', isCurrency: true, suffix: ` (${totalStats.lossPct}%)` },
  ];

  const branchColumns = [
    { title: 'Chi nhánh', dataIndex: 'branch', key: 'branch', fixed: 'left', width: 180 },
    { title: 'Số xe', dataIndex: 'count', key: 'count', width: 80, align: 'center' },
    { title: 'Tổng giá gốc', dataIndex: 'original', key: 'original', render: fmt, align: 'right', width: 180, sorter: (a, b) => a.original - b.original },
    { title: 'Tổng giá hiện tại', dataIndex: 'current', key: 'current', render: fmt, align: 'right', width: 180, sorter: (a, b) => a.current - b.current },
    { title: 'Tổng lỗ', dataIndex: 'loss', key: 'loss', align: 'right', width: 180,
      render: (v) => <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmt(v)}</span>, sorter: (a, b) => a.loss - b.loss },
    { title: 'Tỷ lệ lỗ', dataIndex: 'lossPct', key: 'lossPct', align: 'center', width: 100,
      render: (v) => <Tag color="red">{v}%</Tag>, sorter: (a, b) => a.lossPct - b.lossPct },
    { title: 'Tổng KM', dataIndex: 'mileage', key: 'mileage', render: fmtKm, align: 'right', width: 140, sorter: (a, b) => a.mileage - b.mileage },
  ];

  const detailColumns = [
    { title: 'Biển số', dataIndex: 'licensePlate', key: 'plate', fixed: 'left', width: 120 },
    { title: 'Dòng xe', key: 'model', width: 160, render: (_, r) => `${r.manufacturer || ''} ${r.modelName || ''}`.trim() || '—' },
    { title: 'Chi nhánh', dataIndex: 'currentBranchName', key: 'branch', width: 160 },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 110, align: 'center',
      render: (s) => <Tag color={s === 'Active' ? 'green' : s === 'Maintenance' ? 'orange' : 'red'}>{s}</Tag> },
    { title: 'Giá gốc', dataIndex: 'originalCost', key: 'orig', render: fmt, align: 'right', width: 170, sorter: (a, b) => (a.originalCost || 0) - (b.originalCost || 0) },
    { title: 'Giá hiện tại', dataIndex: 'currentValue', key: 'cur', render: fmt, align: 'right', width: 170, sorter: (a, b) => (a.currentValue || 0) - (b.currentValue || 0) },
    { title: 'Lỗ', dataIndex: 'loss', key: 'loss', align: 'right', width: 170,
      render: (v) => <span style={{ color: '#ef4444', fontWeight: 600 }}>{fmt(v)}</span>, sorter: (a, b) => a.loss - b.loss },
    { title: '% Lỗ', key: 'lossPct', align: 'center', width: 90,
      render: (_, r) => <Tag color="red">{pct(r.loss, r.originalCost)}</Tag>, sorter: (a, b) => (a.loss / (a.originalCost || 1)) - (b.loss / (b.originalCost || 1)) },
    { title: 'Số KM', dataIndex: 'mileage', key: 'km', render: fmtKm, align: 'right', width: 120, sorter: (a, b) => (a.mileage || 0) - (b.mileage || 0) },
    { title: 'Chi phí/KM', dataIndex: 'costPerKm', key: 'cpkm', align: 'right', width: 140,
      render: (v) => v > 0 ? Math.round(v).toLocaleString('vi-VN') + ' đ/km' : '—', sorter: (a, b) => a.costPerKm - b.costPerKm },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        <DashboardOutlined style={{ marginRight: 8 }} />
        Thống kê chi phí xe
      </Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {SUMMARY_CARDS.map(({ icon, title, value, color, isCurrency, suffix }) => (
          <Col xs={24} sm={12} lg={6} key={title}>
            <Card style={{ borderRadius: 12, borderTop: `3px solid ${color}` }}>
              <Statistic
                title={title}
                value={isCurrency ? value : value}
                prefix={<span style={{ color, fontSize: 22 }}>{icon}</span>}
                suffix={suffix}
                formatter={isCurrency ? (v) => Number(v).toLocaleString('vi-VN') + ' đ' : undefined}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Thống kê theo chi nhánh" style={{ borderRadius: 12, marginBottom: 24 }}>
        <Table
          dataSource={branchStats}
          columns={branchColumns}
          rowKey="branch"
          pagination={false}
          size="middle"
          scroll={{ x: 1100 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 700 }}>
                <Table.Summary.Cell index={0}>TỔNG CỘNG</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">{totalStats.count}</Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">{fmt(totalStats.original)}</Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">{fmt(totalStats.current)}</Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right"><span style={{ color: '#ef4444' }}>{fmt(totalStats.loss)}</span></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="center"><Tag color="red">{totalStats.lossPct}%</Tag></Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">{fmtKm(totalStats.mileage)}</Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      <Card
        title="Chi tiết từng xe"
        style={{ borderRadius: 12 }}
        extra={
          <Select
            value={selectedBranch}
            onChange={setSelectedBranch}
            style={{ width: 220 }}
            options={[
              { value: 'all', label: 'Tất cả chi nhánh' },
              ...branches.map((b) => ({ value: b, label: b })),
            ]}
          />
        }
      >
        <Table
          dataSource={detailData}
          columns={detailColumns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Tổng ${t} xe` }}
        />
      </Card>
    </div>
  );
}
