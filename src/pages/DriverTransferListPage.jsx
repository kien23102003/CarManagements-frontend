import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import driverTransferApi from '../api/driverTransferApi';
import { useAuth } from '../services/AuthContext';

const statusColor = { Pending: 'gold', InProgress: 'blue', Completed: 'green', Cancelled: 'red' };
const statusLabel = { Pending: 'Chờ xử lý', InProgress: 'Đang điều chuyển', Completed: 'Hoàn thành', Cancelled: 'Đã hủy' };

export default function DriverTransferListPage() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState();
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const isOperator = (user?.roles || []).includes('Operator');
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await driverTransferApi.getRequests(status);
      setData(res.data || []);
    } catch {
      message.error('Không thể tải danh sách điều chuyển');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [status]);

  const onCancel = async (id) => {
    try {
      await driverTransferApi.cancelRequest(id);
      message.success('Hủy yêu cầu thành công');
      loadData();
    } catch (e) {
      message.error(e.response?.data?.message || 'Không thể hủy yêu cầu');
    }
  };

  const createRequest = async (values) => {
    setCreating(true);
    try {
      await driverTransferApi.createRequest({
        requestedQuantity: values.requestedQuantity,
        reason: values.reason?.trim() || null,
      });
      message.success('Tạo yêu cầu thành công');
      setCreateOpen(false);
      form.resetFields();
      loadData();
    } catch (e) {
      message.error(e.response?.data?.message || 'Không thể tạo yêu cầu');
    }
    setCreating(false);
  };

  const stats = useMemo(() => ({
    total: data.length,
    pending: data.filter((r) => r.status === 'Pending').length,
    inProgress: data.filter((r) => r.status === 'InProgress').length,
    completed: data.filter((r) => r.status === 'Completed').length,
  }), [data]);

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Chi nhánh yêu cầu', dataIndex: 'requestingBranchName' },
    { title: 'Người tạo', dataIndex: 'createdByUserName' },
    {
      title: 'Ghi chú',
      dataIndex: 'reason',
      width: 240,
      render: (v) => (v && v.trim() ? v : '-'),
    },
    { title: 'Số lượng cần', dataIndex: 'requestedQuantity' },
    { title: 'Đã chuyển', dataIndex: 'fulfilledQuantity' },
    { title: 'Còn lại', dataIndex: 'remainingQuantity' },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v) => <Tag color={statusColor[v] || 'default'}>{statusLabel[v] || v}</Tag>,
    },
    { title: 'Ngày tạo', dataIndex: 'createdAt', render: (v) => (v ? new Date(v).toLocaleString('vi-VN') : '-') },
    {
      title: 'Thao tác',
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/driver-transfers/${r.id}`)}>Xem</Button>
          {isOperator && <Button size="small" onClick={() => navigate(`/driver-transfers/${r.id}`)}>Xác nhận</Button>}
          {(r.status === 'Pending' || r.status === 'InProgress') && (
            <Popconfirm
              title="Hủy yêu cầu điều chuyển?"
              description="Yêu cầu sẽ chuyển trạng thái Đã hủy."
              onConfirm={() => onCancel(r.id)}
              okText="Hủy yêu cầu"
              cancelText="Đóng"
            >
              <Button size="small" danger>Hủy</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Điều chuyển tài xế</h2>
        {isOperator && <Button type="primary" onClick={() => setCreateOpen(true)}>Tạo yêu cầu</Button>}
      </div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Tag>Tổng yêu cầu: {stats.total}</Tag>
        <Tag color="gold">Chờ xử lý: {stats.pending}</Tag>
        <Tag color="blue">Đang điều chuyển: {stats.inProgress}</Tag>
        <Tag color="green">Hoàn thành: {stats.completed}</Tag>
      </Space>
      <Card>
        <Alert
          style={{ marginBottom: 12 }}
          type="info"
          showIcon
          message="Cột Ghi chú hiển thị lý do điều chuyển do chi nhánh yêu cầu nhập."
        />
        <Space style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="Lọc trạng thái"
            value={status}
            onChange={setStatus}
            options={['Pending', 'InProgress', 'Completed', 'Cancelled'].map((s) => ({ value: s, label: statusLabel[s] || s }))}
            style={{ width: 200 }}
          />
        </Space>
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading} />
      </Card>
      <Modal
        open={createOpen}
        title="Tạo yêu cầu điều chuyển tài xế"
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          layout="vertical"
          form={form}
          onFinish={createRequest}
          initialValues={{ requestedQuantity: 1 }}
        >
          <Form.Item
            name="requestedQuantity"
            label="Số lượng tài xế cần điều chuyển"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do">
            <Input.TextArea rows={3} placeholder="Ví dụ: Cần bổ sung tài xế cho tuyến công tác..." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setCreateOpen(false)}>Đóng</Button>
            <Button type="primary" htmlType="submit" loading={creating}>Tạo yêu cầu</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
