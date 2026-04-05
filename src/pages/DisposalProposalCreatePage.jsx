import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import disposalProposalApi from '../api/disposalProposalApi';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../services/AuthContext';

const unwrapData = (res) => res?.data?.data || res?.data || [];
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.Message || fallback;

const isDisposedStatus = (status) =>
  String(status || '').toLowerCase() === 'disposed' ||
  String(status || '').toLowerCase() === 'liquidated';

export default function DisposalProposalCreatePage() {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const prefilledVehicleId = Number(searchParams.get('vehicleId'));

  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const canCreate = useMemo(() => roles.includes('Operator'), [roles]);

  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const selectedVehicleId = Form.useWatch('vehicleId', form);

  const loadVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const res = await vehicleApi.getList();
      const list = unwrapData(res);
      const activeVehicles = (Array.isArray(list) ? list : []).filter((v) => !isDisposedStatus(v.status));
      setVehicles(activeVehicles);

      if (prefilledVehicleId > 0) {
        form.setFieldsValue({ vehicleId: prefilledVehicleId });
      }
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể tải danh sách xe'));
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleSubmit = async (values) => {
    try {
      const payload = {
        vehicleId: values.vehicleId,
        proposedPrice: values.proposedPrice ?? 0,
        reason: values.reason?.trim(),
      };
      setSubmitting(true);
      const res = await disposalProposalApi.create(payload);
      const created = unwrapData(res);
      message.success('Tạo đề xuất thanh lý thành công');
      navigate(created?.id ? `/disposal-proposals/${created.id}` : '/disposal-proposals');
    } catch (err) {
      message.error(getErrorMessage(err, 'Tạo đề xuất thất bại'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) {
    return <Card>Bạn không có quyền tạo đề xuất thanh lý.</Card>;
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }} onClick={() => navigate('/disposal-proposals')}>
        Quay lại
      </Button>

      <Card title="Tạo đề xuất thanh lý xe">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="vehicleId"
            label="Xe"
            rules={[{ required: true, message: 'Vui lòng chọn xe' }]}
          >
            <Select
              loading={loadingVehicles}
              showSearch
              optionFilterProp="label"
              placeholder="Chọn xe cần thanh lý"
              options={vehicles.map((v) => ({
                value: v.id,
                label: `${v.licensePlate || 'Không biển số'} - ${v.modelName || ''} (#${v.id})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="proposedPrice"
            label="Giá đề xuất"
            rules={[
              { required: true, message: 'Vui lòng nhập giá đề xuất' },
              { type: 'number', min: 0, message: 'Giá đề xuất phải >= 0' },
            ]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Lý do thanh lý"
            rules={[
              { required: true, message: 'Vui lòng nhập lý do thanh lý' },
              { min: 3, message: 'Lý do tối thiểu 3 ký tự' },
            ]}
          >
            <Input.TextArea rows={4} maxLength={1000} showCount />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            {selectedVehicleId ? (
              <Button onClick={() => navigate(`/disposal-proposals/vehicle/${selectedVehicleId}/insight?vehicleId=${selectedVehicleId}`)}>
                Xem lịch sử sửa chữa và số km
              </Button>
            ) : null}
            <Button onClick={() => navigate('/disposal-proposals')}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Tạo đề xuất
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
