import { useState, useEffect } from 'react';
import pendingApi from '../api/pendingApi';
import { Table, Tag, Input, Select, Space, message } from 'antd';

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

export default function PendingRequestsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);

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
        (LOAI_YC[r.type] || r.type || '').toLowerCase().includes(q);
    }
    return true;
  });

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; }
  };

  const columns = [
    { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
    {
      title: 'Loại', dataIndex: 'type', key: 'type',
      render: (t) => <Tag color={LOAI_MAU[t] || 'default'}>{LOAI_YC[t] || t}</Tag>,
    },
    { title: 'Mô tả', dataIndex: 'description', key: 'desc', render: (v) => v || '—', ellipsis: true },
    { title: 'Người tạo', dataIndex: 'proposerName', key: 'proposer', render: (v) => v || '—' },
    { title: 'Ngày tạo', dataIndex: 'requestDate', key: 'date', render: formatDate },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s) => <Tag color="orange">{s === 'Pending' ? 'Chờ duyệt' : s || 'Chờ duyệt'}</Tag> },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Yêu cầu chờ duyệt</h2>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search placeholder="Tìm kiếm theo mô tả..." allowClear style={{ width: 320 }}
          onSearch={setSearch} onChange={(e) => !e.target.value && setSearch('')} />
        <Select placeholder="Tất cả loại" allowClear style={{ width: 170 }} value={typeFilter} onChange={setTypeFilter}
          options={Object.entries(LOAI_YC).map(([k, v]) => ({ value: k, label: v }))} />
      </Space>
      <Table dataSource={filtered} columns={columns} rowKey={(r) => `${r.type}-${r.id}`} loading={loading}
        size="middle" pagination={{ pageSize: 10, showSizeChanger: true }} />
    </div>
  );
}
