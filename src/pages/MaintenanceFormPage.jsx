import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App, Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import maintenanceApi from '../api/maintenanceApi';
import vehicleApi from '../api/vehicleApi';

const NORMALIZED_MAINTENANCE_TYPE = {
  Routine: 'Periodic',
  Emergency: 'Breakdown',
  Repair: 'Breakdown',
  Periodic: 'Periodic',
  Breakdown: 'Breakdown',
};

const MAINTENANCE_STATUSES = new Set(['Maintenance', 'InMaintenance']);

const normalizeMaintenanceType = (type) => NORMALIZED_MAINTENANCE_TYPE[type] || 'Periodic';
const disablePastDate = (current) => current && current.startOf('day').isBefore(dayjs().startOf('day'));

export default function MaintenanceFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [currentVehicleOption, setCurrentVehicleOption] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [updatingVehicleStatus, setUpdatingVehicleStatus] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadVehicles();
    if (isEdit) {
      loadItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadVehicles = async () => {
    try {
      const { data } = await vehicleApi.getList();
      const list = (data.data || data || []).filter((vehicle) => vehicle.status !== 'Disposed');
      setVehicles(list);
    } catch {
      setVehicles([]);
    }
  };

  const loadItem = async () => {
    setLoading(true);
    try {
      const { data } = await maintenanceApi.getById(id);
      const item = data.data || data;

      form.setFieldsValue({
        vehicleId: item.vehicleId,
        maintenanceType: normalizeMaintenanceType(item.maintenanceType),
        requestDate: item.requestDate ? dayjs(item.requestDate) : null,
        estimatedCost: item.estimatedCost,
        description: item.description,
      });

      if (item.vehicleId) {
        const option = {
          value: item.vehicleId,
          label: `${item.vehicleLicensePlate || 'Không có biển số'} - ${item.vehicleModelName || 'Không rõ loại xe'}`,
          status: item.vehicleStatus,
        };

        setCurrentVehicleOption(option);
        setSelectedVehicle(option);
      }
    } catch {
      message.error('Không thể tải dữ liệu');
      navigate('/maintenance');
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleChange = (vehicleId) => {
    const vehicle = vehicles.find((item) => item.id === vehicleId) || null;
    setSelectedVehicle(vehicle);
  };

  const handleMarkVehicleMaintenance = async () => {
    if (!selectedVehicle) return;

    const vehicleId = selectedVehicle.id || selectedVehicle.value;
    setUpdatingVehicleStatus(true);

    try {
      await vehicleApi.update(vehicleId, { status: 'Maintenance' });
      message.success('Đã chuyển xe sang trạng thái đang bảo trì');

      await loadVehicles();
      setSelectedVehicle((prev) => (prev ? { ...prev, status: 'Maintenance' } : prev));
      setCurrentVehicleOption((prev) => (
        prev && prev.value === vehicleId ? { ...prev, status: 'Maintenance' } : prev
      ));
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể chuyển xe sang trạng thái bảo trì');
    } finally {
      setUpdatingVehicleStatus(false);
    }
  };

  const handleSubmit = async (values) => {
    const vehicle = vehicles.find((item) => item.id === values.vehicleId) || selectedVehicle;
    if (!isEdit && !MAINTENANCE_STATUSES.has(vehicle?.status)) {
      message.warning('Xe phải ở trạng thái đang bảo trì trước khi tạo phiếu');
      return;
    }

    if (!isEdit && values.requestDate && values.requestDate.startOf('day').isBefore(dayjs().startOf('day'))) {
      message.warning('Ngày yêu cầu không được nhỏ hơn ngày hiện tại');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...values,
        maintenanceType: normalizeMaintenanceType(values.maintenanceType),
        requestDate: values.requestDate ? values.requestDate.format('YYYY-MM-DD') : null,
      };

      if (isEdit) {
        delete payload.vehicleId;
        delete payload.requestDate;
        await maintenanceApi.update(id, payload);
        message.success('Cập nhật thành công');
      } else {
        await maintenanceApi.create(payload);
        message.success('Tạo yêu cầu thành công');
      }

      navigate('/maintenance');
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  const vehicleOptions = [
    ...(currentVehicleOption ? [currentVehicleOption] : []),
    ...vehicles
      .map((vehicle) => ({
        value: vehicle.id,
        label: `${vehicle.licensePlate || '-'} - ${vehicle.manufacturer || ''} ${vehicle.modelName || ''}`.trim(),
        status: vehicle.status,
      }))
      .filter((option, index, array) => array.findIndex((item) => item.value === option.value) === index),
  ];

  const chosenVehicle = selectedVehicle || (isEdit ? currentVehicleOption : null);
  const canSubmit = isEdit || MAINTENANCE_STATUSES.has(chosenVehicle?.status);

  return (
    <div style={{ maxWidth: 800 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/maintenance')} style={{ marginBottom: 16 }}>
        Quay lại
      </Button>
      <h2>{isEdit ? 'Cập nhật yêu cầu bảo trì' : 'Tạo yêu cầu bảo trì'}</h2>
      <Card style={{ borderRadius: 12, marginTop: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ maintenanceType: 'Periodic' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <Form.Item name="vehicleId" label="Xe" rules={[{ required: true, message: 'Vui lòng chọn xe' }]}>
              <Select
                disabled={isEdit}
                showSearch
                placeholder="Tìm và chọn xe..."
                optionFilterProp="label"
                options={vehicleOptions}
                onChange={handleVehicleChange}
              />
            </Form.Item>

            <Form.Item
              name="maintenanceType"
              label="Loại bảo trì"
              rules={[{ required: true, message: 'Vui lòng chọn loại bảo trì' }]}
            >
              <Select
                options={[
                  { value: 'Periodic', label: 'Định kỳ' },
                  { value: 'Breakdown', label: 'Sửa chữa / hỏng hóc' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="requestDate"
              label="Ngày yêu cầu"
              rules={[{ required: true, message: 'Vui lòng chọn ngày yêu cầu' }]}
            >
              <DatePicker
                disabled={isEdit}
                disabledDate={disablePastDate}
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
                placeholder="Chọn ngày"
              />
            </Form.Item>

            <Form.Item
              name="estimatedCost"
              label="Chi phí ước tính (VND)"
              rules={[
                { required: true, message: 'Vui lòng nhập chi phí ước tính' },
                { type: 'number', min: 0, message: 'Chi phí ước tính phải lớn hơn hoặc bằng 0' },
              ]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                placeholder="0"
              />
            </Form.Item>
          </div>

          {!isEdit && chosenVehicle && !MAINTENANCE_STATUSES.has(chosenVehicle.status) && (
            <Alert
              showIcon
              type="warning"
              style={{ marginBottom: 16 }}
              message="Xe chưa ở trạng thái đang bảo trì"
              description={(
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span>Cần chuyển xe sang trạng thái bảo trì trước khi tạo phiếu bảo trì.</span>
                  <Button type="primary" onClick={handleMarkVehicleMaintenance} loading={updatingVehicleStatus}>
                    Chuyển sang bảo trì
                  </Button>
                </div>
              )}
            />
          )}

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết yêu cầu bảo trì..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Button onClick={() => navigate('/maintenance')}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving} disabled={!canSubmit || updatingVehicleStatus}>
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
