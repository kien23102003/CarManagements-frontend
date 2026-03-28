import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import distributionApi from '../api/distributionApi';
import vehicleApi from '../api/vehicleApi';
import { Card, Form, Select, DatePicker, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export default function TransferFormPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [stockRes, vehicleRes] = await Promise.all([
        distributionApi.getStock(),
        vehicleApi.getList(),
      ]);
      const stockData = stockRes.data?.data || stockRes.data || [];
      const vehicleData = vehicleRes.data?.data || vehicleRes.data || [];

      setBranches(stockData);
      // Loại bỏ xe không được phép điều chuyển (theo backend validation)
      const blockedStatuses = ['Disposed', 'Moving', 'InTransfer'];
      setVehicles(vehicleData.filter((v) => !blockedStatuses.includes(v.status)));
    } catch { message.error('Không thể tải dữ liệu'); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Khi chọn chi nhánh nguồn, lọc xe theo chi nhánh đó
  const fromBranchId = Form.useWatch('fromBranchId', form);
  const filteredVehicles = fromBranchId
    ? vehicles.filter((v) => v.currentBranchId === fromBranchId)
    : vehicles;

  const toBranchOptions = branches
    .filter((b) => b.branchId !== fromBranchId)
    .map((b) => ({ value: b.branchId, label: b.branchName || `Chi nhánh #${b.branchId}` }));

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await distributionApi.createTransfer({
        vehicleId: values.vehicleId,
        fromBranchId: values.fromBranchId,
        toBranchId: values.toBranchId,
        plannedDepartureDate: values.plannedDepartureDate ? values.plannedDepartureDate.format('YYYY-MM-DDTHH:mm:ss') : null,
        plannedArrivalDate: values.plannedArrivalDate ? values.plannedArrivalDate.format('YYYY-MM-DDTHH:mm:ss') : null,
      });
      message.success('Tạo yêu cầu điều chuyển thành công');
      navigate('/distribution');
    } catch (err) { message.error(err.response?.data?.message || 'Có lỗi'); }
    setSaving(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/distribution')} style={{ marginBottom: 16 }}>Quay lại</Button>
      <h2>Tạo yêu cầu điều chuyển</h2>

      <Card style={{ borderRadius: 12, marginTop: 8 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Form.Item name="fromBranchId" label="Từ chi nhánh" rules={[{ required: true, message: 'Bắt buộc' }]}>
              <Select
                showSearch
                placeholder="Chọn chi nhánh nguồn"
                optionFilterProp="label"
                options={branches.map((b) => ({
                  value: b.branchId,
                  label: b.branchName || `Chi nhánh #${b.branchId}`,
                }))}
                onChange={() => form.setFieldValue('vehicleId', undefined)}
              />
            </Form.Item>

            <Form.Item name="vehicleId" label="Xe" rules={[{ required: true, message: 'Vui lòng chọn xe' }]}>
              <Select
                showSearch
                placeholder={fromBranchId ? 'Chọn xe...' : 'Chọn chi nhánh trước'}
                disabled={!fromBranchId}
                optionFilterProp="label"
                options={filteredVehicles.map((v) => ({
                  value: v.id,
                  label: `${v.licensePlate || '—'} — ${v.manufacturer || ''} ${v.modelName || ''}`.trim(),
                }))}
              />
            </Form.Item>

            <Form.Item name="toBranchId" label="Đến chi nhánh" rules={[{ required: true, message: 'Bắt buộc' }]}>
              <Select
                showSearch
                placeholder="Chọn chi nhánh đích"
                optionFilterProp="label"
                options={toBranchOptions}
              />
            </Form.Item>

            <Form.Item name="plannedDepartureDate" label="Ngày khởi hành dự kiến" rules={[{ required: true, message: 'Vui lòng chọn ngày khởi hành' }]}>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                style={{ width: '100%' }}
                format="DD/MM/YYYY HH:mm"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
                placeholder="Chọn ngày giờ khởi hành"
              />
            </Form.Item>

            <Form.Item name="plannedArrivalDate" label="Ngày đến nơi dự kiến" rules={[{ required: true, message: 'Vui lòng chọn ngày đến nơi' }]}>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                style={{ width: '100%' }}
                format="DD/MM/YYYY HH:mm"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
                placeholder="Chọn ngày giờ đến nơi"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Button onClick={() => navigate('/distribution')}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving}>Tạo yêu cầu</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
