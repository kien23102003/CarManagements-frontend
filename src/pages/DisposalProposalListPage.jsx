import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import { EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import disposalProposalApi from '../api/disposalProposalApi';
import vehicleApi from '../api/vehicleApi';
import accessoryApi from '../api/accessoryApi';
import { useAuth } from '../services/AuthContext';

const { RangePicker } = DatePicker;

const STATUS_META = {
  Pending: { label: 'Chờ duyệt', color: 'orange' },
  Approved: { label: 'Đã duyệt', color: 'green' },
  Rejected: { label: 'Từ chối', color: 'red' },
};

const canRead = (roles) =>
  roles.includes('Operator') ||
  roles.includes('Branch Asset Accountant') ||
  roles.includes('Executive Management');

const isExecutive = (roles) => roles.includes('Executive Management');
const isOperator = (roles) => roles.includes('Operator');

const unwrapData = (res) => res?.data?.data || res?.data || [];

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.Message || fallback;

export default function DisposalProposalListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];

  const readable = useMemo(() => canRead(roles), [roles]);
  const executive = useMemo(() => isExecutive(roles), [roles]);
  const operator = useMemo(() => isOperator(roles), [roles]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState({
    keyword: '',
    status: undefined,
    vehicleId: undefined,
    proposerId: undefined,
    dateRange: null,
    page: 1,
    pageSize: 10,
  });

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [activeProposalId, setActiveProposalId] = useState(null);
  const [activeProposalVehicleLicensePlate, setActiveProposalVehicleLicensePlate] = useState(null);
  const [activeAccessories, setActiveAccessories] = useState([]);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const loadVehicles = async () => {
    try {
      const res = await vehicleApi.getList();
      const list = unwrapData(res);
      setVehicles(Array.isArray(list) ? list : []);
    } catch {
      setVehicles([]);
    }
  };

  const loadData = async () => {
    if (!readable) return;
    setLoading(true);
    try {
      const params = {
        status: filters.status,
        vehicleId: filters.vehicleId,
        proposerId: filters.proposerId,
        fromDate: filters.dateRange?.[0] ? dayjs(filters.dateRange[0]).format('YYYY-MM-DD') : undefined,
        toDate: filters.dateRange?.[1] ? dayjs(filters.dateRange[1]).format('YYYY-MM-DD') : undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      };

      const res = await disposalProposalApi.getList(params);
      const payload = unwrapData(res);
      const list = Array.isArray(payload?.items) ? payload.items : [];
      setItems(list);
      setTotalCount(payload?.totalCount ?? list.length);
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể tải danh sách đề xuất thanh lý'));
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveAccessories = async (vehicleId) => {
    if (!vehicleId) {
      setActiveAccessories([]);
      return;
    }

    try {
      const res = await accessoryApi.getVehicleAccessories(vehicleId, true);
      const nextItems = res.data?.data || res.data || [];
      setActiveAccessories(Array.isArray(nextItems) ? nextItems : []);
    } catch {
      setActiveAccessories([]);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    loadData();
  }, [readable, filters.status, filters.vehicleId, filters.proposerId, filters.dateRange, filters.page, filters.pageSize]);

  const filteredItems = useMemo(() => {
    if (!filters.keyword?.trim()) return items;
    const q = filters.keyword.trim().toLowerCase();
    return items.filter((x) =>
      String(x.id).includes(q) ||
      (x.vehicleLicensePlate || '').toLowerCase().includes(q) ||
      (x.proposerName || '').toLowerCase().includes(q) ||
      (x.managerName || '').toLowerCase().includes(q) ||
      (x.reason || '').toLowerCase().includes(q)
    );
  }, [items, filters.keyword]);

  const openApproveModal = async (proposal) => {
    setActiveProposalId(proposal.id);
    setActiveProposalVehicleLicensePlate(proposal.vehicleLicensePlate || null);
    approveForm.resetFields();
    await loadActiveAccessories(proposal.vehicleId);
    setApproveOpen(true);
  };

  const openRejectModal = (id) => {
    setActiveProposalId(id);
    rejectForm.resetFields();
    setRejectOpen(true);
  };

  const handleApprove = async () => {
    if (!activeProposalId) return;
    if (activeAccessories.length > 0) {
      message.error('Xe vẫn còn phụ kiện đang gắn. Vui lòng xử lý toàn bộ phụ kiện trước khi thanh lý.');
      return;
    }

    try {
      const values = await approveForm.validateFields();
      const payload = {
        changeDate: values.changeDate ? dayjs(values.changeDate).format('YYYY-MM-DD') : undefined,
        notes: values.notes?.trim() || undefined,
      };

      setSubmitting(true);
      await disposalProposalApi.approve(activeProposalId, payload);
      message.success('Duyệt đề xuất thành công');
      setApproveOpen(false);
      setActiveProposalId(null);
      setActiveProposalVehicleLicensePlate(null);
      setActiveAccessories([]);
      loadData();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(getErrorMessage(err, 'Không thể duyệt đề xuất'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!activeProposalId) return;
    try {
      const values = await rejectForm.validateFields();
      setSubmitting(true);
      await disposalProposalApi.reject(activeProposalId, {
        rejectNote: values.rejectNote?.trim(),
      });
      message.success('Đã từ chối đề xuất');
      setRejectOpen(false);
      setActiveProposalId(null);
      loadData();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(getErrorMessage(err, 'Không thể từ chối đề xuất'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!readable) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  const columns = [
    {
      title: 'Mã',
      dataIndex: 'id',
      width: 70,
      render: (id) => <b>#{id}</b>,
    },
    {
      title: 'Biển số xe',
      dataIndex: 'vehicleLicensePlate',
      render: (v) => v || '-',
    },
    {
      title: 'Người đề xuất',
      dataIndex: 'proposerName',
      render: (v) => v || '-',
    },
    {
      title: 'Người duyệt',
      dataIndex: 'managerName',
      render: (v) => v || '-',
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdDate',
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Ngày duyệt',
      dataIndex: 'approvedDate',
      render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => {
        const meta = STATUS_META[status] || { label: status || '-', color: 'default' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Giá đề xuất',
      dataIndex: 'proposedPrice',
      render: (v) => (v == null ? '-' : `${Number(v).toLocaleString('vi-VN')} đ`),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/disposal-proposals/${record.id}`)}
          >
            Chi tiết
          </Button>
          {executive && record.status === 'Pending' && (
            <>
              <Button size="small" type="primary" onClick={() => openApproveModal(record)}>
                Duyệt
              </Button>
              <Button size="small" danger onClick={() => openRejectModal(record.id)}>
                Từ chối
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Đề xuất thanh lý xe</h2>
        {operator && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/disposal-proposals/new')}>
            Tạo đề xuất
          </Button>
        )}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            allowClear
            style={{ width: 280 }}
            placeholder="Tìm theo mã, biển số, lý do..."
            prefix={<SearchOutlined />}
            value={filters.keyword}
            onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 160 }}
            value={filters.status}
            onChange={(v) => setFilters((prev) => ({ ...prev, status: v, page: 1 }))}
            options={[
              { value: 'Pending', label: 'Chờ duyệt' },
              { value: 'Approved', label: 'Đã duyệt' },
              { value: 'Rejected', label: 'Từ chối' },
            ]}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Xe"
            style={{ width: 220 }}
            value={filters.vehicleId}
            onChange={(v) => setFilters((prev) => ({ ...prev, vehicleId: v, page: 1 }))}
            options={vehicles.map((v) => ({
              value: v.id,
              label: `${v.licensePlate || 'Không biển số'} (#${v.id})`,
            }))}
          />
          <InputNumber
            min={1}
            placeholder="Proposer ID"
            value={filters.proposerId}
            onChange={(v) => setFilters((prev) => ({ ...prev, proposerId: v ?? undefined, page: 1 }))}
          />
          <RangePicker
            value={filters.dateRange}
            onChange={(v) => setFilters((prev) => ({ ...prev, dateRange: v, page: 1 }))}
            format="YYYY-MM-DD"
          />
        </Space>
      </Card>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filteredItems}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total: totalCount,
          showSizeChanger: true,
          onChange: (page, pageSize) => setFilters((prev) => ({ ...prev, page, pageSize })),
        }}
      />

      <Modal
        open={approveOpen}
        title="Duyệt đề xuất thanh lý"
        okText="Duyệt"
        cancelText="Hủy"
        onCancel={() => {
          setApproveOpen(false);
          setActiveProposalId(null);
          setActiveProposalVehicleLicensePlate(null);
          setActiveAccessories([]);
        }}
        onOk={handleApprove}
        okButtonProps={{ loading: submitting, disabled: activeAccessories.length > 0 }}
      >
        {activeAccessories.length > 0 && (
          <Alert
            style={{ marginBottom: 16 }}
            type="warning"
            showIcon
            message="Không thể duyệt thanh lý"
            description={`Xe ${activeProposalVehicleLicensePlate || '-'} vẫn còn ${activeAccessories.length} phụ kiện đang gắn. Vui lòng xử lý hết trước khi duyệt.`}
          />
        )}
        <Form form={approveForm} layout="vertical">
          <Form.Item name="changeDate" label="Ngày ghi nhận biến động">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={rejectOpen}
        title="Từ chối đề xuất thanh lý"
        okText="Từ chối"
        okButtonProps={{ danger: true, loading: submitting }}
        cancelText="Hủy"
        onCancel={() => setRejectOpen(false)}
        onOk={handleReject}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="rejectNote"
            label="Lý do từ chối"
            rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối' }]}
          >
            <Input.TextArea rows={4} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
