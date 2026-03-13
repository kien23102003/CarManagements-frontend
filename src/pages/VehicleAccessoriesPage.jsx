import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { ArrowLeftOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import accessoryApi from '../api/accessoryApi';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../services/AuthContext';

const canWrite = (roles) =>
  roles.includes('Operator') || roles.includes('Executive Management');

const canRead = (roles) =>
  roles.includes('Operator') ||
  roles.includes('Executive Management') ||
  roles.includes('Branch Asset Accountant');

const STATUS_COLORS = {
  Installed: 'blue',
  Returned: 'green',
  Damaged: 'red',
  Lost: 'volcano',
  Removed: 'default',
};

export default function VehicleAccessoriesPage() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canRead(roles), [roles]);
  const writable = useMemo(() => canWrite(roles), [roles]);

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [activeOnly, setActiveOnly] = useState(false);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [actionForm] = Form.useForm();

  const loadVehicle = async () => {
    try {
      const { data } = await vehicleApi.getById(vehicleId);
      setVehicle(data.data || data);
    } catch {
      setVehicle(null);
    }
  };

  const loadAccessories = async () => {
    if (!readable) return;
    setLoading(true);
    try {
      const { data } = await accessoryApi.getVehicleAccessories(vehicleId, activeOnly);
      setItems(data.data || data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách phụ kiện của xe');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicle();
  }, [vehicleId]);

  useEffect(() => {
    loadAccessories();
  }, [vehicleId, activeOnly, readable]);

  const openActionModal = (record, actionType) => {
    setSelectedRecord(record);
    actionForm.setFieldsValue({
      actionType,
      removeDate: dayjs(),
      notes: '',
    });
    setActionOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRecord) return;
    try {
      const values = await actionForm.validateFields();
      setActionLoading(true);
      await accessoryApi.returnVehicleAccessory(selectedRecord.id, {
        actionType: values.actionType,
        removeDate: values.removeDate ? values.removeDate.format('YYYY-MM-DD') : null,
        notes: values.notes,
      });
      message.success('Xử lý thành công');
      setActionOpen(false);
      setSelectedRecord(null);
      loadAccessories();
    } catch (err) {
      if (!err?.errorFields) {
        message.error(err.response?.data?.message || 'Xử lý thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { title: 'Phụ kiện', dataIndex: 'accessoryName', key: 'accessoryName' },
    { title: 'Mã', dataIndex: 'accessoryCode', key: 'accessoryCode', width: 120, render: (v) => v || '-' },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: 'Ngày lắp', dataIndex: 'installDate', key: 'installDate', width: 130, render: (v) => v || '-' },
    { title: 'Ngày tháo', dataIndex: 'removeDate', key: 'removeDate', width: 130, render: (v) => v || '-' },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', render: (v) => v || '-' },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 260,
      render: (_, record) => {
        const canAct = writable && record.status === 'Installed';
        return (
          <Space>
            <Button size="small" disabled={!canAct} onClick={() => openActionModal(record, 'RETURN')}>
              Thu hồi
            </Button>
            <Button size="small" danger disabled={!canAct} onClick={() => openActionModal(record, 'DAMAGED')}>
              Hỏng
            </Button>
            <Button size="small" danger disabled={!canAct} onClick={() => openActionModal(record, 'LOST')}>
              Mất
            </Button>
          </Space>
        );
      },
    },
  ];

  if (!readable) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles')} style={{ marginBottom: 12 }}>
        Quay lại
      </Button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>
          Phụ kiện theo xe {vehicle ? `- ${vehicle.licensePlate || vehicle.id}` : ''}
        </h2>
        <Button onClick={() => navigate(`/accessories/issue?vehicleId=${vehicleId}`)}>
          Cấp phát phụ kiện
        </Button>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <Space>
          <Switch checked={activeOnly} onChange={setActiveOnly} />
          <span>Chỉ hiển thị đang gắn (Installed)</span>
        </Space>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <Modal
        title="Xử lý trạng thái phụ kiện"
        open={actionOpen}
        onCancel={() => setActionOpen(false)}
        onOk={handleAction}
        okButtonProps={{ loading: actionLoading }}
        okText="Xác nhận"
      >
        <Form form={actionForm} layout="vertical">
          <Form.Item name="actionType" label="Loại xử lý" rules={[{ required: true, message: 'Vui lòng chọn loại xử lý' }]}>
            <Select
              options={[
                { value: 'RETURN', label: 'RETURN - Thu hồi' },
                { value: 'DAMAGED', label: 'DAMAGED - Hỏng' },
                { value: 'LOST', label: 'LOST - Mất' },
              ]}
            />
          </Form.Item>
          <Form.Item name="removeDate" label="Ngày tháo">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
