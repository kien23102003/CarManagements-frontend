import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import distributionApi from '../api/distributionApi';
import vehicleApi from '../api/vehicleApi';
import { Card, Form, Select, DatePicker, Button, Spin, message, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

export default function TransferFormPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userBranchId = user?.branchId;
  const userBranchName = user?.branchName;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stockRes, vehicleRes] = await Promise.all([
        distributionApi.getStock(),
        vehicleApi.getList(userBranchId ? { branchId: userBranchId } : {}),
      ]);
      const stockData = stockRes.data?.data || stockRes.data || [];
      const vehicleData = vehicleRes.data?.data || vehicleRes.data || [];

      setBranches(stockData);
      setVehicles(vehicleData.filter((v) => v.status === 'Active'));

      // Auto-set fromBranchId for the accountant
      if (userBranchId) {
        form.setFieldsValue({ fromBranchId: userBranchId });
      }
    } catch { message.error('Không thể tải dữ liệu'); }
    setLoading(false);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await distributionApi.createTransfer({
        vehicleId: values.vehicleId,
        fromBranchId: values.fromBranchId,
        toBranchId: values.toBranchId,
        planDate: values.planDate ? values.planDate.format('YYYY-MM-DD') : null,
      });
      message.success('Tạo kế hoạch thành công');
      navigate('/distribution');
    } catch (err) { message.error(err.response?.data?.message || 'Có lỗi'); }
    setSaving(false);
  };

  // Filter out the fromBranch from toBranch options
  const fromBranchId = Form.useWatch('fromBranchId', form);
  const toBranchOptions = branches
    .filter((b) => b.branchId !== fromBranchId)
    .map((b) => ({ value: b.branchId, label: b.branchName || `Chi nhánh #${b.branchId}` }));

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/distribution')} style={{ marginBottom: 16 }}>Quay lại</Button>
      <h2>Tạo kế hoạch điều chuyển</h2>

      {userBranchId && (
        <Alert
          message={`Bạn đang tạo kế hoạch từ chi nhánh: ${userBranchName || `#${userBranchId}`}`}
          type="info"
          showIcon
          style={{ marginBottom: 16, marginTop: 8 }}
        />
      )}

      <Card style={{ borderRadius: 12, marginTop: 8 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Form.Item name="vehicleId" label="Xe" rules={[{ required: true, message: 'Vui lòng chọn xe' }]}>
              <Select
                showSearch
                placeholder="Chọn xe..."
                optionFilterProp="label"
                options={vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.licensePlate || '—'} — ${v.manufacturer || ''} ${v.modelName || ''}`.trim(),
                }))}
              />
            </Form.Item>

            <Form.Item name="fromBranchId" label="Từ chi nhánh" rules={[{ required: true, message: 'Bắt buộc' }]}>
              <Select
                placeholder="Chọn chi nhánh nguồn"
                disabled={!!userBranchId}
                options={branches.map((b) => ({
                  value: b.branchId,
                  label: b.branchName || `Chi nhánh #${b.branchId}`,
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

            <Form.Item name="planDate" label="Ngày kế hoạch">
              <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
            </Form.Item>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Button onClick={() => navigate('/distribution')}>Huỷ</Button>
            <Button type="primary" htmlType="submit" loading={saving}>Tạo mới</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
