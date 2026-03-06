import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import userApi from '../api/userApi';
import {
  Card,
  Typography,
  Button,
  Space,
  Table,
  Tag,
  Input,
  Switch,
  Modal,
  Form,
  InputNumber,
  Select,
  Popconfirm,
  Alert,
  message,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';

const normalizeRole = (role) => String(role || '').replace(/\s+/g, '').toLowerCase();

const ROLE_OPTIONS = [
  { value: 'Operator', label: 'Nhân viên vận hành' },
  { value: 'BranchAssetAccountant', label: 'Kế toán quản lý tài sản' },
  { value: 'ExecutiveManagement', label: 'Ban điều hành' },
  { value: 'Admin', label: 'Admin' },
];

export default function RegisterPage() {
  const { user } = useAuth();
  const [form] = Form.useForm();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [includeDeactivated, setIncludeDeactivated] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const normalizedRoles = (user?.roles || []).map(normalizeRole);
  const isAdmin = normalizedRoles.includes('admin');

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadAccounts(includeDeactivated);
  }, [isAdmin, includeDeactivated]);

  const loadAccounts = async (include) => {
    setLoading(true);
    try {
      const { data } = await userApi.getAdminAccounts(include);
      setAccounts(data.data || data || []);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Không thể tải danh sách tài khoản');
      setAccounts([]);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const { data } = await userApi.createAdminAccount({
        name: values.name?.trim(),
        email: values.email?.trim(),
        password: values.password,
        phone: values.phone?.trim() || null,
        branchId: values.branchId || null,
        role: values.role,
      });
      const payload = data?.data || data;
      if (payload?.warning) {
        message.warning(payload.warning);
      } else {
        message.success('Tạo tài khoản thành công');
      }
      form.resetFields();
      setCreateOpen(false);
      loadAccounts(includeDeactivated);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.message || 'Không thể tạo tài khoản');
    }
    setSaving(false);
  };

  const handleToggleStatus = async (record, nextActive) => {
    setUpdatingId(record.id);
    try {
      await userApi.updateAdminAccountStatus(record.id, nextActive);
      message.success(nextActive ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản');
      loadAccounts(includeDeactivated);
    } catch (err) {
      message.error(err?.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
    setUpdatingId(null);
  };

  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    const q = search.toLowerCase();
    return accounts.filter((a) =>
      [a.name, a.email, a.phone, a.branchName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)) ||
      String(a.id || '').includes(q),
    );
  }, [accounts, search]);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70, render: (v) => `#${v}` },
    { title: 'Họ tên', dataIndex: 'name', key: 'name', render: (v) => v || '-' },
    { title: 'Email', dataIndex: 'email', key: 'email', render: (v) => v || '-' },
    { title: 'Số điện thoại', dataIndex: 'phone', key: 'phone', render: (v) => v || '-' },
    { title: 'Chi nhánh', dataIndex: 'branchName', key: 'branchName', render: (v, r) => v || (r.branchId ? `#${r.branchId}` : '-') },
    {
      title: 'Vai trò',
      dataIndex: 'roles',
      key: 'roles',
      width: 220,
      render: (roles = []) => (
        <Space size={[4, 4]} wrap>
          {roles.length === 0 ? '-' : roles.map((role) => <Tag key={role} color="blue">{role}</Tag>)}
        </Space>
      ),
    },
    {
      title: 'Xác thực email',
      dataIndex: 'emailVerified',
      key: 'emailVerified',
      width: 140,
      render: (v) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Đã xác thực' : 'Chưa xác thực'}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 170,
      render: (isActive, record) => (
        <Popconfirm
          title={isActive ? 'Vô hiệu hóa tài khoản này?' : 'Kích hoạt lại tài khoản này?'}
          onConfirm={() => handleToggleStatus(record, !isActive)}
          okText="Xác nhận"
          cancelText="Hủy"
        >
          <Switch
            checked={isActive}
            checkedChildren="Hoạt động"
            unCheckedChildren="Đã khóa"
            loading={updatingId === record.id}
          />
        </Popconfirm>
      ),
    },
    {
      title: 'Tạo lúc',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (v) => (v ? new Date(v).toLocaleString('vi-VN') : '-'),
    },
    {
      title: 'Đăng nhập cuối',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      width: 170,
      render: (v) => (v ? new Date(v).toLocaleString('vi-VN') : '-'),
    },
  ];

  if (!isAdmin) {
    return (
      <Alert
        type="error"
        showIcon
        message="Bạn không có quyền truy cập"
        description="Trang này chỉ dành cho tài khoản Admin."
      />
    );
  }

  return (
    <div>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>Quản lý tài khoản</Typography.Title>
            <Typography.Text type="secondary">Sử dụng API admin để xem, tạo mới và khóa/mở khóa tài khoản.</Typography.Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => loadAccounts(includeDeactivated)}>Tải lại</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Tạo tài khoản</Button>
          </Space>
        </div>

        <Card>
          <Space wrap style={{ marginBottom: 12 }}>
            <Input.Search
              allowClear
              placeholder="Tìm theo ID, họ tên, email, số điện thoại, chi nhánh..."
              style={{ width: 360 }}
              onSearch={setSearch}
              onChange={(e) => {
                if (!e.target.value) setSearch('');
              }}
            />
            <Space>
              <span>Hiển thị tài khoản đã khóa</span>
              <Switch checked={includeDeactivated} onChange={setIncludeDeactivated} />
            </Space>
          </Space>

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredAccounts}
            scroll={{ x: 1400 }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
          />
        </Card>
      </Space>

      <Modal
        open={createOpen}
        title="Tạo tài khoản mới"
        okText="Tạo"
        cancelText="Hủy"
        onCancel={() => {
          if (!saving) {
            setCreateOpen(false);
            form.resetFields();
          }
        }}
        onOk={handleCreate}
        okButtonProps={{ loading: saving }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: 'Operator' }}
          preserve={false}
        >
          <Form.Item name="name" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="email@company.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Tối thiểu 6 ký tự" />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="0912345678" />
          </Form.Item>

          <Form.Item name="branchId" label="Mã chi nhánh">
            <InputNumber style={{ width: '100%' }} min={1} placeholder="Nhập mã chi nhánh" />
          </Form.Item>

          <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
