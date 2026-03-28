import { useEffect, useMemo, useState } from 'react';
import { App, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from 'antd';
import accessoryApi from '../api/accessoryApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../services/AuthContext';
import {
  canManageAccessoryRequirements,
  canReadAccessoryModule,
  unwrapData,
} from '../services/accessoryHelpers';

export default function VehicleAccessoryRequirementsPage() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canReadAccessoryModule(roles), [roles]);
  const writable = useMemo(() => canManageAccessoryRequirements(roles), [roles]);
  const [form] = Form.useForm();

  const [models, setModels] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ modelId: undefined });
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const [vehicleRes, accessoryRes] = await Promise.all([
          assetApi.getList(),
          accessoryApi.getAccessories({ page: 1, pageSize: 500 }),
        ]);
        const vehicleItems = unwrapData(vehicleRes.data);
        const branchModels = Array.from(
          vehicleItems
            .filter((item) => (item.modelId || item.id) && (item.modelName || item.manufacturer))
            .reduce((map, item) => {
              const modelId = item.modelId || item.id;
              if (!map.has(modelId)) {
                map.set(modelId, {
                  id: modelId,
                  manufacturer: item.manufacturer,
                  modelName: item.modelName,
                });
              }
              return map;
            }, new Map())
            .values()
        );

        setModels(branchModels);
        setAccessories(unwrapData(accessoryRes.data));
      } catch {
        setModels([]);
        setAccessories([]);
      }
    };

    loadBaseData();
  }, []);

  useEffect(() => {
    if (!readable) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const { data } = await accessoryApi.getVehicleAccessoryRequirements(filters.modelId ? { modelId: filters.modelId } : undefined);
        setItems(unwrapData(data));
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải định mức phụ kiện');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters.modelId, message, readable]);

  const modelOptions = models.map((item) => ({
    value: item.id || item.modelId,
    label: `${item.manufacturer || ''} ${item.modelName || ''}`.trim() || `Model #${item.id || item.modelId}`,
  }));

  const accessoryOptions = accessories.map((item) => ({
    value: item.id,
    label: `${item.code || ''} ${item.name || ''}`.trim(),
  }));

  const openCreate = () => {
    setEditingItem({ id: null });
    form.resetFields();
  };

  const openEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      modelId: record.modelId,
      accessoryId: record.accessoryId,
      requiredQuantity: record.requiredQuantity,
      isMandatory: record.isMandatory,
      notes: record.notes,
    });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingItem?.id) {
        await accessoryApi.updateVehicleAccessoryRequirement(editingItem.id, values);
        message.success('Cập nhật định mức thành công');
      } else {
        await accessoryApi.createVehicleAccessoryRequirement(values);
        message.success('Tạo định mức thành công');
      }
      setEditingItem(null);
      const { data } = await accessoryApi.getVehicleAccessoryRequirements(filters.modelId ? { modelId: filters.modelId } : undefined);
      setItems(unwrapData(data));
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error.response?.data?.message || 'Không thể lưu định mức');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    try {
      await accessoryApi.deleteVehicleAccessoryRequirement(record.id);
      message.success('Xóa định mức thành công');
      const { data } = await accessoryApi.getVehicleAccessoryRequirements(filters.modelId ? { modelId: filters.modelId } : undefined);
      setItems(unwrapData(data));
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xóa định mức');
    }
  };

  const columns = [
    { title: 'Model xe', dataIndex: 'modelName', key: 'modelName' },
    { title: 'Phụ kiện', dataIndex: 'accessoryName', key: 'accessoryName' },
    { title: 'Mã', dataIndex: 'accessoryCode', key: 'accessoryCode', width: 120 },
    { title: 'Số lượng cần', dataIndex: 'requiredQuantity', key: 'requiredQuantity', width: 120 },
    {
      title: 'Bắt buộc',
      dataIndex: 'isMandatory',
      key: 'isMandatory',
      width: 100,
      render: (value) => <Tag color={value ? 'red' : 'default'}>{value ? 'Có' : 'Không'}</Tag>,
    },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', render: (value) => value || '-' },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button size="small" disabled={!writable} onClick={() => openEdit(record)}>
            Sửa
          </Button>
          <Button size="small" danger disabled={!writable} onClick={() => handleDelete(record)}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ];

  if (!readable) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Định mức phụ kiện theo model xe</h2>
        <Button type="primary" disabled={!writable} onClick={openCreate}>
          Thêm định mức
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Select
          allowClear
          placeholder="Lọc theo model xe"
          style={{ width: 280 }}
          value={filters.modelId}
          options={modelOptions}
          onChange={(value) => setFilters({ modelId: value })}
        />
      </Card>

      <Table rowKey="id" loading={loading} columns={columns} dataSource={items} />

      <Modal
        title={editingItem?.id ? 'Cập nhật định mức phụ kiện' : 'Thêm định mức phụ kiện'}
        open={Boolean(editingItem)}
        onCancel={() => setEditingItem(null)}
        onOk={handleSave}
        okButtonProps={{ loading: saving }}
      >
        <Form form={form} layout="vertical" initialValues={{ requiredQuantity: 1, isMandatory: true }}>
          <Form.Item name="modelId" label="Model xe" rules={[{ required: true, message: 'Vui lòng chọn model xe' }]}>
            <Select options={modelOptions} />
          </Form.Item>
          <Form.Item name="accessoryId" label="Phụ kiện" rules={[{ required: true, message: 'Vui lòng chọn phụ kiện' }]}>
            <Select showSearch optionFilterProp="label" options={accessoryOptions} />
          </Form.Item>
          <Form.Item
            name="requiredQuantity"
            label="Số lượng cần"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng cần' },
              { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0' },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="isMandatory" valuePropName="checked">
            <Checkbox>Bắt buộc</Checkbox>
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
