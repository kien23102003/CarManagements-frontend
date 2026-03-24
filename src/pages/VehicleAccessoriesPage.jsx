import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App, Button, Card, DatePicker, Empty, Form, Input, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import accessoryApi from '../api/accessoryApi';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../services/AuthContext';
import {
  VEHICLE_ACCESSORY_STATUS_META,
  canIssueAccessory,
  canReadAccessoryModule,
  canViewAccessoryAcrossBranches,
  unwrapData,
} from '../services/accessoryHelpers';

export default function VehicleAccessoriesPage() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canReadAccessoryModule(roles), [roles]);
  const writable = useMemo(() => canIssueAccessory(roles), [roles]);
  const canViewAcrossBranches = useMemo(() => canViewAccessoryAcrossBranches(roles), [roles]);

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [activeOnly, setActiveOnly] = useState(false);
  const [requirementCheck, setRequirementCheck] = useState(null);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [actionForm] = Form.useForm();

  useEffect(() => {
    const loadVehicle = async () => {
      try {
        const { data } = await vehicleApi.getById(vehicleId);
        setVehicle(unwrapData(data));
      } catch {
        setVehicle(null);
      }
    };

    loadVehicle();
  }, [vehicleId]);

  useEffect(() => {
    if (!readable) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [accessoryRes, requirementRes] = await Promise.all([
          accessoryApi.getVehicleAccessories(vehicleId, activeOnly),
          accessoryApi.checkVehicleAccessoryRequirements(vehicleId),
        ]);
        setItems(unwrapData(accessoryRes.data));
        setRequirementCheck(unwrapData(requirementRes.data));
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải danh sách phụ kiện của xe');
        setItems([]);
        setRequirementCheck(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeOnly, message, readable, vehicleId]);

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
    if (!selectedRecord) {
      return;
    }

    try {
      const values = await actionForm.validateFields();
      setActionLoading(true);
      await accessoryApi.returnVehicleAccessory(selectedRecord.id, {
        actionType: values.actionType,
        removeDate: values.removeDate ? values.removeDate.format('YYYY-MM-DD') : null,
        notes: values.notes,
      });
      message.success('Cập nhật trạng thái phụ kiện thành công');
      setActionOpen(false);
      setSelectedRecord(null);

      const [accessoryRes, requirementRes] = await Promise.all([
        accessoryApi.getVehicleAccessories(vehicleId, activeOnly),
        accessoryApi.checkVehicleAccessoryRequirements(vehicleId),
      ]);
      setItems(unwrapData(accessoryRes.data));
      setRequirementCheck(unwrapData(requirementRes.data));
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error.response?.data?.message || 'Xử lý phụ kiện thất bại');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { title: 'Phụ kiện', dataIndex: 'accessoryName', key: 'accessoryName' },
    { title: 'Mã', dataIndex: 'accessoryCode', key: 'accessoryCode', width: 120, render: (value) => value || '-' },
    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value) => {
        const meta = VEHICLE_ACCESSORY_STATUS_META[value] || { label: value, color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: 'Ngày lắp', dataIndex: 'installDate', key: 'installDate', width: 130, render: (value) => value || '-' },
    { title: 'Ngày tháo', dataIndex: 'removeDate', key: 'removeDate', width: 130, render: (value) => value || '-' },
    {
      title: 'Người lắp',
      key: 'installedBy',
      width: 160,
      render: (_, record) => record.installedByName || record.installedBy || '-',
    },
    {
      title: 'Người tháo',
      key: 'removedBy',
      width: 160,
      render: (_, record) => record.removedByName || record.removedBy || '-',
    },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', render: (value) => value || '-' },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 250,
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

  if (canViewAcrossBranches) {
    columns.splice(2, 0, {
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 180,
      render: (value) => value || '-',
    });
  }

  const requirementItems = requirementCheck?.items || [];

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
        <Button onClick={() => navigate(`/accessories/issue?vehicleId=${vehicleId}`)}>Cấp phát phụ kiện</Button>
      </div>

      {requirementCheck && (
        <Card title="Định mức phụ kiện trên xe" style={{ marginBottom: 12 }}>
          {requirementItems.length > 0 ? (
            <Table
              rowKey="accessoryId"
              pagination={false}
              size="small"
              dataSource={requirementItems}
              columns={[
                { title: 'Phụ kiện', dataIndex: 'accessoryName', key: 'accessoryName' },
                { title: 'Mã', dataIndex: 'accessoryCode', key: 'accessoryCode', width: 120 },
                { title: 'Cần có', dataIndex: 'requiredQuantity', key: 'requiredQuantity', width: 100 },
                { title: 'Đang gắn', dataIndex: 'installedQuantity', key: 'installedQuantity', width: 100 },
                { title: 'Thiếu', dataIndex: 'missingQuantity', key: 'missingQuantity', width: 100 },
                {
                  title: 'Bắt buộc',
                  dataIndex: 'isMandatory',
                  key: 'isMandatory',
                  width: 100,
                  render: (value) => <Tag color={value ? 'red' : 'default'}>{value ? 'Có' : 'Không'}</Tag>,
                },
                {
                  title: 'Kết quả',
                  dataIndex: 'isSatisfied',
                  key: 'isSatisfied',
                  width: 120,
                  render: (value) => <Tag color={value ? 'green' : 'orange'}>{value ? 'Đủ' : 'Thiếu'}</Tag>,
                },
              ]}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                requirementCheck.modelName
                  ? `Chưa có định mức phụ kiện cho loại xe ${requirementCheck.modelName}.`
                  : 'Xe này chưa có dữ liệu định mức phụ kiện.'
              }
            />
          )}
        </Card>
      )}

      <Card style={{ marginBottom: 12 }}>
        <Space>
          <Switch checked={activeOnly} onChange={setActiveOnly} />
          <span>Chỉ hiển thị phụ kiện đang gắn</span>
        </Space>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        columns={columns}
        scroll={{ x: 1400 }}
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
