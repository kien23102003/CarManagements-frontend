import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import maintenanceApi from '../api/maintenanceApi';
import { Table, Tag, Button, Select, Space, Popconfirm, Modal, Form, Input, InputNumber, DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import { PlusOutlined, CheckOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';

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
  const [completeForm] = Form.useForm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [approvalId, setApprovalId] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [completeId, setCompleteId] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles || [];
  const isManager = roles.includes('Executive Management') || roles.includes('Manager');
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

  const openCompleteModal = (id, record) => {
    setCompleteId(id);
    completeForm.setFieldsValue({
      actualCost: record?.actualCost ?? null,
      completionNote: record?.completionNote ?? '',
      completionDate: dayjs(),
    });
    setCompleteOpen(true);
  };

  const closeCompleteModal = () => {
    setCompleteOpen(false);
    setCompleteId(null);
    completeForm.resetFields();
  };

  const openDetailModal = (record) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const closeDetailModal = () => {
    setDetailOpen(false);
    setDetailRecord(null);
  };

  const handleComplete = async () => {
    if (!completeId) return;
    try {
      const values = await completeForm.validateFields();
      setCompleting(true);
      await maintenanceApi.update(completeId, {
        status: 'Completed',
        actualCost: values.actualCost,
        completionNote: values.completionNote?.trim(),
        completionDate: values.completionDate?.format('YYYY-MM-DD'),
      });
      message.success('Đã hoàn thành bảo trì');
      closeCompleteModal();
      loadData();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || 'Có lỗi');
    } finally {
      setCompleting(false);
    }
  };

  const handleStart = async (id) => {
    try {
      await maintenanceApi.update(id, { status: 'InProgress' });
      message.success('Đã bắt đầu sửa chữa');
      loadData();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi');
    }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
    {
      title: 'Xe',
      key: 'vehicle',
      render: (_, m) => {
        const plate = m.vehicleLicensePlate || 'Không có biển số';
        const model = m.vehicleModelName || 'Không rõ loại xe';
        return (
          <div>
            <div>{plate}</div>
            <div style={{ color: '#8c8c8c', fontSize: 12 }}>{model}</div>
          </div>
        );
      },
    },
    { title: 'Loại', dataIndex: 'maintenanceType', key: 'type', render: (v) => LOAI_BT[v] || v },
    { title: 'Mô tả yêu cầu', dataIndex: 'description', key: 'desc', render: (v) => v || '—', ellipsis: true },
    { title: 'Kết quả sửa chữa', dataIndex: 'completionNote', key: 'completionNote', render: (v) => v || '—', ellipsis: true },
    { title: 'Chi phí dự tính', dataIndex: 'estimatedCost', key: 'estimatedCost', render: (v) => (v ? `${v.toLocaleString('vi-VN')} đ` : '—') },
    { title: 'Chi phí thực tế', dataIndex: 'actualCost', key: 'actualCost', render: (v) => (v ? `${v.toLocaleString('vi-VN')} đ` : '—') },
    { title: 'Ngày yêu cầu', dataIndex: 'requestDate', key: 'date', render: (v) => v || '—' },
    { title: 'Ngày hoàn thành', dataIndex: 'completionDate', key: 'completionDate', render: (v) => v || '—' },
    { title: 'Ngày phê duyệt', dataIndex: 'approvedDate', key: 'approvedDate', render: (v) => v || '—' },
    { title: 'Người phê duyệt', dataIndex: 'approverName', key: 'approverName', render: (v) => v || '—' },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120,
      render: (s) => <Tag color={TRANG_THAI_MAU[s] || 'default'}>{TRANG_THAI[s] || s}</Tag>,
    },
    {
      title: 'Hành động', key: 'action', width: 300,
      render: (_, m) => (
        <Space>
          <Button size="small" onClick={() => openDetailModal(m)}>Xem chi tiết</Button>
          {isOperator && m.status === 'Pending' && (
            <Button size="small" onClick={() => navigate(`/maintenance/${m.id}`)}>Sửa</Button>
          )}
          {isOperator && m.status === 'Approved' && (
            <Popconfirm title="Xác nhận bắt đầu sửa chữa?" onConfirm={() => handleStart(m.id)}>
              <Button size="small" type="primary">Bắt đầu sửa</Button>
            </Popconfirm>
          )}
          {isOperator && m.status === 'InProgress' && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => openCompleteModal(m.id, m)}>
              Cập nhật chi phí
            </Button>
          )}
          {isManager && m.status === 'Pending' && (
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

      <Modal
        open={completeOpen}
        title="Cập nhật chi phí thực tế"
        okText="Lưu và hoàn thành"
        cancelText="Huỷ"
        onCancel={closeCompleteModal}
        onOk={handleComplete}
        okButtonProps={{ loading: completing }}
      >
        <Form form={completeForm} layout="vertical">
          <Form.Item
            name="actualCost"
            label="Chi phí thực tế"
            rules={[
              { required: true, message: 'Vui lòng nhập chi phí thực tế' },
              { type: 'number', min: 0, message: 'Chi phí thực tế phải lớn hơn hoặc bằng 0' },
            ]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item
            name="completionDate"
            label="Ngày hoàn thành"
            rules={[{ required: true, message: 'Vui lòng nhập ngày hoàn thành' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="completionNote"
            label="Mô tả sau bảo trì"
            rules={[{ required: true, message: 'Vui lòng nhập mô tả sau bảo trì' }]}
          >
            <Input.TextArea
              rows={4}
              maxLength={1000}
              showCount
              placeholder="Ghi lại công việc đã sửa chữa, thay thế, kiểm tra..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={detailOpen}
        title="Chi tiết bảo trì"
        footer={null}
        onCancel={closeDetailModal}
        width={720}
      >
        {detailRecord && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div><strong>Xe:</strong> {detailRecord.vehicleLicensePlate || '-'}</div>
              <div><strong>Loại:</strong> {LOAI_BT[detailRecord.maintenanceType] || detailRecord.maintenanceType || '-'}</div>
              <div><strong>Trạng thái:</strong> {TRANG_THAI[detailRecord.status] || detailRecord.status || '-'}</div>
              <div><strong>Người phê duyệt:</strong> {detailRecord.approverName || '-'}</div>
              <div><strong>Ngày yêu cầu:</strong> {detailRecord.requestDate || '-'}</div>
              <div><strong>Ngày hoàn thành:</strong> {detailRecord.completionDate || '-'}</div>
              <div><strong>Chi phí dự tính:</strong> {detailRecord.estimatedCost == null ? '-' : `${Number(detailRecord.estimatedCost).toLocaleString('vi-VN')} đ`}</div>
              <div><strong>Chi phí thực tế:</strong> {detailRecord.actualCost == null ? '-' : `${Number(detailRecord.actualCost).toLocaleString('vi-VN')} đ`}</div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Mô tả yêu cầu</div>
              <div style={{ whiteSpace: 'pre-wrap', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                {detailRecord.description || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Kết quả sửa chữa</div>
              <div style={{ whiteSpace: 'pre-wrap', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                {detailRecord.completionNote || '—'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

