import { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import userApi from '../api/userApi';
import { Card, Avatar, Descriptions, Tag, Spin, message } from 'antd';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data } = await userApi.getProfile();
      setProfile(data.data || data);
    } catch {
      message.error('Không thể tải thông tin hồ sơ');
      if (authUser) {
        setProfile({ name: authUser.fullName, email: authUser.email, roles: authUser.roles || [] });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!profile) return <Card><div style={{ textAlign: 'center', padding: 40, color: '#8c8c8c' }}>Không thể tải thông tin người dùng.</div></Card>;

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ marginBottom: 20 }}>Hồ sơ cá nhân</h2>
      <Card style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #f0f0f0' }}>
          <Avatar size={72} style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', fontSize: 32 }}>
            {(profile.name || profile.email || 'U').charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <h3 style={{ margin: 0 }}>{profile.name || 'Chưa cập nhật'}</h3>
            <div style={{ color: '#8c8c8c' }}>{profile.email}</div>
            {profile.roles?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {profile.roles.map((role) => <Tag key={role} color="blue">{role}</Tag>)}
              </div>
            )}
          </div>
        </div>

        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="Họ tên">{profile.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Email">{profile.email || '—'}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{profile.phone || '—'}</Descriptions.Item>
          <Descriptions.Item label="Chi nhánh">{profile.branchName || '—'}</Descriptions.Item>
          <Descriptions.Item label="Xác thực email">
            <Tag color={profile.emailVerified ? 'green' : 'orange'}>{profile.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : '—'}</Descriptions.Item>
          <Descriptions.Item label="Đăng nhập gần nhất">{profile.lastLogin ? new Date(profile.lastLogin).toLocaleString('vi-VN') : '—'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
