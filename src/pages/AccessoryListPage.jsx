import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Image,
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
  formatCurrency,
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
        message.error(error.response?.data?.message || 'Khong the tai danh sach phu kien');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [canReadModule, message, query]);

  const columns = useMemo(
    () => [
      {
        title: 'Hinh anh',
        dataIndex: 'imageUrl',
        key: 'imageUrl',
        width: 110,
        render: (value) =>
          value ? (
            <Image
              src={value}
              alt="Accessory"
              width={52}
              height={52}
              style={{ objectFit: 'cover', borderRadius: 8 }}
            />
          ) : (
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
              }}
            >
              N/A
            </div>
          ),
      },
      { title: 'Ma', dataIndex: 'code', key: 'code', width: 140 },
      { title: 'Ten', dataIndex: 'name', key: 'name' },
      {
        title: 'Loai',
        dataIndex: 'type',
        key: 'type',
        width: 140,
        render: (value) => ACCESSORY_TYPE_OPTIONS.find((item) => item.value === value)?.label || value,
      },
      {
        title: 'Don gia',
        dataIndex: 'unitPrice',
        key: 'unitPrice',
        width: 150,
        render: formatCurrency,
      },
      {
        title: 'Ton toi thieu mac dinh',
        dataIndex: 'minimumStock',
        key: 'minimumStock',
        width: 170,
        render: (value) => value ?? '-',
      },
      {
        title: 'Trang thai',
        dataIndex: 'isActive',
        key: 'isActive',
        width: 120,
        render: (value) => <Tag color={value ? 'green' : 'default'}>{value ? 'Dang dung' : 'Ngung dung'}</Tag>,
      },
      {
        title: 'Ghi chu',
        key: 'stockHint',
        width: 220,
        render: () => <Text type="secondary">Ton kho thuc te duoc theo doi theo chi nhanh.</Text>,
      },
      {
        title: 'Thao tac',
        key: 'actions',
        width: 100,
        render: (_, record) => (
          <Tooltip title={canWriteModule ? 'Sua' : 'Khong co quyen'}>
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
    return <Card>Ban khong co quyen truy cap chuc nang nay.</Card>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Quan ly phu kien</h2>
        <Space>
          <Button onClick={() => navigate('/branch-accessory-stock')}>Ton kho chi nhanh</Button>
          <Button onClick={() => navigate('/accessory-purchase-requests')}>Phieu de xuat mua</Button>
          <Button onClick={() => navigate('/accessory-goods-receipts')}>Phieu nhap hang</Button>
          <Button onClick={() => navigate('/vehicle-accessory-requirements')}>Dinh muc phu kien</Button>
          <Button onClick={() => navigate('/accessories/issue')}>Cap phat phu kien</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canWriteModule}
            onClick={() => navigate('/accessories/new')}
          >
            Them phu kien
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Tim theo ma/ten"
            style={{ width: 260 }}
            onSearch={(value) => setQuery((prev) => ({ ...prev, keyword: value, page: 1 }))}
          />
          <Select
            allowClear
            placeholder="Loai"
            style={{ width: 180 }}
            options={ACCESSORY_TYPE_OPTIONS}
            value={query.type}
            onChange={(value) => setQuery((prev) => ({ ...prev, type: value, page: 1 }))}
          />
          <Select
            allowClear
            placeholder="Trang thai"
            style={{ width: 160 }}
            value={query.isActive}
            onChange={(value) => setQuery((prev) => ({ ...prev, isActive: value, page: 1 }))}
            options={[
              { value: true, label: 'Dang dung' },
              { value: false, label: 'Ngung dung' },
            ]}
          />
          <Switch
            checkedChildren="Dang hoat dong"
            unCheckedChildren="Tat ca"
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
