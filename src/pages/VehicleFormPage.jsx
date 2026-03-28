import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  LockOutlined,
  PictureOutlined,
  ToolOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import vehicleApi from '../api/vehicleApi';
import disposalProposalApi from '../api/disposalProposalApi';
import accessoryApi from '../api/accessoryApi';
import maintenanceApi from '../api/maintenanceApi';
import { useAuth } from '../services/AuthContext';

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

const isDisposedStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'disposed' || normalized === 'liquidated';
};

const money = (value) => (value == null ? '-' : `${Number(value).toLocaleString('vi-VN')} VND`);

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modelOptions, setModelOptions] = useState([]);
  const [driverOptions, setDriverOptions] = useState([]);
  const [vehicleStatus, setVehicleStatus] = useState('');
  const [imageUrl, setImageUrl] = useState(null);

  const [disposalHistory, setDisposalHistory] = useState([]);
  const [disposalLoading, setDisposalLoading] = useState(false);

  const [accessoryRequirement, setAccessoryRequirement] = useState(null);
  const [accessoryRequirementLoading, setAccessoryRequirementLoading] = useState(false);

  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceDetailOpen, setMaintenanceDetailOpen] = useState(false);
  const [maintenanceDetail, setMaintenanceDetail] = useState(null);

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
    ].forEach((field) => editableFields.add(field));
  } else {
    userRoles.forEach((role) => {
      (ROLE_FIELDS[role] || []).forEach((field) => editableFields.add(field));
    });
  }

  const isDisabled = (field) => isEdit && !editableFields.has(field);
  const lockIcon = (
    <Tooltip title="Bạn không có quyền chỉnh sửa trường này">
      <LockOutlined style={{ color: '#999' }} />
    </Tooltip>
  );

  useEffect(() => {
    loadDropdowns();
    if (isEdit) {
      loadVehicle();
      loadDisposalHistory();
      loadAccessoryRequirement();
      loadMaintenanceHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDropdowns = async () => {
    try {
      const res = await vehicleApi.getList();
      const list = res.data?.data || res.data || [];
      if (!Array.isArray(list)) return;

      const modelsMap = new Map();
      const driversMap = new Map();

      list.forEach((vehicle) => {
        if (vehicle.modelId && !modelsMap.has(vehicle.modelId)) {
          modelsMap.set(
            vehicle.modelId,
            `${vehicle.manufacturer || ''} ${vehicle.modelName || ''}`.trim() || `Dòng xe #${vehicle.modelId}`,
          );
        }

        if (
          vehicle.currentDriverId &&
          vehicle.currentDriverName &&
          !driversMap.has(vehicle.currentDriverId)
        ) {
          driversMap.set(vehicle.currentDriverId, vehicle.currentDriverName);
        }
      });

      setModelOptions(
        [...modelsMap.entries()].map(([value, label]) => ({ value, label })),
      );
      setDriverOptions(
        [...driversMap.entries()].map(([value, label]) => ({ value, label })),
      );
    } catch {
      // ignore
    }
  };

  const loadVehicle = async () => {
    setLoading(true);
    try {
      const { data } = await vehicleApi.getById(id);
      const vehicle = data.data || data;

      form.setFieldsValue({
        ...vehicle,
        purchaseDate: vehicle.purchaseDate ? dayjs(vehicle.purchaseDate) : null,
      });
      setVehicleStatus(vehicle.status || '');

      try {
        const imgRes = await vehicleApi.getImage(id);
        setImageUrl(imgRes.data?.imageUrl || null);
      } catch {
        setImageUrl(null);
      }

      if (vehicle.currentDriverId && vehicle.currentDriverName) {
        setDriverOptions((prev) => {
          if (prev.some((item) => item.value === vehicle.currentDriverId)) return prev;
          return [...prev, { value: vehicle.currentDriverId, label: vehicle.currentDriverName }];
        });
      }
    } catch {
      message.error('Không thể tải thông tin xe');
      navigate('/vehicles');
    } finally {
      setLoading(false);
    }
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

  const loadAccessoryRequirement = async () => {
    if (!id) return;
    setAccessoryRequirementLoading(true);
    try {
      const res = await accessoryApi.checkVehicleAccessoryRequirements(id);
      setAccessoryRequirement(res?.data?.data || res?.data || null);
    } catch {
      setAccessoryRequirement(null);
    } finally {
      setAccessoryRequirementLoading(false);
    }
  };

  const loadMaintenanceHistory = async () => {
    if (!id) return;
    setMaintenanceLoading(true);
    try {
      const res = await maintenanceApi.getList({ vehicleId: id });
      const list = res?.data?.data || res?.data || [];
      setMaintenanceHistory(Array.isArray(list) ? list : []);
    } catch {
      setMaintenanceHistory([]);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const openMaintenanceDetail = (record) => {
    setMaintenanceDetail(record);
    setMaintenanceDetailOpen(true);
  };

  const closeMaintenanceDetail = () => {
    setMaintenanceDetail(null);
    setMaintenanceDetailOpen(false);
  };

  const handleImageUpload = async (file) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Chỉ chấp nhận file JPEG, PNG, GIF, WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.error('Kích thước file tối đa 5MB');
      return;
    }

    setUploading(true);
    try {
      const { data } = await vehicleApi.uploadImage(id, file);
      setImageUrl(data.imageUrl);
      message.success('Upload ảnh thành công');
    } catch {
      message.error('Không thể upload ảnh');
    } finally {
      setUploading(false);
    }
  };

  const handleImageDelete = async () => {
    try {
      await vehicleApi.deleteImage(id);
      setImageUrl(null);
      message.success('Đã xoá ảnh');
    } catch {
      message.error('Không thể xoá ảnh');
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
        delete payload.status;
        delete payload.currentDriverId;
        await vehicleApi.update(id, payload);
        message.success('Cập nhật xe thành công');
      } else {
        await vehicleApi.create(payload);
        message.success('Tạo xe mới thành công');
      }

      navigate('/vehicles');
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const disposalColumns = [
    {
      title: 'Ngày tạo',
      dataIndex: 'createdDate',
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Giá đề xuất',
      dataIndex: 'proposedPrice',
      render: (value) => (value == null ? '-' : `${Number(value).toLocaleString('vi-VN')} VND`),
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
      render: (value) => value || '-',
      ellipsis: true,
    },
    {
      title: 'Người đề xuất',
      dataIndex: 'proposerName',
      render: (value) => value || '-',
    },
    {
      title: 'Người duyệt',
      dataIndex: 'managerName',
      render: (value) => value || '-',
    },
  ];

  const maintenanceColumns = [
    {
      title: 'Ngày yêu cầu',
      dataIndex: 'requestDate',
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '-'),
      width: 120,
    },
    {
      title: 'Loại',
      dataIndex: 'maintenanceType',
      render: (value) => MAINTENANCE_TYPE_LABELS[value] || value || '-',
      width: 160,
    },
    {
      title: 'Chi phí',
      key: 'costs',
      width: 220,
      render: (_, record) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>
            <strong>Dự tính:</strong> {money(record.estimatedCost)}
          </div>
          <div>
            <strong>Thực tế:</strong> {money(record.actualCost)}
          </div>
        </div>
      ),
    },
    {
      title: 'Ngày hoàn thành',
      dataIndex: 'completionDate',
      render: (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '-'),
      width: 130,
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
      title: 'Chi tiết',
      key: 'detail',
      width: 120,
      render: (_, record) => (
        <Button size="small" onClick={() => openMaintenanceDetail(record)}>
          Xem chi tiết
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/vehicles')}
        style={{ marginBottom: 16 }}
      >
        Quay lại
      </Button>

      <h2>{isEdit ? 'Cập nhật xe' : 'Thêm xe mới'}</h2>

      <Card style={{ borderRadius: 12, marginTop: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: 'Active' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            <Form.Item
              name="licensePlate"
              label="Biển số xe"
              rules={[{ required: true, message: 'Vui lòng nhập biển số' }]}
            >
              <Input
                placeholder="51A-12345"
                disabled={isDisabled('licensePlate')}
                suffix={isDisabled('licensePlate') ? lockIcon : null}
              />
            </Form.Item>

            <Form.Item name="modelId" label={<span>Dòng xe {isDisabled('modelId') ? lockIcon : null}</span>}>
              <Select
                placeholder="Chọn dòng xe"
                disabled={isDisabled('modelId')}
                showSearch
                optionFilterProp="label"
                options={modelOptions}
                allowClear
              />
            </Form.Item>

            <Form.Item name="yearManufacture" label="Năm sản xuất">
              <InputNumber
                placeholder="2024"
                style={{ width: '100%' }}
                disabled={isDisabled('yearManufacture')}
              />
            </Form.Item>

            <Form.Item name="purchaseDate" label="Ngày mua">
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                placeholder="Chọn ngày"
                disabled={isDisabled('purchaseDate')}
              />
            </Form.Item>

            <Form.Item
              name="originalCost"
              label={<span>Giá gốc (VND) {isDisabled('originalCost') ? lockIcon : null}</span>}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                placeholder="0"
                disabled={isDisabled('originalCost')}
              />
            </Form.Item>

            <Form.Item
              name="currentValue"
              label={<span>Giá trị hiện tại (VND) {isDisabled('currentValue') ? lockIcon : null}</span>}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                placeholder="0"
                disabled={isDisabled('currentValue')}
              />
            </Form.Item>

            <Form.Item name="mileage" label={<span>Số km {isDisabled('mileage') ? lockIcon : null}</span>}>
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0"
                disabled={isDisabled('mileage')}
              />
            </Form.Item>

            <Form.Item name="status" label="Trạng thái" hidden={isEdit}>
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

            <Form.Item
              name="currentDriverId"
              label={<span>Tài xế {isDisabled('currentDriverId') ? lockIcon : null}</span>}
              hidden={isEdit}
            >
              <Select
                placeholder="Chọn tài xế"
                disabled={isDisabled('currentDriverId')}
                showSearch
                optionFilterProp="label"
                options={driverOptions}
                allowClear
              />
            </Form.Item>
          </div>

          {isEdit && editableFields.size === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#999',
                padding: '16px 0',
                borderTop: '1px solid #f0f0f0',
              }}
            >
              Bạn không có quyền chỉnh sửa thông tin xe này.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                borderTop: '1px solid #f0f0f0',
                paddingTop: 16,
              }}
            >
              <Button onClick={() => navigate('/vehicles')}>Huỷ</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                {isEdit ? 'Cập nhật' : 'Tạo mới'}
              </Button>
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
              <Button onClick={() => navigate(`/vehicles/${id}/disposal-proposals`)}>
                Xem toàn bộ
              </Button>
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

      {isEdit && (
        <Card
          title={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ToolOutlined style={{ color: '#fa8c16' }} />
              <span>Lịch sử bảo trì</span>
            </div>
          )}
          style={{ borderRadius: 12, marginTop: 16 }}
          extra={<Button onClick={() => navigate('/maintenance')}>Xem toàn bộ</Button>}
        >
          {maintenanceHistory.length ? (
            <Table
              rowKey="id"
              size="small"
              loading={maintenanceLoading}
              columns={maintenanceColumns}
              dataSource={maintenanceHistory.slice(0, 5)}
              pagination={false}
              scroll={{ x: 920 }}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={maintenanceLoading ? 'Đang tải lịch sử bảo trì...' : 'Xe này chưa có lịch sử bảo trì.'}
            />
          )}
        </Card>
      )}

      <Modal
        open={maintenanceDetailOpen}
        title="Chi tiết bảo trì"
        footer={null}
        onCancel={closeMaintenanceDetail}
        width={720}
      >
        {maintenanceDetail && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              <div>
                <strong>Loại:</strong>{' '}
                {MAINTENANCE_TYPE_LABELS[maintenanceDetail.maintenanceType] ||
                  maintenanceDetail.maintenanceType ||
                  '-'}
              </div>
              <div>
                <strong>Trạng thái:</strong>{' '}
                {MAINTENANCE_STATUS_META[maintenanceDetail.status]?.label ||
                  maintenanceDetail.status ||
                  '-'}
              </div>
              <div>
                <strong>Ngày yêu cầu:</strong>{' '}
                {maintenanceDetail.requestDate
                  ? dayjs(maintenanceDetail.requestDate).format('DD/MM/YYYY')
                  : '-'}
              </div>
              <div>
                <strong>Ngày hoàn thành:</strong>{' '}
                {maintenanceDetail.completionDate
                  ? dayjs(maintenanceDetail.completionDate).format('DD/MM/YYYY')
                  : '-'}
              </div>
              <div>
                <strong>Chi phí dự tính:</strong> {money(maintenanceDetail.estimatedCost)}
              </div>
              <div>
                <strong>Chi phí thực tế:</strong> {money(maintenanceDetail.actualCost)}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Mô tả ban đầu</div>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                {maintenanceDetail.description || '-'}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Kết quả sửa chữa</div>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  background: '#fafafa',
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                {maintenanceDetail.completionNote || '-'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {isEdit && (
        <Card
          title={(
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PictureOutlined style={{ color: '#1890ff' }} />
              <span>Ảnh xe</span>
            </div>
          )}
          style={{ borderRadius: 12, marginTop: 16 }}
        >
          {imageUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Image
                src={imageUrl}
                alt="Ảnh xe"
                style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, objectFit: 'contain' }}
              />
              <div style={{ display: 'flex', gap: 12 }}>
                <Upload
                  showUploadList={false}
                  beforeUpload={(file) => {
                    handleImageUpload(file);
                    return false;
                  }}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    Thay đổi ảnh
                  </Button>
                </Upload>
                <Button danger icon={<DeleteOutlined />} onClick={handleImageDelete}>
                  Xoá ảnh
                </Button>
              </div>
            </div>
          ) : (
            <Upload.Dragger
              showUploadList={false}
              beforeUpload={(file) => {
                handleImageUpload(file);
                return false;
              }}
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ padding: '20px 0' }}
            >
              <p className="ant-upload-drag-icon">
                <PictureOutlined style={{ fontSize: 48, color: '#999' }} />
              </p>
              <p className="ant-upload-text">Kéo thả ảnh vào đây hoặc nhấn để chọn</p>
              <p className="ant-upload-hint">Hỗ trợ JPEG, PNG, GIF, WebP. Tối đa 5MB.</p>
            </Upload.Dragger>
          )}
        </Card>
      )}

      {isEdit && (
        <Card
          title="Định mức phụ kiện trên xe"
          style={{ borderRadius: 12, marginTop: 16 }}
          extra={(
            <Space>
              <Button onClick={() => navigate(`/vehicles/${id}/accessories`)}>
                Xem phụ kiện trên xe
              </Button>
              <Button type="primary" onClick={() => navigate(`/accessories/issue?vehicleId=${id}`)}>
                Cấp phát phụ kiện
              </Button>
            </Space>
          )}
          loading={accessoryRequirementLoading}
        >
          {accessoryRequirement?.items?.length ? (
            <>
              {accessoryRequirement.items.some((item) => item.missingQuantity > 0) && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="Xe đang thiếu phụ kiện theo định mức"
                  description="Vui lòng xử lý các phụ kiện còn thiếu trước khi vận hành hoặc bàn giao."
                />
              )}

              <Table
                rowKey="accessoryId"
                pagination={false}
                dataSource={accessoryRequirement.items}
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
            </>
          ) : (
            <div>Chưa có dữ liệu định mức phụ kiện cho xe này.</div>
          )}
        </Card>
      )}
    </div>
  );
}
