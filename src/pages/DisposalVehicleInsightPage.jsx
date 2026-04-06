import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd';
import { ArrowLeftOutlined, ToolOutlined } from '@ant-design/icons';
import vehicleApi from '../api/vehicleApi';
import maintenanceApi from '../api/maintenanceApi';
import { getTripHistoryByVehicle } from '../services/tripLogService';

const unwrapData = (res) => res?.data?.data || res?.data || [];
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.Message || fallback;

const STATUS_META = {
  Active: { label: 'Hoạt động', color: 'green' },
  Maintenance: { label: 'Đang bảo trì', color: 'orange' },
  InTransfer: { label: 'Đang điều chuyển', color: 'blue' },
  Disposed: { label: 'Đã thanh lý', color: 'red' },
  Liquidated: { label: 'Đã thanh lý', color: 'red' },
};

const MAINTENANCE_STATUS_META = {
  Pending: { label: 'Chờ duyệt', color: 'orange' },
  Approved: { label: 'Đã duyệt', color: 'green' },
  Rejected: { label: 'Từ chối', color: 'red' },
  InProgress: { label: 'Đang thực hiện', color: 'blue' },
  Completed: { label: 'Hoàn thành', color: 'cyan' },
};

const MAINTENANCE_TYPE_LABELS = {
  Periodic: 'Định kỳ',
  Breakdown: 'Sửa chữa / hỏng hóc',
  Routine: 'Định kỳ',
  Emergency: 'Sửa chữa / hỏng hóc',
  Repair: 'Sửa chữa / hỏng hóc',
};

const money = (value) => (value == null ? '-' : `${Number(value).toLocaleString('vi-VN')} đ`);
const km = (value) => (value == null ? '-' : `${Number(value).toLocaleString('vi-VN')} km`);

const getVehicleStatusMeta = (status) => STATUS_META[status] || { label: status || '-', color: 'default' };

