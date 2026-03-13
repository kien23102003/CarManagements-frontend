import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, DatePicker, Form, Input, InputNumber, Select, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import accessoryApi from '../api/accessoryApi';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../services/AuthContext';

const canWrite = (roles) =>
  roles.includes('Operator') || roles.includes('Executive Management');

export default function AccessoryIssuePage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetVehicleId = searchParams.get('vehicleId');
  const { user } = useAuth();
  const roles = user?.roles || [];
  const writable = useMemo(() => canWrite(roles), [roles]);

  const [vehicles, setVehicles] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDropdown = async () => {
    try {
      const [vehicleRes, accessoryRes] = await Promise.all([
        vehicleApi.getList(),
        accessoryApi.getAccessories({ page: 1, pageSize: 200 }),
      ]);
      setVehicles(vehicleRes.data?.data || vehicleRes.data || []);
      setAccessories(accessoryRes.data?.data || accessoryRes.data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải dữ liệu danh mục');
    }
  };

  useEffect(() => {
    loadDropdown();
  }, []);

  useEffect(() => {
    if (presetVehicleId) {
      form.setFieldsValue({ vehicleId: Number(presetVehicleId) });
    }
  }, [presetVehicleId]);

  const handleSubmit = async (values) => {
    if (!writable) return;
    setLoading(true);
    try {
      await accessoryApi.issueVehicleAccessory({
        vehicleId: values.vehicleId,
        accessoryId: values.accessoryId,
        quantity: values.quantity,
        installDate: values.installDate ? values.installDate.format('YYYY-MM-DD') : null,
        notes: values.notes,
      });
      message.success('Cấp phát phụ kiện thành công');
      navigate(values.vehicleId ? `/vehicles/${values.vehicleId}/accessories` : '/accessories');
    } catch (err) {
      message.error(err.response?.data?.message || 'Cấp phát phụ kiện thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!writable) {
    return <Card>Bạn không có quyền cấp phát phụ kiện.</Card>;
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/accessories')} style={{ marginBottom: 12 }}>
        Quay lại
      </Button>
      <h2 style={{ marginTop: 0 }}>Cấp phát phụ kiện cho xe</h2>

      <Card>
        <Form
          layout="vertical"
          form={form}
          onFinish={handleSubmit}
          initialValues={{ quantity: 1, installDate: dayjs() }}
        >
          <Form.Item name="vehicleId" label="Xe" rules={[{ required: true, message: 'Vui lòng chọn xe' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={vehicles.map((v) => ({
                value: v.id,
                label: `${v.licensePlate || 'Không có BKS'} - ${v.modelName || ''}`.trim(),
              }))}
            />
          </Form.Item>

          <Form.Item name="accessoryId" label="Phụ kiện" rules={[{ required: true, message: 'Vui lòng chọn phụ kiện' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={accessories.map((a) => ({
                value: a.id,
                label: `${a.code || ''} - ${a.name || ''} (tồn: ${a.quantityInStock ?? 0})`.trim(),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Số lượng"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng' },
              { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0' },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="installDate" label="Ngày lắp">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => navigate('/accessories')}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Cấp phát
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
