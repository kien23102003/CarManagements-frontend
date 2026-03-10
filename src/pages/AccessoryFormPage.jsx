import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Form, Input, InputNumber, Select, Switch, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import accessoryApi from '../api/accessoryApi';
import { useAuth } from '../services/AuthContext';

const TYPE_OPTIONS = [
  { value: 'Reusable', label: 'Tái sử dụng' },
  { value: 'Consumable', label: 'Tiêu hao' },
  { value: 'Fixed', label: 'Cố định' },
];

const canWrite = (roles) =>
  roles.includes('Operator') || roles.includes('Executive Management');

export default function AccessoryFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const roles = user?.roles || [];
  const writable = useMemo(() => canWrite(roles), [roles]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDetail = async () => {
    if (!isEdit) return;
    setLoading(true);
    try {
      const { data } = await accessoryApi.getAccessoryById(id);
      const payload = data.data || data;
      form.setFieldsValue({
        ...payload,
        quantityInStock: payload.quantityInStock ?? 0,
      });
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải chi tiết phụ kiện');
      navigate('/accessories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleSubmit = async (values) => {
    if (!writable) return;
    setSaving(true);
    try {
      const payload = {
        code: values.code?.trim(),
        name: values.name?.trim(),
        type: values.type,
        quantityInStock: values.quantityInStock ?? 0,
        unitPrice: values.unitPrice ?? null,
        minimumStock: values.minimumStock ?? null,
        isActive: values.isActive ?? true,
      };

      if (isEdit) {
        await accessoryApi.updateAccessory(id, payload);
        message.success('Cập nhật phụ kiện thành công');
      } else {
        await accessoryApi.createAccessory(payload);
        message.success('Tạo phụ kiện thành công');
      }
      navigate('/accessories');
    } catch (err) {
      message.error(err.response?.data?.message || 'Lưu phụ kiện thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (!writable) {
    return (
      <Card>
        Bạn không có quyền chỉnh sửa phụ kiện.
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/accessories')} style={{ marginBottom: 12 }}>
        Quay lại
      </Button>
      <h2 style={{ marginTop: 0 }}>{isEdit ? 'Sửa phụ kiện' : 'Tạo phụ kiện'}</h2>

      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'Reusable', isActive: true, quantityInStock: 0 }}
          onFinish={handleSubmit}
        >
          <Form.Item name="code" label="Mã phụ kiện" rules={[{ required: true, message: 'Vui lòng nhập mã phụ kiện' }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="name" label="Tên phụ kiện" rules={[{ required: true, message: 'Vui lòng nhập tên phụ kiện' }]}>
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item name="type" label="Loại phụ kiện" rules={[{ required: true, message: 'Vui lòng chọn loại phụ kiện' }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="quantityInStock"
            label="Số lượng tồn kho"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng tồn kho' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="minimumStock" label="Tồn kho tối thiểu">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="unitPrice" label="Đơn giá">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="isActive" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => navigate('/accessories')}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
