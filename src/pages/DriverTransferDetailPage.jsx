import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Card, Checkbox, message, Space, Table, Tag } from 'antd';
import driverTransferApi from '../api/driverTransferApi';
import driverApi from '../api/driverApi';
import { useAuth } from '../services/AuthContext';

const statusLabel = { Pending: 'Chờ xử lý', InProgress: 'Đang điều chuyển', Completed: 'Hoàn thành', Cancelled: 'Đã hủy' };

export default function DriverTransferDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const userBranchId = user?.branchId;

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await driverTransferApi.getRequestById(id);
      const dto = res.data;
      setRequest(dto);
      if (userBranchId && dto.requestingBranchId !== userBranchId && ['Pending', 'InProgress'].includes(dto.status)) {
        const avail = await driverApi.getAvailable(userBranchId);
        setAvailable(avail.data || []);
      } else {
        setAvailable([]);
      }
    } catch {
      message.error('Không thể tải chi tiết điều chuyển');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id, userBranchId]);

  const canConfirm = useMemo(() => {
    if (!request || !userBranchId) return false;
    return request.requestingBranchId !== userBranchId && ['Pending', 'InProgress'].includes(request.status);
  }, [request, userBranchId]);

  const onConfirm = async () => {
    if (!selected.length) return;
    const selectedIds = selected.slice(0, request.remainingQuantity);
    try {
      setSubmitting(true);
      await driverTransferApi.confirmTransfer(id, { driverIds: selectedIds });
      message.success('Xác nhận điều chuyển thành công');
      setSelected([]);
      loadData();
    } catch (e) {
      message.error(e.response?.data?.message || 'Không thể xác nhận điều chuyển');
    }
    setSubmitting(false);
  };

  if (!request) return <Card loading={loading} />;

  return (
    <div>
      <h2>Chi tiết yêu cầu #{request.id}</h2>
      <Card loading={loading} style={{ marginBottom: 16 }}>
        <Space wrap>
          <Tag>Chi nhánh yêu cầu: {request.requestingBranchName}</Tag>
          <Tag>Người tạo: {request.createdByUserName}</Tag>
          <Tag>Ghi chú: {request.reason && request.reason.trim() ? request.reason : 'Không có'}</Tag>
          <Tag>Số lượng cần: {request.requestedQuantity}</Tag>
          <Tag>Đã chuyển: {request.fulfilledQuantity}</Tag>
          <Tag>Còn lại: {request.remainingQuantity}</Tag>
          <Tag color={request.status === 'Completed' ? 'green' : request.status === 'Cancelled' ? 'red' : request.status === 'InProgress' ? 'blue' : 'gold'}>
            Trạng thái: {statusLabel[request.status] || request.status}
          </Tag>
        </Space>
      </Card>
      <Card title="Lịch sử điều chuyển" style={{ marginBottom: 16 }}>
        <Table
          rowKey="id"
          dataSource={request.transferDetails || []}
          pagination={false}
          columns={[
            { title: 'Tài xế', dataIndex: 'driverName' },
            { title: 'GPLX', dataIndex: 'driverLicenseNumber' },
            { title: 'SĐT', dataIndex: 'driverPhone' },
            { title: 'Chi nhánh gốc', dataIndex: 'fromBranchName' },
            { title: 'Người xác nhận', dataIndex: 'confirmedByUserName' },
            { title: 'Ngày chuyển', dataIndex: 'transferDate', render: (v) => (v ? new Date(v).toLocaleString('vi-VN') : '-') },
          ]}
        />
      </Card>
      {canConfirm && (
        <Card title="Xác nhận điều chuyển">
          <Alert
            style={{ marginBottom: 12 }}
            type="info"
            showIcon
            message={`Bạn có thể chọn tối đa ${request.remainingQuantity} tài xế cho lần xác nhận này.`}
          />
          <Table
            rowKey="id"
            dataSource={available}
            pagination={false}
            columns={[
              {
                title: '',
                render: (_, r) => (
                  <Checkbox
                    checked={selected.includes(r.id)}
                    disabled={!selected.includes(r.id) && selected.length >= request.remainingQuantity}
                    onChange={(e) => setSelected((prev) => e.target.checked ? [...prev, r.id] : prev.filter((idItem) => idItem !== r.id))}
                  />
                ),
              },
              { title: 'Tên', dataIndex: 'name' },
              { title: 'GPLX', dataIndex: 'licenseNumber' },
              { title: 'SĐT', dataIndex: 'phone' },
              { title: 'Chi nhánh', dataIndex: 'branchName' },
            ]}
          />
          {available.length === 0 && (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message="Chi nhánh hiện tại chưa có tài xế rảnh để điều chuyển."
            />
          )}
          <div style={{ marginTop: 12 }}>
            <Button type="primary" onClick={onConfirm} disabled={!selected.length} loading={submitting}>
              Xác nhận {selected.length} tài xế
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
