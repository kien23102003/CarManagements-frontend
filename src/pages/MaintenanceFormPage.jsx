import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import maintenanceApi from '../api/maintenanceApi';
import vehicleApi from '../api/vehicleApi';
import { Card, Form, Input, InputNumber, Select, DatePicker, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const NORMALIZED_MAINTENANCE_TYPE = {
  Routine: 'Periodic',
  Emergency: 'Breakdown',
  Repair: 'Breakdown',
  Periodic: 'Periodic',
  Breakdown: 'Breakdown',
};

const normalizeMaintenanceType = (type) => NORMALIZED_MAINTENANCE_TYPE[type] || 'Periodic';

export default function MaintenanceFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadVehicles();
    if (isEdit) loadItem();
  }, [id]);

  const loadVehicles = async () => {
    try {
      const { data } = await vehicleApi.getList();
      const list = (data.data || data || []).filter((v) => v.status !== 'Disposed');
      setVehicles(list);
    } catch { /* ignore */ }
  };

  const loadItem = async () => {
    setLoading(true);
    try {
      const { data } = await maintenanceApi.getById(id);
      const m = data.data || data;
      form.setFieldsValue({
        vehicleId: m.vehicleId,
        maintenanceType: normalizeMaintenanceType(m.maintenanceType),
        requestDate: m.requestDate ? dayjs(m.requestDate) : null,
        estimatedCost: m.estimatedCost,
        description: m.description,
      });
    } catch { message.error('Không thể tải dữ liệu'); navigate('/maintenance'); }
    setLoading(false);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        maintenanceType: normalizeMaintenanceType(values.maintenanceType),
        requestDate: values.requestDate ? values.requestDate.format('YYYY-MM-DD') : null,
      };
      if (isEdit) { await maintenanceApi.update(id, payload); message.success('Cập nhật thành công'); }
      else { await maintenanceApi.create(payload); message.success('Tạo yêu cầu thành công'); }
      navigate('/maintenance');
    } catch (err) { message.error(err.response?.data?.message || 'Có lỗi'); }
    setSaving(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/maintenance')} style={{ marginBottom: 16 }}>Quay lại</Button>
      <h2>{isEdit ? 'Cập nhật yêu cầu bảo trì' : 'Tạo yêu cầu bảo trì'}</h2>
      <Card style={{ borderRadius: 12, marginTop: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ maintenanceType: 'Periodic' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <Form.Item name="vehicleId" label="Xe" rules={[{ required: true, message: 'Vui lòng chọn xe' }]}>
              <Select
                showSearch
                placeholder="Tìm và chọn xe..."
                optionFilterProp="label"
                options={vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.licensePlate || '—'} — ${v.manufacturer || ''} ${v.modelName || ''}`.trim(),
                }))}
              />
            </Form.Item>
            <Form.Item name="maintenanceType" label="Loại bảo trì" rules={[{ required: true }]}>
              <Select options={[
                { value: 'Periodic', label: 'Định kỳ' },
                { value: 'Breakdown', label: 'Sửa chữa/hỏng hóc' },
              ]} />
            </Form.Item>
            <Form.Item name="requestDate" label="Ngày yêu cầu">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Chọn ngày" />
            </Form.Item>
            <Form.Item name="estimatedCost" label="Chi phí ước tính (VNĐ)">
              <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="0" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết yêu cầu bảo trì..." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Button onClick={() => navigate('/maintenance')}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving}>{isEdit ? 'Cập nhật' : 'Tạo mới'}</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
