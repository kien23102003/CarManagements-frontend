import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import authApi from '../api/authApi';

const { Title, Text } = Typography;

export default function ChangePasswordPage() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async ({ currentPassword }) => {
    setLoading(true);
    try {
      await authApi.requestChangePassword(currentPassword);
      message.success('Đã gửi email xác nhận đổi mật khẩu. Vui lòng kiểm tra hộp thư.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể gửi yêu cầu đổi mật khẩu.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <Title level={3} style={{ marginBottom: 8 }}>Đổi mật khẩu</Title>
      <Text type="secondary">
        Nhập mật khẩu hiện tại để nhận email xác nhận đổi mật khẩu.
      </Text>

      <Card style={{ marginTop: 16, borderRadius: 12 }}>
        <Form layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu hiện tại' },
              { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              Gửi email xác nhận
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
