import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Form, InputNumber, Modal, Select, Space, Table, Tag } from 'antd';
import accessoryApi from '../api/accessoryApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../services/AuthContext';
import {
  branchOption,
  canManageBranchStock,
  canReadAccessoryModule,
  canViewAccessoryAcrossBranches,
  unwrapData,
} from '../services/accessoryHelpers';

export default function BranchAccessoryStockPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canReadAccessoryModule(roles), [roles]);
  const writable = useMemo(() => canManageBranchStock(roles), [roles]);
  const canViewAcrossBranches = useMemo(() => canViewAccessoryAcrossBranches(roles), [roles]);
  const [form] = Form.useForm();

  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    branchId: user?.branchId || undefined,
    accessoryId: undefined,
    belowMinimumOnly: false,
    page: 1,
    pageSize: 10,
  });
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const { data } = await assetApi.getBranches();
        setBranches(unwrapData(data));
      } catch {
        setBranches([]);
      }
    };

    loadBranches();
  }, []);

  useEffect(() => {
    if (!readable) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const { data } = await accessoryApi.getBranchStocks(filters);
        setItems(unwrapData(data));
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải tồn kho chi nhánh');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters, message, readable]);

  const branchOptions = branches.map(branchOption);

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      branchId: record.branchId,
      accessoryId: record.accessoryId,
      quantityInStock: record.quantityInStock,
      minimumStock: record.minimumStock,
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await accessoryApi.upsertBranchStock(values);
      message.success('Cập nhật tồn kho chi nhánh thành công');
      setEditingItem(null);
      const { data } = await accessoryApi.getBranchStocks(filters);
      setItems(unwrapData(data));
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error.response?.data?.message || 'Không thể cập nhật tồn kho');
      }
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Mã phụ kiện', dataIndex: 'accessoryCode', key: 'accessoryCode', width: 140 },
    { title: 'Tên phụ kiện', dataIndex: 'accessoryName', key: 'accessoryName' },
    { title: 'Loại', dataIndex: 'accessoryType', key: 'accessoryType', width: 140 },
    { title: 'Tồn kho', dataIndex: 'quantityInStock', key: 'quantityInStock', width: 120 },
    { title: 'Tồn tối thiểu', dataIndex: 'minimumStock', key: 'minimumStock', width: 130, render: (value) => value ?? '-' },
    {
      title: 'Cảnh báo',
      key: 'warning',
      width: 130,
      render: (_, record) =>
        record.isBelowMinimum ? <Tag color="red">Thiếu hàng</Tag> : <Tag color="green">Ổn định</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button size="small" disabled={!writable} onClick={() => handleEdit(record)}>
          Điều chỉnh
        </Button>
      ),
    },
  ];

  if (canViewAcrossBranches) {
    columns.unshift({
      title: 'Chi nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      width: 180,
      render: (value, record) => value || `Chi nhánh #${record.branchId}`,
    });
  }

  if (!readable) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Tồn kho phụ kiện theo chi nhánh</h2>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          {canViewAcrossBranches && (
            <Select
              allowClear={!user?.branchId}
              placeholder="Chi nhánh"
              style={{ width: 180 }}
              disabled={Boolean(user?.branchId) && !canViewAcrossBranches}
              value={filters.branchId}
              options={branchOptions}
              onChange={(value) => setFilters((prev) => ({ ...prev, branchId: value, page: 1 }))}
            />
          )}
          <InputNumber
            placeholder="Mã phụ kiện"
            min={1}
            value={filters.accessoryId}
            onChange={(value) => setFilters((prev) => ({ ...prev, accessoryId: value ?? undefined, page: 1 }))}
          />
          <Select
            value={filters.belowMinimumOnly}
            style={{ width: 180 }}
            onChange={(value) => setFilters((prev) => ({ ...prev, belowMinimumOnly: value, page: 1 }))}
            options={[
              { value: false, label: 'Tất cả' },
              { value: true, label: 'Chỉ hàng thiếu' },
            ]}
          />
        </Space>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total: (filters.page - 1) * filters.pageSize + items.length + (items.length === filters.pageSize ? filters.pageSize : 0),
          showSizeChanger: true,
          onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })),
        }}
      />

      <Modal
        title="Điều chỉnh tồn kho chi nhánh"
        open={Boolean(editingItem)}
        onCancel={() => setEditingItem(null)}
        onOk={handleSave}
        okButtonProps={{ loading: saving }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="branchId" label="Chi nhánh">
            <Select disabled options={branchOptions} />
          </Form.Item>
          <Form.Item name="accessoryId" label="Mã phụ kiện">
            <InputNumber disabled style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="quantityInStock"
            label="Tồn kho"
            rules={[
              { required: true, message: 'Vui lòng nhập tồn kho' },
              { type: 'number', min: 0, message: 'Tồn kho phải lớn hơn hoặc bằng 0' },
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="minimumStock" label="Tồn tối thiểu">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
