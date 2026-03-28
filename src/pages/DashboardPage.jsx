import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import vehicleApi from '../api/vehicleApi';
import maintenanceApi from '../api/maintenanceApi';
import distributionApi from '../api/distributionApi';
import pendingApi from '../api/pendingApi';
import proposalApi from '../api/proposalApi';
import driverApi from '../api/driverApi';
import {
  Row, Col, Card, Statistic, Table, Tag, Typography, Spin, Space, Progress, Badge, Divider,
} from 'antd';
import {
  CarOutlined, ToolOutlined, SwapOutlined, FileSearchOutlined,
  TeamOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, RiseOutlined, FallOutlined, BankOutlined,
  DashboardOutlined, ThunderboltOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Pie, Column } from '@ant-design/charts';
import dayjs from 'dayjs';

// ─── Status maps ───
const STATUS_VI = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', InProgress: 'Đang xử lý', Completed: 'Hoàn thành' };
const STATUS_COLOR = { Pending: 'orange', Approved: 'green', Rejected: 'red', InProgress: 'blue', Completed: 'green' };
const VEHICLE_STATUS_VI = {
  Active: 'Sẵn sàng', Available: 'Sẵn sàng', Assigned: 'Đã phân công',
  InMaintenance: 'Đang bảo trì', Maintenance: 'Đang bảo trì',
  InTransfer: 'Đang điều chuyển', Disposed: 'Đã thanh lý',
};
const VEHICLE_STATUS_COLOR_MAP = {
  'Sẵn sàng': '#52c41a', 'Đã phân công': '#1677ff',
  'Đang bảo trì': '#faad14', 'Đang điều chuyển': '#722ed1', 'Đã thanh lý': '#ff4d4f',
};
const TRANSFER_STATUS_VI = { Pending: 'Chờ thực hiện', InTransit: 'Đang di chuyển', Completed: 'Hoàn thành', Cancelled: 'Đã huỷ' };
const TRANSFER_STATUS_COLOR = { Pending: 'orange', InTransit: 'blue', Completed: 'green', Cancelled: 'default' };
const TYPE_VI = { Periodic: 'Định kỳ', Breakdown: 'Sửa chữa', Routine: 'Định kỳ', Emergency: 'Khẩn cấp', Repair: 'Sửa chữa' };

