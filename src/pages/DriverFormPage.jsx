import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, DatePicker, Form, Input, message, Select } from 'antd';
import dayjs from 'dayjs';
import driverApi from '../api/driverApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../services/AuthContext';

export default function DriverFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles || [];
  const isBranchScoped = roles.includes('Operator') || roles.includes('Branch Asset Accountant');
  const currentUserBranchId = user?.branchId;

  useEffect(() => {
    (async () => {
      try {
        const branchRes = await assetApi.getBranches();
        const allBranches = branchRes.data?.data || branchRes.data || [];
        const branchOptions = isBranchScoped && currentUserBranchId
          ? allBranches.filter((b) => b.id === currentUserBranchId)
          : allBranches;
        setBranches(branchOptions);
        if (isEdit) {
          const res = await driverApi.getById(id);
          const dto = res.data;
          form.setFieldsValue({
            ...dto,
            hireDate: dto.hireDate ? dayjs(dto.hireDate) : null,
            branchId: isBranchScoped && currentUserBranchId ? currentUserBranchId : dto.branchId,
          });
        } else if (isBranchScoped && currentUserBranchId) {
          form.setFieldsValue({ branchId: currentUserBranchId });
        }
      } catch {
        message.error('Không thể tải dữ liệu tài xế');
      }
    })();
  }, [id, isBranchScoped, currentUserBranchId]);

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, hireDate: values.hireDate ? values.hireDate.format('YYYY-MM-DD') : null };
      if (isEdit) await driverApi.update(id, payload);
      else await driverApi.create(payload);
      message.success(isEdit ? 'Cập nhật tài xế thành công' : 'Tạo tài xế thành công');
      navigate('/drivers');
    } catch (e) {
      message.error(e.response?.data?.message || 'Không thể lưu tài xế');
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>{isEdit ? 'Cập nhật tài xế' : 'Thêm tài xế'}</h2>
      <Card>
        {isBranchScoped && (
          <Alert
            style={{ marginBottom: 12 }}
            type="info"
            showIcon
            message="Tài khoản của bạn chỉ được thao tác tài xế trong chi nhánh hiện tại."
          />
        )}
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item label="Tên tài xế" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="GPLX" name="licenseNumber" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="SĐT" name="phone"><Input /></Form.Item>
          <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item>
          <Form.Item label="Ngày vào làm" name="hireDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Chi nhánh" name="branchId" rules={[{ required: true }]}>
            <Select
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              disabled={isBranchScoped}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => navigate('/drivers')}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>{isEdit ? 'Cập nhật' : 'Tạo mới'}</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
