import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Button, Typography, Card, message, Alert } from 'antd';
import authApi from '../api/authApi';

const { Title, Text } = Typography;

export default function SetNewPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const handleSubmit = async ({ newPassword, confirmNewPassword }) => {
    if (!token) return;
    setLoading(true);
    try {
      await authApi.confirmChangePassword(token, newPassword, confirmNewPassword);
      message.success('Đổi mật khẩu thành công.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Token không hợp lệ hoặc đã hết hạn.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 440, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <Title level={3} style={{ marginBottom: 4 }}>Thiết lập mật khẩu mới</Title>
        <Text type="secondary">Nhập mật khẩu mới sau khi xác nhận qua email</Text>

        {!token && (
          <Alert
            style={{ marginTop: 16, marginBottom: 12 }}
            type="error"
            message="Thiếu token xác nhận đổi mật khẩu."
            showIcon
          />
        )}

        <Form layout="vertical" onFinish={handleSubmit} size="large" style={{ marginTop: 16 }}>
          <Form.Item
            name="newPassword"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Mật khẩu mới" disabled={!token} />
          </Form.Item>

          <Form.Item
            name="confirmNewPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Xác nhận mật khẩu mới" disabled={!token} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block disabled={!token}>
              Xác nhận đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>

        <Link to="/login">Quay lại đăng nhập</Link>
      </Card>
    </div>
  );
}
