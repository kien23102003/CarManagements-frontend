import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import { Card, Form, Input, InputNumber, Select, Button, Typography, Space, message } from 'antd';
import { ArrowLeftOutlined, UserAddOutlined } from '@ant-design/icons';

export default function RegisterPage() {
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await authApi.register({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || null,
        branchId: values.branchId || null,
        role: values.role,
      });
      message.success(`Tạo tài khoản ${values.role} thành công`);
      form.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 16 }}>Quay lại</Button>
      <Space align="start" size={12} style={{ marginBottom: 20 }}>
        <UserAddOutlined style={{ fontSize: 28, color: '#3b82f6' }} />
        <div>
          <h2 style={{ margin: 0 }}>Đăng ký tài khoản</h2>
          <Typography.Text type="secondary">Tạo tài khoản cho nhân viên vận hành hoặc kế toán chi nhánh</Typography.Text>
        </div>
      </Space>

      <Card style={{ borderRadius: 12 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ role: 'Operator' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <Form.Item name="name" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
              <Input placeholder="Nguyễn Văn A" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
              <Input placeholder="email@congty.com" />
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
              <Input.Password placeholder="Tối thiểu 6 ký tự" />
            </Form.Item>
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="0912345678" />
            </Form.Item>
            <Form.Item name="branchId" label="Mã chi nhánh">
              <InputNumber placeholder="Nhập mã chi nhánh" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
              <Select options={[
                { value: 'Operator', label: 'Nhân viên vận hành' },
                { value: 'BranchAssetAccountant', label: 'Kế toán quản lý tài sản' },
              ]} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={saving}>Tạo tài khoản</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
