import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import maintenanceApi from '../api/maintenanceApi';
import { Table, Tag, Button, Select, Space, Popconfirm, Modal, Form, Input, message } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';

const TRANG_THAI = {
  Pending: 'Chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
  InProgress: 'Đang xử lý',
  Completed: 'Hoàn thành',
};

const TRANG_THAI_MAU = {
  Pending: 'orange',
  Approved: 'green',
  Rejected: 'red',
  InProgress: 'blue',
  Completed: 'green',
};

const LOAI_BT = {
  Periodic: 'Định kỳ',
  Breakdown: 'Sửa chữa/hỏng hóc',
  Routine: 'Định kỳ',
  Emergency: 'Sửa chữa/hỏng hóc',
  Repair: 'Sửa chữa/hỏng hóc',
};

export default function MaintenanceListPage() {
  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalId, setApprovalId] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles || [];
  const isAccountant = roles.includes('Branch Asset Accountant');
  const isOperator = roles.includes('Operator');

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.maintenanceType = typeFilter;
      const { data } = await maintenanceApi.getList(params);
      setItems(data.data || data || []);
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      message.error(serverMsg ? `${status || ''} ${serverMsg}`.trim() : 'Không thể tải danh sách bảo trì');
      setItems([]);
    }
    setLoading(false);
  };

  const openApprovalModal = (id, status) => {
    setApprovalId(id);
    setApprovalStatus(status);
    form.resetFields();
    setApprovalOpen(true);
  };

  const closeApprovalModal = () => {
    setApprovalOpen(false);
    setApprovalId(null);
    setApprovalStatus(null);
    form.resetFields();
  };

  const handleApproval = async () => {
    if (!approvalId || !approvalStatus) return;

    try {
      const values = await form.validateFields();
      const note = values?.note?.trim();
      const payload = {
        status: approvalStatus,
        approvedDate: new Date().toISOString().split('T')[0],
      };

      if (approvalStatus === 'Approved' && note) {
        payload.approvalNote = note;
      }

      if (approvalStatus === 'Rejected') {
        payload.rejectionReason = note;
      }

      setApproving(true);
      await maintenanceApi.approve(approvalId, payload);
      message.success(approvalStatus === 'Approved' ? 'Đã duyệt' : 'Đã từ chối');
      closeApprovalModal();
      loadData();
    } catch (err) {
      if (err?.errorFields) return; // form validation error
      message.error(err.response?.data?.message || 'Có lỗi');
    }

    setApproving(false);
  };

  const handleDelete = async (id) => {
    try {
      await maintenanceApi.delete(id);
      message.success('Đã xóa');
      loadData();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi');
    }
  };

  const handleComplete = async (id) => {
    try {
      await maintenanceApi.update(id, { status: 'Completed', completionDate: new Date().toISOString().split('T')[0] });
      message.success('Đã hoàn thành bảo trì');
      loadData();
    } catch (err) { message.error(err.response?.data?.message || 'Có lỗi'); }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
    { title: 'Loại', dataIndex: 'maintenanceType', key: 'type', render: (v) => LOAI_BT[v] || v },
    { title: 'Mô tả', dataIndex: 'description', key: 'desc', render: (v) => v || '—', ellipsis: true },
    { title: 'Chi phí ước tính', dataIndex: 'estimatedCost', key: 'cost', render: (v) => (v ? `${v.toLocaleString('vi-VN')} đ` : '—') },
    { title: 'Ngày yêu cầu', dataIndex: 'requestDate', key: 'date', render: (v) => v || '—' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s) => <Tag color={TRANG_THAI_MAU[s] || 'default'}>{TRANG_THAI[s] || s}</Tag>,
    },
    {
      title: 'Hành động', key: 'action', width: 260,
      render: (_, m) => (
        <Space>
          {isOperator && m.status === 'Pending' && (
            <Button size="small" onClick={() => navigate(`/maintenance/${m.id}`)}>Sửa</Button>
          )}
          {isOperator && m.status === 'Approved' && (
            <Popconfirm title="Xác nhận hoàn thành bảo trì?" onConfirm={() => handleComplete(m.id)}>
              <Button size="small" type="primary" icon={<PlayCircleOutlined />}>Thực hiện</Button>
            </Popconfirm>
          )}
          {isAccountant && m.status === 'Pending' && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => openApprovalModal(m.id, 'Approved')}>Duyệt</Button>
              <Button size="small" danger icon={<CloseOutlined />} onClick={() => openApprovalModal(m.id, 'Rejected')}>Từ chối</Button>
            </>
          )}

          <Popconfirm title="Xoá yêu cầu này?" onConfirm={() => handleDelete(m.id)}>
            <Button size="small" danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Yêu cầu bảo trì</h2>
        {isOperator && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/maintenance/new')}>
            Tạo yêu cầu
          </Button>
        )}
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Tất cả trạng thái"
          allowClear
          style={{ width: 160 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={Object.entries(TRANG_THAI).map(([k, v]) => ({ value: k, label: v }))}
        />
        <Select
          placeholder="Tất cả loại"
          allowClear
          style={{ width: 180 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: 'Periodic', label: 'Định kỳ' },
            { value: 'Breakdown', label: 'Sửa chữa/hỏng hóc' },
          ]}
        />
      </Space>

      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="middle"
        pagination={{ pageSize: 10, showSizeChanger: true }}
      />

      <Modal
        open={approvalOpen}
        title={approvalStatus === 'Approved' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu'}
        okText={approvalStatus === 'Approved' ? 'Duyệt' : 'Từ chối'}
        cancelText="Huỷ"
        onCancel={closeApprovalModal}
        onOk={handleApproval}
        okButtonProps={{ loading: approving }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="note"
            label={approvalStatus === 'Approved' ? 'Ghi chú phê duyệt (tuỳ chọn)' : 'Lý do từ chối'}
            rules={approvalStatus === 'Rejected' ? [{ required: true, message: 'Vui lòng nhập lý do từ chối' }] : []}
          >
            <Input.TextArea
              rows={4}
              maxLength={500}
              showCount
              placeholder={approvalStatus === 'Approved' ? 'Nhập ghi chú...' : 'Nhập lý do từ chối...'}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

