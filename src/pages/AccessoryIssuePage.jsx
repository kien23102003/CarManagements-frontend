import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Button, Card, DatePicker, Form, Input, InputNumber, Select } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import accessoryApi from '../api/accessoryApi';
import assetApi from '../api/assetApi';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../services/AuthContext';
import {
  branchIdValue,
  branchOption,
  canIssueAccessory,
  canViewAccessoryAcrossBranches,
  isDisposedVehicleStatus,
  unwrapData,
} from '../services/accessoryHelpers';

export default function AccessoryIssuePage() {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetVehicleId = searchParams.get('vehicleId');
  const { user } = useAuth();
  const roles = user?.roles || [];
  const writable = useMemo(() => canIssueAccessory(roles), [roles]);
  const canViewAcrossBranches = useMemo(() => canViewAccessoryAcrossBranches(roles), [roles]);

  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branchLoading, setBranchLoading] = useState(false);

  const selectedBranchId = Form.useWatch('branchId', form);

  useEffect(() => {
    const loadDropdown = async () => {
      try {
        const [branchRes, vehicleRes] = await Promise.all([
          assetApi.getBranches(),
          vehicleApi.getList(),
        ]);
        const branchList = unwrapData(branchRes.data);
        const vehicleList = unwrapData(vehicleRes.data).filter((vehicle) => !isDisposedVehicleStatus(vehicle.status));
        setBranches(branchList);
        setVehicles(vehicleList);

        const defaultBranchId = user?.branchId || branchIdValue(branchList[0]);
        form.setFieldsValue({
          branchId: defaultBranchId,
          vehicleId: presetVehicleId ? Number(presetVehicleId) : undefined,
          quantity: 1,
          installDate: dayjs(),
        });
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải dữ liệu danh mục');
      }
    };

    loadDropdown();
  }, [form, message, presetVehicleId, user?.branchId]);

  useEffect(() => {
    if (!selectedBranchId) {
      setStockItems([]);
      return;
    }

    const loadBranchStock = async () => {
      setBranchLoading(true);
      try {
        const { data } = await accessoryApi.getBranchStocks({ branchId: selectedBranchId, page: 1, pageSize: 500 });
        setStockItems(unwrapData(data));
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải tồn kho chi nhánh');
        setStockItems([]);
      } finally {
        setBranchLoading(false);
      }
    };

    loadBranchStock();
  }, [message, selectedBranchId]);

  const branchOptions = branches.map(branchOption);

  const vehicleOptions = vehicles
    .filter((vehicle) => !selectedBranchId || vehicle.currentBranchId === selectedBranchId)
    .map((vehicle) => ({
      value: vehicle.id,
      label: `${vehicle.licensePlate || `Xe #${vehicle.id}`} - ${vehicle.modelName || 'Chưa rõ loại xe'}`,
    }));

  const accessoryOptions = stockItems.map((item) => ({
    value: item.accessoryId,
    label: `${item.accessoryCode || ''} ${item.accessoryName || ''}`.trim(),
    stock: item.quantityInStock,
  }));

  const handleBranchChange = () => {
    form.setFieldsValue({ accessoryId: undefined, vehicleId: presetVehicleId ? Number(presetVehicleId) : undefined });
  };

  const handleSubmit = async (values) => {
    if (!writable) {
      return;
    }

    const selectedVehicle = vehicles.find((vehicle) => vehicle.id === values.vehicleId);
    const selectedAccessory = stockItems.find((item) => item.accessoryId === values.accessoryId);

    if (!selectedVehicle) {
      message.error('Không tìm thấy xe được chọn');
      return;
    }

    if (selectedVehicle.currentBranchId !== values.branchId) {
      message.error('Xe không thuộc chi nhánh đã chọn');
      return;
    }

    if (!selectedAccessory) {
      message.error('Phụ kiện không tồn tại trong kho chi nhánh');
      return;
    }

    if (values.quantity > selectedAccessory.quantityInStock) {
      message.error(`Số lượng vượt tồn kho chi nhánh. Còn lại: ${selectedAccessory.quantityInStock}`);
      return;
    }

    setLoading(true);
    try {
      await accessoryApi.issueVehicleAccessory({
        branchId: values.branchId,
        vehicleId: values.vehicleId,
        accessoryId: values.accessoryId,
        quantity: values.quantity,
        installDate: values.installDate ? values.installDate.format('YYYY-MM-DD') : null,
        notes: values.notes,
      });
      message.success('Cấp phát phụ kiện thành công');
      navigate(`/vehicles/${values.vehicleId}/accessories`);
    } catch (error) {
      message.error(error.response?.data?.message || 'Cấp phát phụ kiện thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!writable) {
    return <Card>Bạn không có quyền cấp phát phụ kiện.</Card>;
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/accessories')} style={{ marginBottom: 12 }}>
        Quay lại
      </Button>
      <h2 style={{ marginTop: 0 }}>Cấp phát phụ kiện cho xe</h2>

      <Card>
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          {canViewAcrossBranches && (
            <Form.Item
              name="branchId"
              label="Chi nhánh"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}
            >
              <Select
                options={branchOptions}
                onChange={handleBranchChange}
                disabled={Boolean(user?.branchId) && !canViewAcrossBranches}
                loading={branchLoading}
              />
            </Form.Item>
          )}

          <Form.Item
            name="vehicleId"
            label="Xe"
            rules={[{ required: true, message: 'Vui lòng chọn xe' }]}
          >
            <Select showSearch optionFilterProp="label" options={vehicleOptions} />
          </Form.Item>

          <Form.Item
            name="accessoryId"
            label="Phụ kiện"
            rules={[{ required: true, message: 'Vui lòng chọn phụ kiện' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={branchLoading}
              options={accessoryOptions.map((item) => ({
                value: item.value,
                label: `${item.label} (tồn: ${item.stock})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Số lượng"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng' },
              { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0' },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="installDate" label="Ngày lắp">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => navigate('/accessories')}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Cấp phát
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
