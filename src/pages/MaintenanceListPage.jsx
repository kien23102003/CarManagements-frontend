import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import maintenanceApi from '../api/maintenanceApi';
import { Table, Tag, Button, Select, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons';

const TRANG_THAI = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối', InProgress: 'Đang xử lý', Completed: 'Hoàn thành' };
const TRANG_THAI_MAU = { Pending: 'orange', Approved: 'green', Rejected: 'red', InProgress: 'blue', Completed: 'green' };
const LOAI_BT = { Routine: 'Định kỳ', Emergency: 'Khẩn cấp', Repair: 'Sửa chữa' };

export default function MaintenanceListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const roles = user?.roles || [];
  const isAccountant = roles.includes('BranchAssetAccountant');
  const isOperator = roles.includes('Operator');

  useEffect(() => { loadData(); }, [statusFilter, typeFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.maintenanceType = typeFilter;
      const { data } = await maintenanceApi.getList(params);
      setItems(data.data || data || []);
    } catch { message.error('Không thể tải danh sách bảo trì'); }
    setLoading(false);
  };

  const handleApproval = async (id, status) => {
    try {
      await maintenanceApi.approve(id, { status, approvedDate: new Date().toISOString().split('T')[0] });
      message.success(status === 'Approved' ? 'Đã duyệt' : 'Đã từ chối');
      loadData();
    } catch (err) { message.error(err.response?.data?.message || 'Có lỗi'); }
  };

  const handleDelete = async (id) => {
    try {
      await maintenanceApi.delete(id);
      message.success('Đã xoá');
      loadData();
    } catch (err) { message.error(err.response?.data?.message || 'Có lỗi'); }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
    { title: 'Loại', dataIndex: 'maintenanceType', key: 'type', render: (v) => LOAI_BT[v] || v },
    { title: 'Mô tả', dataIndex: 'description', key: 'desc', render: (v) => v || '—', ellipsis: true },
    { title: 'Chi phí ước tính', dataIndex: 'estimatedCost', key: 'cost', render: (v) => v ? v.toLocaleString('vi-VN') + ' đ' : '—' },
    { title: 'Ngày yêu cầu', dataIndex: 'requestDate', key: 'date', render: (v) => v || '—' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s) => <Tag color={TRANG_THAI_MAU[s] || 'default'}>{TRANG_THAI[s] || s}</Tag> },
    {
      title: 'Hành động', key: 'action', width: 200,
      render: (_, m) => (
        <Space>
          {isOperator && m.status === 'Pending' && (
            <Button size="small" onClick={() => navigate(`/maintenance/${m.id}`)}>Sửa</Button>
          )}
          {isAccountant && m.status === 'Pending' && (
            <>
              <Popconfirm title="Duyệt yêu cầu này?" onConfirm={() => handleApproval(m.id, 'Approved')}>
                <Button size="small" type="primary" icon={<CheckOutlined />} />
              </Popconfirm>
              <Popconfirm title="Từ chối yêu cầu này?" onConfirm={() => handleApproval(m.id, 'Rejected')}>
                <Button size="small" danger icon={<CloseOutlined />} />
              </Popconfirm>
            </>
          )}
          <Popconfirm title="Xoá yêu cầu này?" onConfirm={() => handleDelete(m.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Yêu cầu bảo trì</h2>
        {isOperator && <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/maintenance/new')}>Tạo yêu cầu</Button>}
      </div>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Tất cả trạng thái" allowClear style={{ width: 160 }} value={statusFilter} onChange={setStatusFilter}
          options={Object.entries(TRANG_THAI).map(([k, v]) => ({ value: k, label: v }))} />
        <Select placeholder="Tất cả loại" allowClear style={{ width: 140 }} value={typeFilter} onChange={setTypeFilter}
          options={Object.entries(LOAI_BT).map(([k, v]) => ({ value: k, label: v }))} />
      </Space>
      <Table dataSource={items} columns={columns} rowKey="id" loading={loading} size="middle"
        pagination={{ pageSize: 10, showSizeChanger: true }} />
    </div>
  );
}
