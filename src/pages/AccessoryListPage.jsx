import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import accessoryApi from '../api/accessoryApi';
import { useAuth } from '../services/AuthContext';
import {
  ACCESSORY_TYPE_OPTIONS,
  canReadAccessoryModule,
  canWriteAccessoryCatalog,
  unwrapData,
} from '../services/accessoryHelpers';

const { Text } = Typography;

export default function AccessoryListPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const canReadModule = canReadAccessoryModule(roles);
  const canWriteModule = canWriteAccessoryCatalog(roles);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState({
    keyword: '',
    type: undefined,
    isActive: undefined,
    page: 1,
    pageSize: 10,
  });

  useEffect(() => {
    if (!canReadModule) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const params = {
          keyword: query.keyword || undefined,
          type: query.type,
          isActive: query.isActive,
          page: query.page,
          pageSize: query.pageSize,
        };
        const { data } = await accessoryApi.getAccessories(params);
        setItems(unwrapData(data));
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải danh sách phụ kiện');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [canReadModule, message, query]);

  const columns = useMemo(
    () => [
      { title: 'Mã', dataIndex: 'code', key: 'code', width: 140 },
      { title: 'Tên', dataIndex: 'name', key: 'name' },
      {
        title: 'Loại',
        dataIndex: 'type',
        key: 'type',
        width: 140,
        render: (value) => ACCESSORY_TYPE_OPTIONS.find((item) => item.value === value)?.label || value,
      },
      {
        title: 'Tồn tối thiểu mặc định',
        dataIndex: 'minimumStock',
        key: 'minimumStock',
        width: 170,
        render: (value) => value ?? '-',
      },
      {
        title: 'Trạng thái',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 120,
        render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Đang dùng' : 'Ngừng dùng'}</Tag>,
      },
      {
        title: 'Ghi chú',
        key: 'stockHint',
        width: 220,
        render: () => <Text type="secondary">Tồn kho thực tế được theo dõi theo chi nhánh.</Text>,
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 100,
        render: (_, record) => (
          <Tooltip title={canWriteModule ? 'Sửa' : 'Không có quyền'}>
            <Button
              size="small"
              icon={<EditOutlined />}
              disabled={!canWriteModule}
              onClick={() => navigate(`/accessories/${record.id}`)}
            />
          </Tooltip>
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
          <Button onClick={() => navigate('/branch-accessory-stock')}>Tồn kho chi nhánh</Button>
          <Button onClick={() => navigate('/accessory-purchase-requests')}>Phiếu đề xuất mua</Button>
          <Button onClick={() => navigate('/accessory-goods-receipts')}>Phiếu nhập hàng</Button>
          <Button onClick={() => navigate('/vehicle-accessory-requirements')}>Định mức phụ kiện</Button>
          <Button onClick={() => navigate('/accessories/issue')}>Cấp phát phụ kiện</Button>
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
            style={{ width: 180 }}
            options={ACCESSORY_TYPE_OPTIONS}
            value={query.type}
            onChange={(value) => setQuery((prev) => ({ ...prev, type: value, page: 1 }))}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 160 }}
            value={query.isActive}
            onChange={(value) => setQuery((prev) => ({ ...prev, isActive: value, page: 1 }))}
            options={[
              { value: true, label: 'Đang dùng' },
              { value: false, label: 'Ngừng dùng' },
            ]}
          />
          <Switch
            checkedChildren="Đang hoạt động"
            unCheckedChildren="Tất cả"
            checked={query.isActive === true}
            onChange={(checked) => setQuery((prev) => ({ ...prev, isActive: checked ? true : undefined, page: 1 }))}
          />
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
    </div>
  );
}
