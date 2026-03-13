import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Space, Table, Tag, message } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import disposalProposalApi from '../api/disposalProposalApi';
import { useAuth } from '../services/AuthContext';

const STATUS_META = {
  Pending: { label: 'Chờ duyệt', color: 'orange' },
  Approved: { label: 'Đã duyệt', color: 'green' },
  Rejected: { label: 'Từ chối', color: 'red' },
};

const unwrapData = (res) => res?.data?.data || res?.data || [];
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.Message || fallback;

export default function VehicleDisposalHistoryPage() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const canCreate = useMemo(() => roles.includes('Operator'), [roles]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await disposalProposalApi.getVehicleHistory(vehicleId);
      const list = unwrapData(res);
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể tải lịch sử đề xuất thanh lý'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [vehicleId]);

  const columns = [
    {
      title: 'Ngày tạo',
      dataIndex: 'createdDate',
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Giá đề xuất',
      dataIndex: 'proposedPrice',
      render: (v) => (v == null ? '-' : `${Number(v).toLocaleString('vi-VN')} đ`),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => {
        const meta = STATUS_META[status] || { label: status || '-', color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      render: (v) => v || '-',
    },
    {
      title: 'Người đề xuất',
      dataIndex: 'proposerName',
      render: (v) => v || '-',
    },
    {
      title: 'Người duyệt',
      dataIndex: 'managerName',
      render: (v) => v || '-',
    },
    {
      title: 'Ngày duyệt',
      dataIndex: 'approvedDate',
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/vehicles/${vehicleId}`)}>
          Quay lại xe
        </Button>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate(`/disposal-proposals/new?vehicleId=${vehicleId}`)}
          >
            Tạo đề xuất
          </Button>
        )}
      </Space>

      <Card title={`Lịch sử thanh lý xe #${vehicleId}`}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>
    </div>
  );
}
