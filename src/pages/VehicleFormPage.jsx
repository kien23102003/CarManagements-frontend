import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import vehicleApi from '../api/vehicleApi';
import disposalProposalApi from '../api/disposalProposalApi';
import { useAuth } from '../services/AuthContext';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Spin,
  message,
  Tooltip,
  Table,
  Tag,
  Space,
} from 'antd';
import { ArrowLeftOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const ROLE_FIELDS = {
  'Executive Management': ['status', 'currentDriverId'],
  'Branch Asset Accountant': ['originalCost', 'currentValue'],
  Operator: ['mileage', 'status', 'currentDriverId'],
};

const DISPOSAL_STATUS_META = {
  Pending: { label: 'Chờ duyệt', color: 'orange' },
  Approved: { label: 'Đã duyệt', color: 'green' },
  Rejected: { label: 'Từ chối', color: 'red' },
};

const isDisposedStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'disposed' || normalized === 'liquidated';
};

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modelOptions, setModelOptions] = useState([]);
  const [driverOptions, setDriverOptions] = useState([]);
  const [disposalHistory, setDisposalHistory] = useState([]);
  const [disposalLoading, setDisposalLoading] = useState(false);
  const [vehicleStatus, setVehicleStatus] = useState('');

  const navigate = useNavigate();
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const canViewDisposalHistory =
    userRoles.includes('Executive Management') || userRoles.includes('Manager');

  const editableFields = new Set();
  if (!isEdit) {
    [
      'licensePlate',
      'modelId',
      'yearManufacture',
      'purchaseDate',
      'originalCost',
      'currentValue',
      'mileage',
      'status',
      'currentDriverId',
    ].forEach((f) => editableFields.add(f));
  } else {
    userRoles.forEach((role) => {
      (ROLE_FIELDS[role] || []).forEach((f) => editableFields.add(f));
    });
  }

  const isDisabled = (field) => isEdit && !editableFields.has(field);

  useEffect(() => {
    loadDropdowns();
    if (isEdit) {
      loadVehicle();
      loadDisposalHistory();
    }
  }, [id]);

  const loadDropdowns = async () => {
    try {
      const res = await vehicleApi.getList();
      const list = res.data?.data || res.data || [];
      if (!Array.isArray(list)) return;

      const modelsMap = new Map();
      list.forEach((v) => {
        if (v.modelId && !modelsMap.has(v.modelId)) {
          modelsMap.set(
            v.modelId,
            `${v.manufacturer || ''} ${v.modelName || ''}`.trim() || `Dòng xe #${v.modelId}`,
          );
        }
      });
      setModelOptions([...modelsMap.entries()].map(([modelId, name]) => ({ value: modelId, label: name })));

      const driversMap = new Map();
      list.forEach((v) => {
        if (v.currentDriverId && v.currentDriverName && !driversMap.has(v.currentDriverId)) {
          driversMap.set(v.currentDriverId, v.currentDriverName);
        }
      });
      setDriverOptions([
        { value: null, label: '-- Không có tài xế --' },
        ...[...driversMap.entries()].map(([driverId, name]) => ({ value: driverId, label: name })),
      ]);
    } catch {
      // ignore
    }
  };

  const loadVehicle = async () => {
    setLoading(true);
    try {
      const { data } = await vehicleApi.getById(id);
      const v = data.data || data;

      form.setFieldsValue({
        ...v,
        purchaseDate: v.purchaseDate ? dayjs(v.purchaseDate) : null,
      });
      setVehicleStatus(v.status || '');

      if (v.currentDriverId && v.currentDriverName) {
        setDriverOptions((prev) => {
          if (prev.some((o) => o.value === v.currentDriverId)) return prev;
          return [...prev, { value: v.currentDriverId, label: v.currentDriverName }];
        });
      }
    } catch {
      message.error('Không thể tải thông tin xe');
      navigate('/vehicles');
    }
    setLoading(false);
  };

  const loadDisposalHistory = async () => {
    if (!id) return;
    setDisposalLoading(true);
    try {
      const res = await disposalProposalApi.getVehicleHistory(id);
      const list = res?.data?.data || res?.data || [];
      setDisposalHistory(Array.isArray(list) ? list : []);
    } catch {
      setDisposalHistory([]);
    } finally {
      setDisposalLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
      };

      if (isEdit) {
        await vehicleApi.update(id, payload);
        message.success('Cập nhật xe thành công');
      } else {
        await vehicleApi.create(payload);
        message.success('Tạo xe mới thành công');
      }

      navigate('/vehicles');
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
    setSaving(false);
  };

  const lockIcon = <Tooltip title="Không có quyền chỉnh sửa"><LockOutlined style={{ color: '#999' }} /></Tooltip>;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  const disposalColumns = [
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
        const meta = DISPOSAL_STATUS_META[status] || { label: status || '-', color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      ellipsis: true,
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
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles')} style={{ marginBottom: 16 }}>
        Quay lại
      </Button>
      <h2>{isEdit ? 'Cập nhật xe' : 'Thêm xe mới'}</h2>
      <Card style={{ borderRadius: 12, marginTop: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: 'Active' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Form.Item name="licensePlate" label="Biển số xe" rules={[{ required: true, message: 'Vui lòng nhập biển số' }]}>
              <Input placeholder="51A-12345" disabled={isDisabled('licensePlate')} suffix={isDisabled('licensePlate') ? lockIcon : null} />
            </Form.Item>
            <Form.Item name="modelId" label={<span>Dòng xe {isDisabled('modelId') ? lockIcon : null}</span>}>
              <Select placeholder="Chọn dòng xe" disabled={isDisabled('modelId')} showSearch optionFilterProp="label" options={modelOptions} allowClear />
            </Form.Item>
            <Form.Item name="yearManufacture" label="Năm sản xuất">
              <InputNumber placeholder="2024" style={{ width: '100%' }} disabled={isDisabled('yearManufacture')} />
            </Form.Item>
            <Form.Item name="purchaseDate" label="Ngày mua">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Chọn ngày" disabled={isDisabled('purchaseDate')} />
            </Form.Item>
            <Form.Item name="originalCost" label={<span>Giá gốc (VND) {isDisabled('originalCost') ? lockIcon : null}</span>}>
              <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="0" disabled={isDisabled('originalCost')} />
            </Form.Item>
            <Form.Item name="currentValue" label={<span>Giá trị hiện tại (VND) {isDisabled('currentValue') ? lockIcon : null}</span>}>
              <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="0" disabled={isDisabled('currentValue')} />
            </Form.Item>
            <Form.Item name="mileage" label={<span>Số km {isDisabled('mileage') ? lockIcon : null}</span>}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" disabled={isDisabled('mileage')} />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái">
              <Select
                disabled={isDisabled('status')}
                options={[
                  { value: 'Active', label: 'Hoạt động' },
                  { value: 'Maintenance', label: 'Đang bảo trì' },
                  { value: 'InTransfer', label: 'Đang điều chuyển' },
                  { value: 'Disposed', label: 'Đã thanh lý' },
                ]}
              />
            </Form.Item>
            <Form.Item name="currentDriverId" label={<span>Tài xế {isDisabled('currentDriverId') ? lockIcon : null}</span>}>
              <Select placeholder="Chọn tài xế" disabled={isDisabled('currentDriverId')} showSearch optionFilterProp="label" options={driverOptions} allowClear />
            </Form.Item>
          </div>

          {isEdit && editableFields.size === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: '16px 0', borderTop: '1px solid #f0f0f0' }}>
              Bạn không có quyền chỉnh sửa thông tin xe này.
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <Button onClick={() => navigate('/vehicles')}>Huỷ</Button>
              <Button type="primary" htmlType="submit" loading={saving}>{isEdit ? 'Cập nhật' : 'Tạo mới'}</Button>
            </div>
          )}
        </Form>
      </Card>

      {isEdit && canViewDisposalHistory && (
        <Card
          title="Lịch sử đề xuất thanh lý"
          style={{ borderRadius: 12, marginTop: 16 }}
          extra={(
            <Space>
              {isDisposedStatus(vehicleStatus) && <Tag color="red">Xe đã thanh lý</Tag>}
              <Button onClick={() => navigate(`/vehicles/${id}/disposal-proposals`)}>Xem toàn bộ</Button>
            </Space>
          )}
        >
          <Table
            rowKey="id"
            size="small"
            loading={disposalLoading}
            columns={disposalColumns}
            dataSource={disposalHistory.slice(0, 5)}
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
}
