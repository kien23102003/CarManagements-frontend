import { useNavigate } from 'react-router-dom';
import { Button, Card, Space, Typography } from 'antd';
import { CheckCircleOutlined, LoginOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function VerifySuccessPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(120deg, #e6fffb 0%, #f0f5ff 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: 520, borderRadius: 16, textAlign: 'center' }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a' }} />
          <Title level={3} style={{ margin: 0 }}>Xac minh email thanh cong</Title>
          <Text type="secondary">
            Tai khoan cua ban da duoc kich hoat. Ban co the dang nhap de su dung he thong.
          </Text>
          <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
            Di den dang nhap
          </Button>
        </Space>
      </Card>
    </div>
  );
}
