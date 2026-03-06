import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import distributionApi from '../api/distributionApi';
import { Tabs, Table, Tag, Button, Card, Row, Col, Statistic, Select, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, CheckOutlined, BankOutlined, PlayCircleOutlined } from '@ant-design/icons';

// Tìm đến dòng này ở đầu file và sửa lại nhãn của Pending
const TRANG_THAI = {
    Pending: 'Đang chờ thực hiện', // Thay đổi từ 'Chờ duyệt' thành 'Đang chờ thực hiện'
    Approved: 'Đã duyệt',
    Rejected: 'Từ chối',
    Executed: 'Đã thực hiện',
    Cancelled: 'Đã huỷ'
};

// Giữ nguyên màu sắc hoặc có thể điều chỉnh nếu muốn
const TRANG_THAI_MAU = {
    Pending: 'orange',
    Approved: 'green',
    Rejected: 'red',
    Executed: 'blue',
    Cancelled: 'default'
};
export default function DistributionPage() {
    const [tab, setTab] = useState('stock');
    const [stock, setStock] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState(null);

    const { user } = useAuth();
    const navigate = useNavigate();

    const roles = user?.roles || [];
    const isAccountant = roles.includes('Branch Asset Accountant');
    const isExec = roles.includes('Executive Management');
    const isOperator = roles.includes('Operator');

    useEffect(() => { loadData(); }, [tab, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'stock') {
                const { data } = await distributionApi.getStock();
                setStock(data.data || data || []);
            } else {
                const params = {};
                if (statusFilter) params.status = statusFilter;
                const { data } = await distributionApi.getTransfers(params);
                setTransfers(data.data || data || []);
            }
        } catch { message.error('Không thể tải dữ liệu'); }
        setLoading(false);
    };

    const handleStatus = async (id, status) => {
        try {
            await distributionApi.updateTransferStatus(id, { status });
            message.success('Cập nhật thành công');
            loadData();
        } catch (err) { message.error(err.response?.data?.message || 'Có lỗi'); }
    };

    // 1. Định nghĩa cột cho bảng danh sách xe (Tab Theo chi nhánh)
    const vehicleColumns = [
        {
            title: 'Biển số',
            dataIndex: 'licensePlate',
            key: 'plate',
            render: (text) => <strong style={{ color: '#1890ff' }}>{text || '—'}</strong>
        },
        {
            title: 'Dòng xe',
            key: 'model',
            render: (_, record) => `${record.manufacturer || ''} ${record.modelName || ''}`.trim() || '—'
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag color={s === 'Active' ? 'green' : s === 'InTransfer' ? 'blue' : 'default'}>
                    {s === 'Active' ? 'Sẵn sàng' : s === 'InTransfer' ? 'Đang chuyển' : s}
                </Tag>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            render: (_, record) => (
                <Button
                    type="link"
                    size="small"
                    // Chỉ Manager (isExec) mới được bấm điều chuyển
                    disabled={!isExec || record.status !== 'Active'}
                    onClick={() => navigate(`/distribution/new?vehicleId=${record.id}&fromBranchId=${record.currentBranchId}`)}
                >
                    Điều chuyển
                </Button>
            ),
        },
    ];

    // 2. Định nghĩa cột cho bảng Kế hoạch (Tab Kế hoạch)
    // Khởi tạo các cột cơ bản trước
    const baseTransferColumns = [
        { title: 'Mã', dataIndex: 'id', key: 'id', render: (id) => `#${id}`, width: 60 },
        { title: 'Biển số', dataIndex: 'licensePlate', key: 'plate', render: (v) => <strong>{v || '—'}</strong> },
        { title: 'Từ', dataIndex: 'fromBranchName', key: 'from' },
        { title: 'Đến', dataIndex: 'toBranchName', key: 'to' },
        { title: 'Ngày KH', dataIndex: 'planDate', key: 'date' },
        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s) => <Tag color={TRANG_THAI_MAU[s] || 'default'}>{TRANG_THAI[s] || s}</Tag> },
    ];

    // Tạo cột hành động riêng cho Operator
    const actionColumn = {
        title: 'Hành động',
        key: 'action',
        align: 'center',
        width: 200,
        render: (_, record) => (
            <Space>
                {isOperator && record.status === 'Approved' && (
                    <Popconfirm
                        title="Xác nhận hoàn thành việc điều chuyển xe?"
                        onConfirm={() => handleStatus(record.id, 'Executed')}
                    >
                        <Button size="small" type="primary" icon={<PlayCircleOutlined />}>
                            Hoàn thành điều chuyển
                        </Button>
                    </Popconfirm>
                )}
            </Space>
        ),
    };

    // Chỉ thêm cột hành động nếu là Operator. Manager và Accountant sẽ ẩn cột này.
    const transferColumns = isOperator ? [...baseTransferColumns, actionColumn] : baseTransferColumns;

    const tabItems = [
        {
            key: 'stock',
            label: 'Theo chi nhánh',
            children: loading ? <Card loading /> : (
                <Row gutter={[16, 16]}>
                    {stock.map((b) => (
                        <Col xs={24} key={b.branchId}>
                            <Card
                                style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                                title={
                                    <Space>
                                        <BankOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                                        <strong>{b.branchName || `Chi nhánh #${b.branchId}`}</strong>
                                    </Space>
                                }
                            >
                                <Row gutter={16} style={{ marginBottom: 20 }}>
                                    <Col span={8}><Statistic title="Tổng xe" value={b.totalVehicles} /></Col>
                                    <Col span={8}><Statistic title="Hoạt động" value={b.activeVehicles} valueStyle={{ color: '#22c55e' }} /></Col>
                                    <Col span={8}><Statistic title="Đang chuyển" value={b.inTransferVehicles} valueStyle={{ color: '#06b6d4' }} /></Col>
                                </Row>
                                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                                    <div style={{ marginBottom: 12, fontWeight: 500 }}>Danh sách xe chi tiết:</div>
                                    <Table
                                        dataSource={b.vehicles}
                                        columns={vehicleColumns}
                                        rowKey="id"
                                        size="small"
                                        pagination={{ pageSize: 5, hideOnSinglePage: true }}
                                    />
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            ),
        },
        {
            key: 'transfers',
            label: 'Kế hoạch điều chuyển',
            children: (
                <div>
                    <Space style={{ marginBottom: 16 }}>
                        <Select
                            placeholder="Lọc trạng thái"
                            allowClear
                            style={{ width: 170 }}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={Object.entries(TRANG_THAI).map(([k, v]) => ({ value: k, label: v }))}
                        />
                    </Space>
                    <Table
                        dataSource={transfers}
                        columns={transferColumns}
                        rowKey="id"
                        loading={loading}
                        size="middle"
                        pagination={{ pageSize: 10 }}
                    />
                </div>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>Điều chuyển xe</h2>
                {isExec && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/distribution/new')}
                    >
                        Tạo kế hoạch
                    </Button>
                )}
            </div>
            <Tabs activeKey={tab} onChange={setTab} items={tabItems} />
        </div>
    );
}