export default function DisposalVehicleInsightPage() {
  const { vehicleId: vehicleIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vehicleId = Number(vehicleIdParam || searchParams.get('vehicleId'));
  const proposalId = searchParams.get('proposalId');

  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      if (!vehicleId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [vehicleRes, maintenanceRes, tripRes] = await Promise.all([
          vehicleApi.getById(vehicleId),
          maintenanceApi.getList({ vehicleId }),
          getTripHistoryByVehicle(vehicleId),
        ]);

        setVehicle(unwrapData(vehicleRes));
        setMaintenanceHistory(Array.isArray(unwrapData(maintenanceRes)) ? unwrapData(maintenanceRes) : []);

        const tripPayload = tripRes?.data || tripRes || {};
        const tripItems = Array.isArray(tripPayload?.trips)
          ? tripPayload.trips
          : Array.isArray(tripPayload?.Trips)
            ? tripPayload.Trips
            : Array.isArray(tripPayload)
              ? tripPayload
              : [];
        setTripHistory(tripItems);
      } catch (err) {
        message.error(getErrorMessage(err, 'Không thể tải thông tin phục vụ thanh lý'));
        setVehicle(null);
        setMaintenanceHistory([]);
        setTripHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [vehicleId]);

  const totalTripDistance = useMemo(
    () =>
      tripHistory.reduce((sum, item) => {
        const start = Number(item.startMileage);
        const end = Number(item.endMileage);
        if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
          return sum + (end - start);
        }
        return sum;
      }, 0),
    [tripHistory],
  );

  const completedMaintenanceCount = useMemo(
    () => maintenanceHistory.filter((item) => item.status === 'Completed').length,
    [maintenanceHistory],
  );

  const totalMaintenanceCost = useMemo(
    () =>
      maintenanceHistory.reduce((sum, item) => {
        const cost = Number(item.actualCost ?? item.estimatedCost ?? 0);
        return Number.isFinite(cost) ? sum + cost : sum;
      }, 0),
    [maintenanceHistory],
  );

  const maintenanceColumns = [
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'requestDate',
      width: 120,
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Loại sửa chữa',
      dataIndex: 'maintenanceType',
      width: 180,
      render: (value) => MAINTENANCE_TYPE_LABELS[value] || value || '-',
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      render: (value) => value || '-',
      ellipsis: true,
    },
    {
      title: 'Chi phí',
      key: 'cost',
      width: 180,
      render: (_, record) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>Dự tính: {money(record.estimatedCost)}</div>
          <div>Thực tế: {money(record.actualCost)}</div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (status) => {
        const meta = MAINTENANCE_STATUS_META[status] || { label: status || '-', color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Hoàn thành',
      dataIndex: 'completionDate',
      width: 130,
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '-'),
    },
  ];

  const tripColumns = [
    {
      title: 'Bắt đầu',
      dataIndex: 'startTime',
      width: 160,
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Kết thúc',
      dataIndex: 'endTime',
      width: 160,
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Tài xế',
      dataIndex: 'driverName',
      width: 160,
      render: (value) => value || '-',
    },
    {
      title: 'Lộ trình',
      key: 'route',
      render: (_, record) => `${record.origin || '-'} -> ${record.destination || '-'}`,
    },
    {
      title: 'Km đi',
      key: 'distance',
      width: 140,
      render: (_, record) => {
        const start = Number(record.startMileage);
        const end = Number(record.endMileage);
        if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
          return km(end - start);
        }
        return '-';
      },
    },
    {
      title: 'Công tơ mét',
      key: 'mileage',
      width: 180,
      render: (_, record) => `${km(record.startMileage)} -> ${km(record.endMileage)}`,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!vehicleId || !vehicle) {
    return <Card>Không tìm thấy thông tin xe cần xem.</Card>;
  }

  const statusMeta = getVehicleStatusMeta(vehicle.status);
  const backPath = proposalId
    ? `/disposal-proposals/${proposalId}`
    : `/disposal-proposals/new?vehicleId=${vehicleId}`;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }} onClick={() => navigate(backPath)}>
        Quay lại
      </Button>

      <Card
        title="Thông tin xe phục vụ đề xuất thanh lý"
        extra={<Tag color={statusMeta.color}>{statusMeta.label}</Tag>}
        style={{ marginBottom: 16 }}
      >
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Mã xe">{vehicle.id || '-'}</Descriptions.Item>
          <Descriptions.Item label="Biển số">{vehicle.licensePlate || '-'}</Descriptions.Item>
          <Descriptions.Item label="Dòng xe">
            {[vehicle.manufacturer, vehicle.modelName].filter(Boolean).join(' ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Số km hiện tại">{km(vehicle.mileage)}</Descriptions.Item>
          <Descriptions.Item label="Giá trị hiện tại">{money(vehicle.currentValue)}</Descriptions.Item>
          <Descriptions.Item label="Tài xế hiện tại">{vehicle.currentDriverName || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Số km hiện tại" value={Number(vehicle.mileage || 0)} precision={0} suffix="km" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Km ghi nhận qua chuyến đi" value={totalTripDistance} precision={0} suffix="km" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Tổng chi phí sửa chữa" value={totalMaintenanceCost} precision={0} suffix="đ" />
          </Card>
        </Col>
      </Row>

      <Card
        title={(
          <Space>
            <ToolOutlined style={{ color: '#fa8c16' }} />
            <span>Lịch sử sửa chữa / bảo dưỡng</span>
          </Space>
        )}
        extra={`Đã hoàn thành: ${completedMaintenanceCount}`}
        style={{ marginBottom: 16 }}
      >
        {maintenanceHistory.length ? (
          <Table
            rowKey="id"
            columns={maintenanceColumns}
            dataSource={maintenanceHistory}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 960 }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Xe chưa có lịch sử sửa chữa / bảo dưỡng." />
        )}
      </Card>

      <Card title="Lịch sử quãng đường đã đi">
        {tripHistory.length ? (
          <Table
            rowKey="tripId"
            columns={tripColumns}
            dataSource={tripHistory}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 1080 }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu hành trình cho xe này." />
        )}
      </Card>
    </div>
  );
}
