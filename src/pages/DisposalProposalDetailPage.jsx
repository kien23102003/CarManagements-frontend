import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import disposalProposalApi from '../api/disposalProposalApi';
import accessoryApi from '../api/accessoryApi';
import { useAuth } from '../services/AuthContext';

const STATUS_META = {
  Pending: { label: 'Chờ duyệt', color: 'orange' },
  Approved: { label: 'Đã duyệt', color: 'green' },
  Rejected: { label: 'Từ chối', color: 'red' },
};

const unwrapData = (res) => res?.data?.data || res?.data || null;
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.Message || fallback;
const disablePastDate = (current) => current && current.startOf('day').isBefore(dayjs().startOf('day'));

export default function DisposalProposalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isExecutive = useMemo(() => roles.includes('Executive Management'), [roles]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [activeAccessories, setActiveAccessories] = useState([]);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  const loadActiveAccessories = async (vehicleId) => {
    if (!vehicleId) {
      setActiveAccessories([]);
      return;
    }

    try {
      const res = await accessoryApi.getVehicleAccessories(vehicleId, true);
      const items = res.data?.data || res.data || [];
      setActiveAccessories(Array.isArray(items) ? items : []);
    } catch {
      setActiveAccessories([]);
    }
  };

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await disposalProposalApi.getById(id);
      const nextProposal = unwrapData(res);
      setProposal(nextProposal);
      await loadActiveAccessories(nextProposal?.vehicleId);
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể tải chi tiết đề xuất'));
      setProposal(null);
      setActiveAccessories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleApprove = async () => {
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
      await disposalProposalApi.approve(id, payload);
      message.success('Duyệt đề xuất thành công');
      setApproveOpen(false);
      loadDetail();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(getErrorMessage(err, 'Không thể duyệt đề xuất'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      const values = await rejectForm.validateFields();
      setSubmitting(true);
      await disposalProposalApi.reject(id, { rejectNote: values.rejectNote?.trim() });
      message.success('Đã từ chối đề xuất');
      setRejectOpen(false);
      loadDetail();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(getErrorMessage(err, 'Không thể từ chối đề xuất'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!proposal) {
    return <Card>Không tìm thấy đề xuất.</Card>;
  }

  const statusMeta = STATUS_META[proposal.status] || { label: proposal.status || '-', color: 'default' };
  const canApproveReject = isExecutive && proposal.status === 'Pending';
  const hasActiveAccessories = activeAccessories.length > 0;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }} onClick={() => navigate('/disposal-proposals')}>
        Quay lại
      </Button>
      <Card
        title={`Chi tiết đề xuất thanh lý #${proposal.id}`}
        extra={
          <Tag color={statusMeta.color} style={{ fontSize: 14 }}>
            {statusMeta.label}
          </Tag>
        }
      >
        {canApproveReject && hasActiveAccessories && (
          <Alert
            style={{ marginBottom: 16 }}
            type="warning"
            showIcon
            message="Xe vẫn còn phụ kiện đang gắn"
            description={`Cần xử lý ${activeAccessories.length} phụ kiện đang Installed trước khi duyệt thanh lý.`}
          />
        )}

        <Descriptions bordered column={1}>
          <Descriptions.Item label="Mã xe">{proposal.vehicleId || '-'}</Descriptions.Item>
          <Descriptions.Item label="Biển số xe">{proposal.vehicleLicensePlate || '-'}</Descriptions.Item>
          <Descriptions.Item label="Giá đề xuất">
            {proposal.proposedPrice == null ? '-' : `${Number(proposal.proposedPrice).toLocaleString('vi-VN')} đ`}
          </Descriptions.Item>
          <Descriptions.Item label="Lý do">{proposal.reason || '-'}</Descriptions.Item>
          <Descriptions.Item label="Người đề xuất">{proposal.proposerName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Người duyệt">{proposal.managerName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Ngày tạo">
            {proposal.createdDate ? dayjs(proposal.createdDate).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Ngày duyệt">
            {proposal.approvedDate ? dayjs(proposal.approvedDate).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
        </Descriptions>

        {proposal.vehicleId && (
          <Space style={{ marginTop: 16 }}>
            <Button onClick={() => navigate(`/disposal-proposals/vehicle/${proposal.vehicleId}/insight?proposalId=${proposal.id}`)}>
              Xem lịch sử sửa chữa và số km
            </Button>
          </Space>
        )}

        {hasActiveAccessories && (
          <Card size="small" title="Phụ kiện đang gắn trên xe" style={{ marginTop: 16 }}>
            {activeAccessories.map((item) => (
              <div key={item.id}>
                {item.accessoryCode || item.accessoryId || '-'} - {item.accessoryName || 'Phụ kiện'} x {item.quantity}
              </div>
            ))}
          </Card>
        )}

        {canApproveReject && (
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => setApproveOpen(true)} disabled={hasActiveAccessories}>
              Duyệt
            </Button>
            <Button danger onClick={() => setRejectOpen(true)}>Từ chối</Button>
          </Space>
        )}
      </Card>

      <Modal
        open={approveOpen}
        title="Duyệt đề xuất thanh lý"
        okText="Duyệt"
        cancelText="Hủy"
        onCancel={() => setApproveOpen(false)}
        onOk={handleApprove}
        okButtonProps={{ loading: submitting, disabled: hasActiveAccessories }}
      >
        {hasActiveAccessories && (
          <Alert
            style={{ marginBottom: 16 }}
            type="warning"
            showIcon
            message="Không thể duyệt thanh lý"
            description="Xe vẫn còn phụ kiện đang gắn. Vui lòng thu hồi, trả, báo hỏng hoặc báo mất toàn bộ phụ kiện trước."
          />
        )}
        <Form form={approveForm} layout="vertical">
          <Form.Item name="changeDate" label="Ngày ghi nhận biến động">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={disablePastDate} />
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
