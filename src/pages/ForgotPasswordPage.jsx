import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, Typography, Card, message } from 'antd';
import { MailOutlined, CarOutlined } from '@ant-design/icons';
import authApi from '../api/authApi';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async ({ email }) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
      message.success('Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Không thể gửi yêu cầu quên mật khẩu.';
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
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <CarOutlined style={{ fontSize: 32, color: '#2563eb' }} />
          <Title level={3} style={{ marginTop: 8, marginBottom: 4 }}>Quên mật khẩu</Title>
          <Text type="secondary">Nhập email để nhận liên kết đặt lại mật khẩu</Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="email@congty.com" autoFocus />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Gửi liên kết đặt lại
            </Button>
          </Form.Item>
        </Form>

        {sent && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Vui lòng kiểm tra hộp thư (và thư rác).
          </Text>
        )}

        <Link to="/login">Quay lại đăng nhập</Link>
      </Card>
    </div>
  );
}
