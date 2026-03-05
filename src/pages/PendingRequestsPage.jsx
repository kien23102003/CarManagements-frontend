import { useState, useEffect } from 'react';
import pendingApi from '../api/pendingApi';
import { Table, Tag, Input, Select, Space, Button, Modal, Descriptions, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';

const LOAI_YC = {
  Purchase: 'Mua xe',
  Disposal: 'Thanh lý',
  Maintenance: 'Bảo trì',
  OverBudgetRepair: 'Vượt ngân sách',
  Transfer: 'Điều chuyển',
};

const LOAI_MAU = {
  Purchase: 'green',
  Disposal: 'red',
  Maintenance: 'orange',
  OverBudgetRepair: 'volcano',
  Transfer: 'blue',
};

const TRANG_THAI = {
  Pending: { label: 'Chờ duyệt', color: 'orange' },
  Approved: { label: 'Đã duyệt', color: 'green' },
  Rejected: { label: 'Từ chối', color: 'red' },
};

export default function PendingRequestsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await pendingApi.getList();
      setItems(data.data || data || []);
    } catch { message.error('Không thể tải danh sách yêu cầu'); }
    setLoading(false);
  };

  const filtered = items.filter((r) => {
    if (typeFilter && r.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.description || '').toLowerCase().includes(q) ||
        (LOAI_YC[r.type] || r.type || '').toLowerCase().includes(q) ||
        (r.vehicleLicensePlate || '').toLowerCase().includes(q) ||
        (r.proposerName || '').toLowerCase().includes(q);
    }
    return true;
  });

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; }
  };

  const formatDateTime = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('vi-VN'); } catch { return d; }
  };

  const formatAmount = (v) => {
    if (v == null) return '—';
    return `${Number(v).toLocaleString('vi-VN')} đ`;
  };

  const handleViewDetail = (record) => {
    setSelectedItem(record);
    setDetailOpen(true);
  };

  const columns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
    {
      title: 'Loại', dataIndex: 'type', key: 'type',
      render: (t) => <Tag color={LOAI_MAU[t] || 'default'}>{LOAI_YC[t] || t}</Tag>,
    },
    { title: 'Mô tả', dataIndex: 'description', key: 'desc', render: (v) => v || '—', ellipsis: true },
    { title: 'Biển số xe', dataIndex: 'vehicleLicensePlate', key: 'plate', render: (v) => v ? <strong>{v}</strong> : '—', width: 120 },
    { title: 'Người tạo', dataIndex: 'proposerName', key: 'proposer', render: (v) => v || '—' },
    { title: 'Ngày tạo', dataIndex: 'requestDate', key: 'date', render: formatDate },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (s) => {
        const cfg = TRANG_THAI[s] || { label: s || 'Chờ duyệt', color: 'orange' };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Hành động', key: 'action', width: 100, align: 'center',
      render: (_, record) => (
        <Button
          size="small"
          type="primary"
          ghost
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  // Label for "Số tiền" depends on the type
  const getAmountLabel = (type) => {
    switch (type) {
      case 'Purchase': return 'Chi phí đề xuất';
      case 'Disposal': return 'Giá đề xuất';
      case 'Maintenance': return 'Chi phí ước tính';
      case 'OverBudgetRepair': return 'Số tiền vượt ngân sách';
      case 'Transfer': return 'Số tiền';
      default: return 'Số tiền';
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Yêu cầu chờ duyệt</h2>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder="Tìm kiếm theo mô tả, biển số, người tạo..." allowClear style={{ width: 360 }}
          onSearch={setSearch} onChange={(e) => !e.target.value && setSearch('')} />
        <Select placeholder="Tất cả loại" allowClear style={{ width: 170 }} value={typeFilter} onChange={setTypeFilter}
          options={Object.entries(LOAI_YC).map(([k, v]) => ({ value: k, label: v }))} />
      </Space>
      <Table dataSource={filtered} columns={columns} rowKey={(r) => `${r.type}-${r.id}`} loading={loading}
        size="middle" pagination={{ pageSize: 10, showSizeChanger: true }} />

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EyeOutlined style={{ color: '#1890ff' }} />
            <span>Chi tiết yêu cầu #{selectedItem?.id}</span>
          </div>
        }
        footer={
          <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
        }
        onCancel={() => setDetailOpen(false)}
        width={600}
      >
        {selectedItem && (
          <Descriptions bordered column={1} size="middle" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Mã yêu cầu">
              <strong>#{selectedItem.id}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Loại yêu cầu">
              <Tag color={LOAI_MAU[selectedItem.type] || 'default'} style={{ fontSize: 14 }}>
                {LOAI_YC[selectedItem.type] || selectedItem.type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {(() => {
                const cfg = TRANG_THAI[selectedItem.status] || { label: selectedItem.status || 'Chờ duyệt', color: 'orange' };
                return <Tag color={cfg.color} style={{ fontSize: 14 }}>{cfg.label}</Tag>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="Mô tả">
              {selectedItem.description || '—'}
            </Descriptions.Item>
            {selectedItem.vehicleLicensePlate && (
              <Descriptions.Item label="Biển số xe">
                <strong>{selectedItem.vehicleLicensePlate}</strong>
              </Descriptions.Item>
            )}
            <Descriptions.Item label={getAmountLabel(selectedItem.type)}>
              {formatAmount(selectedItem.amount)}
            </Descriptions.Item>
            <Descriptions.Item label="Người tạo">
              {selectedItem.proposerName || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày yêu cầu">
              {formatDate(selectedItem.requestDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian tạo">
              {formatDateTime(selectedItem.createdAt)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
