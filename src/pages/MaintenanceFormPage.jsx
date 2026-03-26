import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select, Spin, message } from 'antd';
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

export default function MaintenanceFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
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
  }, [id]);

  const loadVehicles = async () => {
    try {
      const { data } = await vehicleApi.getList();
      const list = (data.data || data || []).filter((vehicle) => vehicle.status !== 'Disposed');
      setVehicles(list);
    } catch {
      // ignore
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
          label: `${item.vehicleLicensePlate || 'Khong co bien so'} - ${item.vehicleModelName || 'Khong ro loai xe'}`,
          status: item.vehicleStatus,
        };

        setCurrentVehicleOption(option);
        setSelectedVehicle(option);
      }
    } catch {
      message.error('Khong the tai du lieu');
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
    if (!selectedVehicle) {
      return;
    }

    const vehicleId = selectedVehicle.id || selectedVehicle.value;
    setUpdatingVehicleStatus(true);

    try {
      await vehicleApi.update(vehicleId, { status: 'Maintenance' });
      message.success('Da chuyen xe sang trang thai dang bao tri');

      await loadVehicles();
      setSelectedVehicle((prev) => (prev ? { ...prev, status: 'Maintenance' } : prev));
      setCurrentVehicleOption((prev) => (
        prev && prev.value === vehicleId ? { ...prev, status: 'Maintenance' } : prev
      ));
    } catch (err) {
      message.error(err.response?.data?.message || 'Khong the chuyen xe sang trang thai bao tri');
    } finally {
      setUpdatingVehicleStatus(false);
    }
  };

  const handleSubmit = async (values) => {
    const vehicle = vehicles.find((item) => item.id === values.vehicleId) || selectedVehicle;
    if (!isEdit && !MAINTENANCE_STATUSES.has(vehicle?.status)) {
      message.warning('Xe phai o trang thai dang bao tri truoc khi tao phieu');
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
        message.success('Cap nhat thanh cong');
      } else {
        await maintenanceApi.create(payload);
        message.success('Tao yeu cau thanh cong');
      }

      navigate('/maintenance');
    } catch (err) {
      message.error(err.response?.data?.message || 'Co loi');
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
    ...vehicles.map((vehicle) => ({
      value: vehicle.id,
      label: `${vehicle.licensePlate || '-'} - ${vehicle.manufacturer || ''} ${vehicle.modelName || ''}`.trim(),
      status: vehicle.status,
    })).filter((option, index, array) => array.findIndex((item) => item.value === option.value) === index),
  ];

  const chosenVehicle = selectedVehicle || (isEdit ? currentVehicleOption : null);
  const canSubmit = isEdit || MAINTENANCE_STATUSES.has(chosenVehicle?.status);

  return (
    <div style={{ maxWidth: 800 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/maintenance')} style={{ marginBottom: 16 }}>
        Quay lai
      </Button>
      <h2>{isEdit ? 'Cap nhat yeu cau bao tri' : 'Tao yeu cau bao tri'}</h2>
      <Card style={{ borderRadius: 12, marginTop: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ maintenanceType: 'Periodic' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <Form.Item name="vehicleId" label="Xe" rules={[{ required: true, message: 'Vui long chon xe' }]}>
              <Select
                disabled={isEdit}
                showSearch
                placeholder="Tim va chon xe..."
                optionFilterProp="label"
                options={vehicleOptions}
                onChange={handleVehicleChange}
              />
            </Form.Item>
            <Form.Item name="maintenanceType" label="Loai bao tri" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'Periodic', label: 'Dinh ky' },
                  { value: 'Breakdown', label: 'Sua chua / hong hoc' },
                ]}
              />
            </Form.Item>
            <Form.Item name="requestDate" label="Ngay yeu cau">
              <DatePicker disabled={isEdit} style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Chon ngay" />
            </Form.Item>
            <Form.Item name="estimatedCost" label="Chi phi uoc tinh (VND)">
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
              message="Xe chua o trang thai dang bao tri"
              description={(
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span>Can chuyen xe sang trang thai bao tri truoc khi tao phieu bao tri.</span>
                  <Button type="primary" onClick={handleMarkVehicleMaintenance} loading={updatingVehicleStatus}>
                    Chuyen sang bao tri
                  </Button>
                </div>
              )}
            />
          )}

          <Form.Item name="description" label="Mo ta">
            <Input.TextArea rows={3} placeholder="Mo ta chi tiet yeu cau bao tri..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Button onClick={() => navigate('/maintenance')}>Huy</Button>
            <Button type="primary" htmlType="submit" loading={saving} disabled={!canSubmit || updatingVehicleStatus}>
              {isEdit ? 'Cap nhat' : 'Tao moi'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