const fmtMoney = (v) => v != null ? `${Number(v).toLocaleString('vi-VN')}` : '0';
const fmtDate = (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—';

// ─── Stat Card ───
function StatCard({ icon, title, value, color, suffix, onClick, loading: isLoading }) {
  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      style={{ borderRadius: 14, border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `linear-gradient(135deg, ${color}15, ${color}25)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, color,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#262626', lineHeight: 1.2 }}>
            {isLoading ? <Spin size="small" /> : value}
            {suffix && <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c', marginLeft: 4 }}>{suffix}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Section Title ───
function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 8 }}>
      <span style={{ fontSize: 18, color: '#1677ff' }}>{icon}</span>
      <Typography.Title level={5} style={{ margin: 0 }}>{title}</Typography.Title>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Executive Management Dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ExecDashboard({ vehicles, maintenance, transfers, pending, proposals, stock, loading }) {
  const navigate = useNavigate();

  const totalOriginal = vehicles.reduce((s, v) => s + (v.originalCost || 0), 0);
  const totalCurrent = vehicles.reduce((s, v) => s + (v.currentValue || 0), 0);
  const depreciation = totalOriginal - totalCurrent;

  const pendingTransfers = transfers.filter(t => t.status === 'Pending').length;
  const inTransitTransfers = transfers.filter(t => t.status === 'InTransit').length;
  const pendingMaintenance = maintenance.filter(m => m.status === 'Pending').length;

  // Vehicle status distribution for pie chart
  const statusCounts = {};
  vehicles.forEach(v => {
    const label = VEHICLE_STATUS_VI[v.status] || v.status;
    statusCounts[label] = (statusCounts[label] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([type, value]) => ({ type, value }));

  // Branch stock for column chart
  const branchChartData = stock.map(b => ({
    branch: b.branchName || `CN #${b.branchId}`,
    'Hoạt động': b.activeVehicles || 0,
    'Đang chuyển': b.inTransferVehicles || 0,
  }));
  const columnData = branchChartData.flatMap(b => [
    { branch: b.branch, type: 'Hoạt động', value: b['Hoạt động'] },
    { branch: b.branch, type: 'Đang chuyển', value: b['Đang chuyển'] },
  ]);

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<CarOutlined />} title="Tổng xe" value={vehicles.length} color="#1677ff" onClick={() => navigate('/vehicles')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<DollarOutlined />} title="Tổng giá trị tài sản" value={fmtMoney(totalOriginal)} suffix="VNĐ" color="#52c41a" loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<SwapOutlined />} title="Điều chuyển đang chờ" value={pendingTransfers + inTransitTransfers} color="#722ed1" onClick={() => navigate('/distribution')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<FileSearchOutlined />} title="Yêu cầu chờ duyệt" value={pending.length} color="#fa8c16" onClick={() => navigate('/pending')} loading={loading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<RiseOutlined />} title="Giá trị hiện tại" value={fmtMoney(totalCurrent)} suffix="VNĐ" color="#13c2c2" loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<FallOutlined />} title="Tổng khấu hao" value={fmtMoney(depreciation)} suffix="VNĐ" color="#ff4d4f" loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<ToolOutlined />} title="Bảo trì chờ duyệt" value={pendingMaintenance} color="#faad14" onClick={() => navigate('/maintenance')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<SafetyCertificateOutlined />} title="Đề xuất mua xe" value={proposals.length} color="#2f54eb" onClick={() => navigate('/proposals')} loading={loading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={10}>
          <Card title={<><CarOutlined style={{ color: '#1677ff', marginRight: 8 }} />Xe theo trạng thái</>} style={{ borderRadius: 14, height: '100%' }}>
            {pieData.length > 0 ? (
              <Pie
                data={pieData}
                angleField="value"
                colorField="type"
                innerRadius={0.6}
                radius={0.9}
                height={280}
                color={({ type }) => VEHICLE_STATUS_COLOR_MAP[type] || '#8c8c8c'}
                label={{ text: 'value', style: { fontWeight: 600, fontSize: 14 } }}
                legend={{ color: { position: 'bottom', layout: { justifyContent: 'center' } } }}
                tooltip={{ title: 'type' }}
                annotations={[{
                  type: 'text',
                  style: { text: `${vehicles.length}`, x: '50%', y: '50%', textAlign: 'center', fontSize: 28, fontWeight: 700, fill: '#262626' },
                }, {
                  type: 'text',
                  style: { text: 'Tổng xe', x: '50%', y: '57%', textAlign: 'center', fontSize: 13, fill: '#8c8c8c' },
                }]}
              />
            ) : <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>Chưa có dữ liệu</div>}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title={<><BankOutlined style={{ color: '#1677ff', marginRight: 8 }} />hoạt động của chi nhánh</>} style={{ borderRadius: 14, height: '100%' }}>
            {columnData.length > 0 ? (
              <Column
                data={columnData}
                xField="branch"
                yField="value"
                colorField="type"
                group={true}
                height={280}
                color={['#1677ff', '#722ed1']}
                style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
                legend={{ color: { position: 'top-right' } }}
              />
            ) : <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>Chưa có dữ liệu</div>}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={<><ToolOutlined style={{ color: '#faad14', marginRight: 8 }} />Bảo trì gần đây</>} style={{ borderRadius: 14 }}>
            <Table
              dataSource={maintenance.slice(0, 5)} rowKey="id" pagination={false} size="small"
              columns={[
                { title: 'Mã', dataIndex: 'id', render: id => `#${id}`, width: 60 },
                { title: 'Loại', dataIndex: 'maintenanceType', render: v => TYPE_VI[v] || v },
                { title: 'Chi phí', dataIndex: 'estimatedCost', render: v => v ? `${fmtMoney(v)} đ` : '—' },
                { title: 'Trạng thái', dataIndex: 'status', render: s => <Tag color={STATUS_COLOR[s]}>{STATUS_VI[s] || s}</Tag> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<><SwapOutlined style={{ color: '#722ed1', marginRight: 8 }} />Điều chuyển gần đây</>} style={{ borderRadius: 14 }}>
            <Table
              dataSource={transfers.slice(0, 5)} rowKey="id" pagination={false} size="small"
              columns={[
                { title: 'Mã', dataIndex: 'id', render: id => `#${id}`, width: 60 },
                { title: 'Biển số', dataIndex: 'licensePlate', render: v => <strong>{v || '—'}</strong> },
                { title: 'Lộ trình', key: 'route', render: (_, r) => `${r.fromBranchName || '—'} → ${r.toBranchName || '—'}` },
                { title: 'TT', dataIndex: 'status', render: s => <Tag color={TRANSFER_STATUS_COLOR[s]}>{TRANSFER_STATUS_VI[s] || s}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Branch Asset Accountant Dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AccountantDashboard({ vehicles, maintenance, transfers, proposals, loading }) {
  const navigate = useNavigate();

  const totalOriginal = vehicles.reduce((s, v) => s + (v.originalCost || 0), 0);
  const totalCurrent = vehicles.reduce((s, v) => s + (v.currentValue || 0), 0);
  const depreciation = totalOriginal - totalCurrent;
  const depreciationPercent = totalOriginal > 0 ? Math.round((depreciation / totalOriginal) * 100) : 0;

  const completedMaint = maintenance.filter(m => m.status === 'Completed' || m.status === 'Approved');
  const totalMaintCost = completedMaint.reduce((s, m) => s + (m.estimatedCost || 0), 0);
  const pendingMaint = maintenance.filter(m => m.status === 'Pending');
  const pendingProposals = proposals.filter(p => p.status === 'Pending');

  // Vehicle status for pie
  const statusCounts = {};
  vehicles.forEach(v => {
    const label = VEHICLE_STATUS_VI[v.status] || v.status;
    statusCounts[label] = (statusCounts[label] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([type, value]) => ({ type, value }));

  // Maintenance cost by type for column chart
  const maintByType = {};
  maintenance.forEach(m => {
    const type = TYPE_VI[m.maintenanceType] || m.maintenanceType || 'Khác';
    maintByType[type] = (maintByType[type] || 0) + (m.estimatedCost || 0);
  });
  const maintChartData = Object.entries(maintByType).map(([type, value]) => ({ type, value }));

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<CarOutlined />} title="Tổng xe chi nhánh" value={vehicles.length} color="#1677ff" onClick={() => navigate('/vehicles')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<DollarOutlined />} title="Giá trị gốc" value={fmtMoney(totalOriginal)} suffix="VNĐ" color="#52c41a" loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<RiseOutlined />} title="Giá trị hiện tại" value={fmtMoney(totalCurrent)} suffix="VNĐ" color="#13c2c2" loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<FallOutlined />} title="Tổng khấu hao" value={fmtMoney(depreciation)} suffix="VNĐ" color="#ff4d4f" loading={loading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<ToolOutlined />} title="Chi phí bảo trì" value={fmtMoney(totalMaintCost)} suffix="VNĐ" color="#faad14" onClick={() => navigate('/maintenance')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<ExclamationCircleOutlined />} title="Bảo trì chờ duyệt" value={pendingMaint.length} color="#fa8c16" onClick={() => navigate('/maintenance')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<SafetyCertificateOutlined />} title="Đề xuất mua chờ" value={pendingProposals.length} color="#2f54eb" onClick={() => navigate('/proposals')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<SwapOutlined />} title="Điều chuyển" value={transfers.length} color="#722ed1" onClick={() => navigate('/distribution')} loading={loading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={8}>
          <Card title={<><CarOutlined style={{ color: '#1677ff', marginRight: 8 }} />Xe theo trạng thái</>} style={{ borderRadius: 14, height: '100%' }}>
            {pieData.length > 0 ? (
              <Pie
                data={pieData}
                angleField="value"
                colorField="type"
                innerRadius={0.6}
                radius={0.9}
                height={260}
                color={({ type }) => VEHICLE_STATUS_COLOR_MAP[type] || '#8c8c8c'}
                label={{ text: 'value', style: { fontWeight: 600 } }}
                legend={{ color: { position: 'bottom', layout: { justifyContent: 'center' } } }}
                annotations={[{
                  type: 'text',
                  style: { text: `${vehicles.length}`, x: '50%', y: '50%', textAlign: 'center', fontSize: 26, fontWeight: 700, fill: '#262626' },
                }, {
                  type: 'text',
                  style: { text: 'Tổng xe', x: '50%', y: '57%', textAlign: 'center', fontSize: 12, fill: '#8c8c8c' },
                }]}
              />
            ) : <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>Chưa có dữ liệu</div>}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<><ToolOutlined style={{ color: '#faad14', marginRight: 8 }} />Chi phí bảo trì theo loại</>} style={{ borderRadius: 14, height: '100%' }}>
            {maintChartData.length > 0 ? (
              <Column
                data={maintChartData}
                xField="type"
                yField="value"
                height={260}
                color="#faad14"
                style={{ radiusTopLeft: 6, radiusTopRight: 6 }}
                label={{ text: (d) => fmtMoney(d.value), style: { fontSize: 11 } }}
                axis={{ y: { labelFormatter: v => fmtMoney(v) } }}
              />
            ) : <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>Chưa có dữ liệu</div>}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<><DashboardOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />Tỉ lệ khấu hao</>} style={{ borderRadius: 14, height: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
              <Progress
                type="dashboard"
                percent={depreciationPercent}
                size={180}
                strokeColor={{ '0%': '#ff4d4f', '100%': '#faad14' }}
                format={(p) => <div style={{ lineHeight: 1.3 }}><div style={{ fontSize: 28, fontWeight: 700 }}>{p}%</div><div style={{ fontSize: 12, color: '#8c8c8c' }}>đã khấu hao</div></div>}
              />
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>Nguyên giá: <strong style={{ color: '#262626' }}>{fmtMoney(totalOriginal)} VNĐ</strong></div>
                <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 4 }}>Hiện tại: <strong style={{ color: '#52c41a' }}>{fmtMoney(totalCurrent)} VNĐ</strong></div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title={<><ToolOutlined style={{ color: '#faad14', marginRight: 8 }} />Bảo trì chờ duyệt</>} style={{ borderRadius: 14 }}>
            <Table
              dataSource={pendingMaint.slice(0, 8)} rowKey="id" pagination={false} size="small"
              columns={[
                { title: 'Mã', dataIndex: 'id', render: id => `#${id}`, width: 60 },
                { title: 'Loại', dataIndex: 'maintenanceType', render: v => TYPE_VI[v] || v },
                { title: 'Mô tả', dataIndex: 'description', render: v => v || '—', ellipsis: true },
                { title: 'Chi phí ước tính', dataIndex: 'estimatedCost', render: v => v ? `${fmtMoney(v)} đ` : '—' },
                { title: 'Ngày tạo', dataIndex: 'createdAt', render: fmtDate },
                { title: 'Trạng thái', dataIndex: 'status', render: s => <Tag color={STATUS_COLOR[s]}>{STATUS_VI[s] || s}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Operator Dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OperatorDashboard({ vehicles, maintenance, transfers, drivers, loading }) {
  const navigate = useNavigate();

  const available = vehicles.filter(v => v.status === 'Active' || v.status === 'Available').length;
  const assigned = vehicles.filter(v => v.status === 'Assigned').length;
  const inMaint = vehicles.filter(v => v.status === 'InMaintenance' || v.status === 'Maintenance').length;


  const totalDrivers = drivers.length;
  const assignedDriverIds = new Set(vehicles.filter(v => v.currentDriverId).map(v => v.currentDriverId));
  const unassignedDrivers = drivers.filter(d => !assignedDriverIds.has(d.id)).length;

  const pendingTransfers = transfers.filter(t => t.status === 'Pending').length;
  const inTransitTransfers = transfers.filter(t => t.status === 'InTransit').length;


  // Vehicle status for pie
  const statusCounts = {};
  vehicles.forEach(v => {
    const label = VEHICLE_STATUS_VI[v.status] || v.status;
    statusCounts[label] = (statusCounts[label] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([type, value]) => ({ type, value }));

  // Transfer status for pie
  const transferStatusCounts = {};
  transfers.forEach(t => {
    const label = TRANSFER_STATUS_VI[t.status] || t.status;
    transferStatusCounts[label] = (transferStatusCounts[label] || 0) + 1;
  });
  const transferPieData = Object.entries(transferStatusCounts).map(([type, value]) => ({ type, value }));
  const transferColors = { 'Chờ thực hiện': '#faad14', 'Đang di chuyển': '#1677ff', 'Hoàn thành': '#52c41a', 'Đã huỷ': '#d9d9d9' };

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<CarOutlined />} title="Tổng xe chi nhánh" value={vehicles.length} color="#1677ff" onClick={() => navigate('/vehicles')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<CheckCircleOutlined />} title="Xe sẵn sàng" value={available} color="#52c41a" loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<TeamOutlined />} title="Tổng tài xế" value={totalDrivers} color="#13c2c2" onClick={() => navigate('/drivers')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<ExclamationCircleOutlined />} title="Tài xế chưa gán xe" value={unassignedDrivers} color="#fa8c16" loading={loading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<ThunderboltOutlined />} title="Xe đã phân công" value={assigned} color="#1677ff" onClick={() => navigate('/vehicles/assignment')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<ToolOutlined />} title="Xe đang bảo trì" value={inMaint} color="#faad14" loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<SwapOutlined />} title="Điều chuyển chờ" value={pendingTransfers} color="#722ed1" onClick={() => navigate('/distribution')} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard icon={<ClockCircleOutlined />} title="Đang vận chuyển" value={inTransitTransfers} color="#2f54eb" onClick={() => navigate('/distribution')} loading={loading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title={<><CarOutlined style={{ color: '#1677ff', marginRight: 8 }} />Xe theo trạng thái</>} style={{ borderRadius: 14, height: '100%' }}>
            {pieData.length > 0 ? (
              <Pie
                data={pieData}
                angleField="value"
                colorField="type"
                innerRadius={0.6}
                radius={0.9}
                height={280}
                color={({ type }) => VEHICLE_STATUS_COLOR_MAP[type] || '#8c8c8c'}
                label={{ text: 'value', style: { fontWeight: 600, fontSize: 14 } }}
                legend={{ color: { position: 'bottom', layout: { justifyContent: 'center' } } }}
                annotations={[{
                  type: 'text',
                  style: { text: `${vehicles.length}`, x: '50%', y: '50%', textAlign: 'center', fontSize: 28, fontWeight: 700, fill: '#262626' },
                }, {
                  type: 'text',
                  style: { text: 'Tổng xe', x: '50%', y: '57%', textAlign: 'center', fontSize: 13, fill: '#8c8c8c' },
                }]}
              />
            ) : <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>Chưa có dữ liệu</div>}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<><SwapOutlined style={{ color: '#722ed1', marginRight: 8 }} />Điều chuyển theo trạng thái</>} style={{ borderRadius: 14, height: '100%' }}>
            {transferPieData.length > 0 ? (
              <Pie
                data={transferPieData}
                angleField="value"
                colorField="type"
                innerRadius={0.6}
                radius={0.9}
                height={280}
                color={({ type }) => transferColors[type] || '#8c8c8c'}
                label={{ text: 'value', style: { fontWeight: 600, fontSize: 14 } }}
                legend={{ color: { position: 'bottom', layout: { justifyContent: 'center' } } }}
                annotations={[{
                  type: 'text',
                  style: { text: `${transfers.length}`, x: '50%', y: '50%', textAlign: 'center', fontSize: 28, fontWeight: 700, fill: '#262626' },
                }, {
                  type: 'text',
                  style: { text: 'Tổng', x: '50%', y: '57%', textAlign: 'center', fontSize: 13, fill: '#8c8c8c' },
                }]}
              />
            ) : <div style={{ textAlign: 'center', padding: 40, color: '#bbb' }}>Chưa có dữ liệu</div>}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={<><SwapOutlined style={{ color: '#722ed1', marginRight: 8 }} />Điều chuyển gần đây</>} style={{ borderRadius: 14 }}>
            <Table
              dataSource={transfers.filter(t => t.status !== 'Cancelled').slice(0, 5)} rowKey="id" pagination={false} size="small"
              columns={[
                { title: 'Mã', dataIndex: 'id', render: id => `#${id}`, width: 60 },
                { title: 'Biển số', dataIndex: 'licensePlate', render: v => <strong>{v || '—'}</strong> },
                { title: 'Lộ trình', key: 'route', render: (_, r) => `${r.fromBranchName || '—'} → ${r.toBranchName || '—'}` },
                { title: 'TT', dataIndex: 'status', render: s => <Tag color={TRANSFER_STATUS_COLOR[s]}>{TRANSFER_STATUS_VI[s] || s}</Tag> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<><ToolOutlined style={{ color: '#faad14', marginRight: 8 }} />Bảo trì chờ duyệt</>} style={{ borderRadius: 14 }}>
            <Table
              dataSource={maintenance.filter(m => m.status === 'Pending').slice(0, 5)} rowKey="id" pagination={false} size="small"
              columns={[
                { title: 'Mã', dataIndex: 'id', render: id => `#${id}`, width: 60 },
                { title: 'Loại', dataIndex: 'maintenanceType', render: v => TYPE_VI[v] || v },
                { title: 'Chi phí', dataIndex: 'estimatedCost', render: v => v ? `${fmtMoney(v)} đ` : '—' },
                { title: 'TT', dataIndex: 'status', render: s => <Tag color={STATUS_COLOR[s]}>{STATUS_VI[s] || s}</Tag> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Dashboard Entry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function DashboardPage() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    vehicles: [], maintenance: [], transfers: [], pending: [], proposals: [], stock: [], drivers: [],
  });

  const isExec = roles.includes('Executive Management');
  const isAccountant = roles.includes('Branch Asset Accountant');
  const isOperator = roles.includes('Operator');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const promises = [
          vehicleApi.getList(),
          maintenanceApi.getList(),
          distributionApi.getTransfers(),
        ];

        // Role-specific API calls
        if (isExec) {
          promises.push(pendingApi.getList());
          promises.push(proposalApi.getList());
          promises.push(distributionApi.getStock());
        } else if (isAccountant) {
          promises.push(Promise.resolve({ data: [] }));   // pending placeholder
          promises.push(proposalApi.getList());
          promises.push(Promise.resolve({ data: [] }));   // stock placeholder
        } else {
          promises.push(Promise.resolve({ data: [] }));
          promises.push(Promise.resolve({ data: [] }));
          promises.push(Promise.resolve({ data: [] }));
        }

        if (isOperator) {
          promises.push(driverApi.getList());
        } else {
          promises.push(Promise.resolve({ data: [] }));
        }

        const results = await Promise.allSettled(promises);
        const extract = (r) => {
          if (r.status !== 'fulfilled') return [];
          const d = r.value.data;
          return d?.data || d || [];
        };

        setData({
          vehicles: extract(results[0]),
          maintenance: extract(results[1]),
          transfers: extract(results[2]),
          pending: extract(results[3]),
          proposals: extract(results[4]),
          stock: extract(results[5]),
          drivers: extract(results[6]),
        });
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine greeting
  const hour = dayjs().hour();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const roleName = isExec ? 'Ban Giám đốc' : isAccountant ? 'Kế toán Chi nhánh' : isOperator ? 'Điều hành viên' : '';

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {greeting}, {user?.fullName || user?.email || 'User'} 👋
        </Typography.Title>
        <Typography.Text type="secondary">
          {roleName && <Tag color="blue" style={{ marginRight: 8 }}>{roleName}</Tag>}
          {dayjs().format('dddd, DD/MM/YYYY')}
        </Typography.Text>
      </div>

      {loading && !data.vehicles.length ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : isExec ? (
        <ExecDashboard {...data} loading={loading} />
      ) : isAccountant ? (
        <AccountantDashboard {...data} loading={loading} />
      ) : isOperator ? (
        <OperatorDashboard {...data} loading={loading} />
      ) : (
        <ExecDashboard {...data} loading={loading} />
      )}
    </div>
  );
}
