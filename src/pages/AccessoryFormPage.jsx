import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { App, Button, Card, Form, Input, InputNumber, Select, Switch } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import accessoryApi from '../api/accessoryApi';
import { useAuth } from '../services/AuthContext';
import { ACCESSORY_TYPE_OPTIONS, canWriteAccessoryCatalog, unwrapData } from '../services/accessoryHelpers';

export default function AccessoryFormPage() {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const roles = user?.roles || [];
  const writable = useMemo(() => canWriteAccessoryCatalog(roles), [roles]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const requireTrimmedText = (label) => ({
    validator: (_, value) => {
      if (typeof value !== 'string' || !value.trim()) {
        return Promise.reject(new Error(`Vui lòng nhập ${label}`));
      }

      return Promise.resolve();
    },
  });

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    const loadDetail = async () => {
      setLoading(true);
      try {
        const { data } = await accessoryApi.getAccessoryById(id);
        const payload = unwrapData(data);
        form.setFieldsValue({
          code: payload.code,
          name: payload.name,
          type: payload.type,
          minimumStock: payload.minimumStock,
          isActive: payload.isActive,
        });
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải chi tiết phụ kiện');
        navigate('/accessories');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [form, id, isEdit, message, navigate]);

  const handleSubmit = async (values) => {
    if (!writable) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: values.code?.trim(),
        name: values.name?.trim(),
        type: values.type,
        minimumStock: values.minimumStock,
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
    } catch (error) {
      message.error(error.response?.data?.message || 'Lưu phụ kiện thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (!writable) {
    return <Card>Bạn không có quyền chỉnh sửa phụ kiện.</Card>;
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
          initialValues={{ type: 'Reusable', isActive: true }}
          onFinish={handleSubmit}
        >
          <Form.Item
            name="code"
            label="Mã phụ kiện"
            rules={[
              { required: true, message: 'Vui lòng nhập mã phụ kiện' },
              requireTrimmedText('mã phụ kiện'),
            ]}
          >
            <Input maxLength={50} />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên phụ kiện"
            rules={[
              { required: true, message: 'Vui lòng nhập tên phụ kiện' },
              requireTrimmedText('tên phụ kiện'),
            ]}
          >
            <Input maxLength={200} />
          </Form.Item>

          <Form.Item
            name="type"
            label="Loại phụ kiện"
            rules={[{ required: true, message: 'Vui lòng chọn loại phụ kiện' }]}
          >
            <Select options={ACCESSORY_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="minimumStock"
            label="Tồn kho tối thiểu mặc định"
            rules={[
              { required: true, message: 'Vui lòng nhập tồn kho tối thiểu mặc định' },
              { type: 'number', min: 0, message: 'Tồn kho tối thiểu mặc định phải lớn hơn hoặc bằng 0' },
            ]}
          >
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
