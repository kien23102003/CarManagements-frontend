import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { CloseCircleOutlined, ReloadOutlined, LoginOutlined } from '@ant-design/icons';
import authApi from '../api/authApi';

const { Title, Text } = Typography;

export default function VerifyFailedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const error = decodeURIComponent(searchParams.get('error') || 'Lien ket xac minh khong hop le hoac da het han.');

  const handleResend = async ({ email }) => {
    setLoading(true);
    try {
      await authApi.resendVerification(email.trim());
      message.success('Da gui lai email xac minh. Vui long kiem tra hop thu.');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        'Khong the gui lai email xac minh.';
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
        background: 'linear-gradient(120deg, #fff1f0 0%, #f9f0ff 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 560, borderRadius: 16 }}>
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <CloseCircleOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />
            <Title level={3} style={{ marginTop: 12, marginBottom: 0 }}>
              Xac minh email that bai
            </Title>
          </div>

          <Alert
            showIcon
            type="error"
            message="Khong the xac minh email"
            description={error}
          />

          <Text type="secondary">
            Nhap email de gui lai lien ket xac minh:
          </Text>

          <Form layout="vertical" onFinish={handleResend}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui long nhap email' },
                { type: 'email', message: 'Email khong hop le' },
              ]}
            >
              <Input placeholder="email@congty.com" />
            </Form.Item>

            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<ReloadOutlined />}>
                Gui lai xac minh
              </Button>
              <Button icon={<LoginOutlined />} onClick={() => navigate('/login')}>
                Ve trang dang nhap
              </Button>
            </Space>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
