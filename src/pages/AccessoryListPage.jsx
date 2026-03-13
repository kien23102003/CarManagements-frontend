import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Input,
  Modal,
  Form,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { EditOutlined, InboxOutlined, PlusOutlined, ToolOutlined } from '@ant-design/icons';
import accessoryApi from '../api/accessoryApi';
import { useAuth } from '../services/AuthContext';

const { Text } = Typography;

const TYPE_OPTIONS = [
  { value: 'Reusable', label: 'Tái sử dụng' },
  { value: 'Consumable', label: 'Tiêu hao' },
  { value: 'Fixed', label: 'Cố định' },
];

const canWrite = (roles) =>
  roles.includes('Operator') || roles.includes('Executive Management');

const canRead = (roles) =>
  roles.includes('Operator') ||
  roles.includes('Executive Management') ||
  roles.includes('Branch Asset Accountant');

export default function AccessoryListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const canReadModule = canRead(roles);
  const canWriteModule = canWrite(roles);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState({
    keyword: '',
    type: undefined,
    isActive: undefined,
    page: 1,
    pageSize: 10,
  });

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedAccessory, setSelectedAccessory] = useState(null);
  const [importForm] = Form.useForm();

  const loadData = async () => {
    if (!canReadModule) return;
    setLoading(true);
    try {
      const params = {
        ...query,
        keyword: query.keyword || undefined,
      };
      const { data } = await accessoryApi.getAccessories(params);
      setItems(data.data || data || []);
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách phụ kiện');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [query.page, query.pageSize, query.type, query.isActive]);

  const openImportModal = (record) => {
    setSelectedAccessory(record);
    importForm.resetFields();
    setImportOpen(true);
  };

  const handleImport = async () => {
    try {
      const values = await importForm.validateFields();
      if (!selectedAccessory) return;
      setImporting(true);
      await accessoryApi.importAccessoryStock(selectedAccessory.id, {
        quantity: values.quantity,
        notes: values.notes,
      });
      message.success('Nhập kho thành công');
      setImportOpen(false);
      setSelectedAccessory(null);
      loadData();
    } catch (err) {
      if (!err?.errorFields) {
        message.error(err.response?.data?.message || 'Nhập kho thất bại');
      }
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo(
    () => [
      { title: 'Mã', dataIndex: 'code', key: 'code', width: 140 },
      { title: 'Tên', dataIndex: 'name', key: 'name' },
      {
        title: 'Loại',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (v) => TYPE_OPTIONS.find((option) => option.value === v)?.label || v,
      },
      {
        title: 'Tồn kho',
        dataIndex: 'quantityInStock',
        key: 'stock',
        width: 120,
        render: (value, record) => {
          const lowStock =
            Number.isFinite(record.minimumStock) &&
            record.minimumStock !== null &&
            value <= record.minimumStock;
          return (
            <Space>
              <Text strong={lowStock}>{value ?? 0}</Text>
              {lowStock && <Tag color="red">Thấp</Tag>}
            </Space>
          );
        },
      },
      {
        title: 'Tồn tối thiểu',
        dataIndex: 'minimumStock',
        key: 'minimumStock',
        width: 120,
        render: (v) => v ?? '-',
      },
      {
        title: 'Đơn giá',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 140,
        render: (v) => (v == null ? '-' : `${Number(v).toLocaleString('vi-VN')} VND`),
      },
      {
        title: 'Kích hoạt',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 100,
        render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'Có' : 'Không'}</Tag>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 160,
        render: (_, record) => (
          <Space>
            <Tooltip title={canWriteModule ? 'Sửa' : 'Không có quyền'}>
              <Button
                size="small"
                icon={<EditOutlined />}
                disabled={!canWriteModule}
                onClick={() => navigate(`/accessories/${record.id}`)}
              />
            </Tooltip>
            <Tooltip title={canWriteModule ? 'Nhập kho' : 'Không có quyền'}>
              <Button
                size="small"
                icon={<InboxOutlined />}
                disabled={!canWriteModule}
                onClick={() => openImportModal(record)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [canWriteModule, navigate],
  );

  if (!canReadModule) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Quản lý phụ kiện</h2>
        <Space>
          <Button icon={<ToolOutlined />} onClick={() => navigate('/accessories/issue')}>
            Cấp phát phụ kiện
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWriteModule}
            onClick={() => navigate('/accessories/new')}
          >
            Thêm phụ kiện
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Tìm theo mã/tên"
            style={{ width: 260 }}
            onSearch={(value) => setQuery((prev) => ({ ...prev, keyword: value, page: 1 }))}
          />
          <Select
            allowClear
            placeholder="Loại"
            style={{ width: 160 }}
            options={TYPE_OPTIONS}
            value={query.type}
            onChange={(value) => setQuery((prev) => ({ ...prev, type: value, page: 1 }))}
          />
          <Select
            allowClear
            placeholder="Kích hoạt"
            style={{ width: 140 }}
            value={query.isActive}
            onChange={(value) => setQuery((prev) => ({ ...prev, isActive: value, page: 1 }))}
            options={[
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Ngừng dùng' },
            ]}
          />
          <Button onClick={loadData}>Làm mới</Button>
        </Space>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total: (query.page - 1) * query.pageSize + items.length + (items.length === query.pageSize ? query.pageSize : 0),
          showSizeChanger: true,
          onChange: (page, pageSize) => setQuery((prev) => ({ ...prev, page, pageSize })),
        }}
      />

      <Modal
        title={`Nhập kho${selectedAccessory ? ` - ${selectedAccessory.name}` : ''}`}
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
        okButtonProps={{ loading: importing }}
      >
        <Form layout="vertical" form={importForm}>
          <Form.Item
            name="quantity"
            label="Số lượng"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng' },
              { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Người thực hiện (người dùng hiện tại)">
            <Switch checked disabled />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
