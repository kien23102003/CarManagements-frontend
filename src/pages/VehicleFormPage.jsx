import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import vehicleApi from '../api/vehicleApi';
import { Card, Form, Input, InputNumber, Select, DatePicker, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { if (isEdit) loadVehicle(); }, [id]);

  const loadVehicle = async () => {
    setLoading(true);
    try {
      const { data } = await vehicleApi.getById(id);
      const v = data.data || data;
      form.setFieldsValue({
        ...v,
        purchaseDate: v.purchaseDate ? dayjs(v.purchaseDate) : null,
      });
    } catch { message.error('Không thể tải thông tin xe'); navigate('/vehicles'); }
    setLoading(false);
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

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 900 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles')} style={{ marginBottom: 16 }}>Quay lại</Button>
      <h2>{isEdit ? 'Cập nhật xe' : 'Thêm xe mới'}</h2>
      <Card style={{ borderRadius: 12, marginTop: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ status: 'Active' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Form.Item name="licensePlate" label="Biển số xe" rules={[{ required: true, message: 'Vui lòng nhập biển số' }]}>
              <Input placeholder="51A-12345" />
            </Form.Item>
            <Form.Item name="modelId" label="Mã dòng xe">
              <InputNumber placeholder="Mã dòng xe" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="yearManufacture" label="Năm sản xuất">
              <InputNumber placeholder="2024" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="purchaseDate" label="Ngày mua">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Chọn ngày" />
            </Form.Item>
            <Form.Item name="originalCost" label="Giá gốc (VNĐ)">
              <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="0" />
            </Form.Item>
            <Form.Item name="currentValue" label="Giá trị hiện tại (VNĐ)">
              <InputNumber min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="0" />
            </Form.Item>
            <Form.Item name="mileage" label="Số km">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái">
              <Select options={[
                { value: 'Active', label: 'Hoạt động' },
                { value: 'InMaintenance', label: 'Đang bảo trì' },
                { value: 'InTransfer', label: 'Đang điều chuyển' },
                { value: 'Disposed', label: 'Đã thanh lý' },
              ]} />
            </Form.Item>
            <Form.Item name="currentDriverId" label="Mã tài xế">
              <InputNumber placeholder="Mã tài xế" style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Button onClick={() => navigate('/vehicles')}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving}>{isEdit ? 'Cập nhật' : 'Tạo mới'}</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
