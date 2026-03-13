import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Spin,
  Tag,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import disposalProposalApi from '../api/disposalProposalApi';
import { useAuth } from '../services/AuthContext';

const STATUS_META = {
  Pending: { label: 'Chờ duyệt', color: 'orange' },
  Approved: { label: 'Đã duyệt', color: 'green' },
  Rejected: { label: 'Từ chối', color: 'red' },
};

const unwrapData = (res) => res?.data?.data || res?.data || null;
const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.Message || fallback;

export default function DisposalProposalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isExecutive = useMemo(() => roles.includes('Executive Management'), [roles]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await disposalProposalApi.getById(id);
      setProposal(unwrapData(res));
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể tải chi tiết đề xuất'));
      setProposal(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleApprove = async () => {
    try {
      const values = await approveForm.validateFields();
      const payload = {
        accountantId: values.accountantId || undefined,
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
    return (
      <Card>
        Không tìm thấy đề xuất.
      </Card>
    );
  }

  const statusMeta = STATUS_META[proposal.status] || { label: proposal.status || '-', color: 'default' };
  const canApproveReject = isExecutive && proposal.status === 'Pending';

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

        {canApproveReject && (
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => setApproveOpen(true)}>Duyệt</Button>
            <Button danger onClick={() => setRejectOpen(true)}>Từ chối</Button>
          </Space>
        )}
      </Card>

      <Modal
        open={approveOpen}
        title="Duyệt đề xuất thanh lý"
        okText="Duyệt"
        cancelText="Huỷ"
        onCancel={() => setApproveOpen(false)}
        onOk={handleApprove}
        okButtonProps={{ loading: submitting }}
      >
        <Form form={approveForm} layout="vertical">
          <Form.Item name="accountantId" label="Accountant ID (tuỳ chọn)">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
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
        cancelText="Huỷ"
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
