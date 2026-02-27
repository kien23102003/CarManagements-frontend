import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { Form, Input, Button, Typography, Card, message } from 'antd';
import { LockOutlined, MailOutlined, CarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success('Đăng nhập thành công!');
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.data?.message ||
        'Email hoặc mật khẩu không đúng';
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
      <Card
        style={{ width: 420, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <CarOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Title level={3} style={{ marginBottom: 4 }}>Hệ thống quản lý xe</Title>
          <Text type="secondary">Đăng nhập để tiếp tục</Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="email@congty.com" autoFocus />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44 }}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
          © 2026 Hệ thống quản lý phương tiện
        </Text>
      </Card>
    </div>
  );
}
