import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import { Layout, Menu, Avatar, Dropdown, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  CarOutlined,
  ToolOutlined,
  SwapOutlined,
  FileSearchOutlined,
  UserOutlined,
  LogoutOutlined,
  UserAddOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = Layout;

const NAV_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan', roles: null },
  { key: '/vehicles', icon: <CarOutlined />, label: 'Quản lý xe', roles: null },
  { key: '/maintenance', icon: <ToolOutlined />, label: 'Bảo trì', roles: ['Operator', 'Branch Asset Accountant'] },
  { key: '/distribution', icon: <SwapOutlined />, label: 'Điều chuyển', roles: ['Branch Asset Accountant', 'Executive Management', 'Operator'] },
  { key: '/pending', icon: <FileSearchOutlined />, label: 'Yêu cầu chờ', roles: ['Executive Management'] },
  { key: '/register', icon: <UserAddOutlined />, label: 'Đăng ký TK', roles: ['Executive Management', 'Admin'] },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  const userRoles = user?.roles || [];
  const menuItems = NAV_ITEMS
    .filter((item) => !item.roles || item.roles.some((r) => userRoles.includes(r)))
    .map(({ key, icon, label }) => ({ key, icon, label }));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  const handleUserMenu = ({ key }) => {
    if (key === 'profile') navigate('/profile');
    if (key === 'logout') handleLogout();
  };

  const selectedKey = menuItems.find((m) => m.key !== '/' && location.pathname.startsWith(m.key))?.key
    || (location.pathname === '/' ? '/' : '');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={240}
        style={{
          background: '#001529',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'auto',
        }}
      >
        <div style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CarOutlined style={{ fontSize: 24, color: '#3b82f6' }} />
          {!collapsed && (
            <Typography.Text strong style={{ color: '#fff', fontSize: 18 }}>Quản lý xe</Typography.Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <div style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar style={{ background: themeToken.colorPrimary }}>
                {(user?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
              </Avatar>
              <span style={{ fontWeight: 500 }}>{user?.fullName || user?.email || 'Người dùng'}</span>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, minHeight: 'calc(100vh - 64px - 48px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
