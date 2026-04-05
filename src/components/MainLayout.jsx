import React, { useState } from 'react';
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
  LockOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  TeamOutlined,
  DollarOutlined,
} from '@ant-design/icons';

const { Sider, Header, Content } = Layout;

const NAV_ITEMS = [
  { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan', roles: null },
  {
    key: 'vehicles-menu',
    icon: <CarOutlined />,
    label: 'Quản lý xe',
    roles: null,
    children: [
      { key: '/vehicles', label: 'Danh sách xe' },
      { key: '/vehicle-schedules', label: 'Lịch hoạt động', roles: ['Operator', 'Branch Asset Accountant', 'Executive Management', 'Manager'] },
      { key: '/vehicles/new', label: 'Thêm xe mới', roles: ['Branch Asset Accountant'] },
      { key: '/vehicles/asset-create', label: 'Đăng ký tài sản', roles: ['Branch Asset Accountant'] },
      { key: '/vehicles/assignment', label: 'Phân công xe', roles: ['Operator', 'Branch Asset Accountant', 'Executive Management'] },
      { key: '/disposal-proposals', label: 'Đề xuất thanh lý', roles: ['Operator', 'Branch Asset Accountant', 'Executive Management'] },
    ],
  },
  {
    key: 'drivers-menu',
    icon: <TeamOutlined />,
    label: 'Tài xế',
    roles: ['Operator', 'Branch Asset Accountant', 'Executive Management'],
    children: [
      { key: '/drivers', label: 'Danh sách tài xế' },
    ],
  },
  {
    key: 'accessories-menu',
    icon: <AppstoreOutlined />,
    label: 'Phụ kiện',
    roles: ['Operator', 'Branch Asset Accountant', 'Executive Management', 'Manager'],
    children: [
      { key: '/accessories', label: 'Danh sách phụ kiện' },
      { key: '/branch-accessory-stock', label: 'Tồn kho chi nhánh' },
      { key: '/accessory-purchase-requests', label: 'Phiếu đề xuất mua' },
      { key: '/accessory-goods-receipts', label: 'Phiếu nhập hàng' },
      { key: '/vehicle-accessory-requirements', label: 'Định mức phụ kiện' },
      { key: '/accessories/issue', label: 'Cấp phát phụ kiện', roles: ['Operator', 'Branch Asset Accountant', 'Executive Management', 'Manager'] },
      { key: '/accessory-transactions', label: 'Lịch sử giao dịch' },
    ],
  },
  {
    key: '/trip-logs',
    icon: <SafetyCertificateOutlined />,
    label: 'Quản lý vận hành chuyến đi',
    roles: ['Operator', 'Branch Asset Accountant'],
  },
  { key: '/maintenance', icon: <ToolOutlined />, label: 'Bảo trì', roles: ['Operator', 'Branch Asset Accountant', 'Executive Management', 'Manager'] },
  { key: '/distribution', icon: <SwapOutlined />, label: 'Điều chuyển', roles: ['Branch Asset Accountant', 'Executive Management', 'Operator'] },
  { key: '/estimated-costs', icon: <DollarOutlined />, label: 'Tổng chi phí dự kiến', roles: ['Branch Asset Accountant', 'Chief Accountant', 'Executive Management'] },
  { key: '/pending', icon: <FileSearchOutlined />, label: 'Yêu cầu chờ', roles: ['Executive Management'] },
  { key: '/hr-management', icon: <TeamOutlined />, label: 'Quản lý nhân sự', roles: ['Manager', 'Admin', 'Executive Management'] },
  { key: '/proposals', icon: <CarOutlined />, label: 'Đề xuất xe', roles: null },
  { key: '/vehicle-stats', icon: <DashboardOutlined />, label: 'Thống kê khấu hao xe', roles: null },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  const userRoles = user?.roles || [];

  const filterChildrenByRole = (children) => {
    if (!children) return undefined;
    return children.filter((child) => !child.roles || child.roles.some((r) => userRoles.includes(r)));
  };

  const menuItems = NAV_ITEMS
    .filter((item) => !item.roles || item.roles.some((r) => userRoles.includes(r)))
    .map(({ key, icon, label, children }) => {
      const filteredChildren = filterChildrenByRole(children);
      if (filteredChildren && filteredChildren.length > 0) {
        return {
          key,
          icon,
          label,
          children: filteredChildren.map((child) => ({ key: child.key, label: child.label })),
        };
      }
      return { key, icon, label };
    });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ' },
    { key: 'change-password', icon: <LockOutlined />, label: 'Đổi mật khẩu' },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
  ];

  const handleUserMenu = ({ key }) => {
    if (key === 'profile') navigate('/profile');
    if (key === 'change-password') navigate('/change-password');
    if (key === 'logout') handleLogout();
  };

  const findSelectedKey = () => {
    if (location.pathname === '/') return '/';

    for (const item of menuItems) {
      if (item.children?.length) {
        const child = item.children.find((c) => location.pathname.startsWith(c.key));
        if (child) return child.key;
      }

      if (item.key !== '/' && location.pathname.startsWith(item.key)) {
        return item.key;
      }
    }

    return '';
  };

  const selectedKey = findSelectedKey();

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
            <Typography.Text strong style={{ color: '#fff', fontSize: 18 }}>Car Management</Typography.Text>
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
              <span style={{ fontWeight: 500 }}>{user?.fullName || user?.email || 'User'}</span>
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
