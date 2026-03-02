import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Table,
    Tag,
    message,
    Space,
    Button,
    Modal,
    Input,
    Popconfirm,
    Card,
    Typography,
    Select,
    Row,
    Col,
} from 'antd';
import {
    CheckOutlined,
    CloseOutlined,
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import proposalApi from '../api/proposalApi';

const { TextArea } = Input;
const { Title } = Typography;
const { Option } = Select;

const STATUS_CONFIG = {
    Pending: { label: 'Chờ duyệt', color: 'orange' },
    Approved: { label: 'Đã duyệt', color: 'green' },
    Rejected: { label: 'Từ chối', color: 'red' },
};

export default function ProposalListPage() {
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState(null);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await proposalApi.getList();
            setData(res?.data?.data || []);
        } catch {
            message.error('Không tải được danh sách');
        } finally {
            setLoading(false);
        }
    };

    // ===== SEARCH + FILTER =====
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const matchSearch =
                item.id.toString().includes(searchText) ||
                item.description
                    ?.toLowerCase()
                    .includes(searchText.toLowerCase());

            const matchStatus =
                !statusFilter || item.status === statusFilter;

            return matchSearch && matchStatus;
        });
    }, [data, searchText, statusFilter]);

    const handleApprove = async (id) => {
        try {
            await proposalApi.managerApprove(id);
            message.success('Quản lý đã duyệt');
            loadData();
        } catch {
            message.error('Không thể duyệt');
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            message.warning('Nhập lý do từ chối');
            return;
        }

        try {
            await proposalApi.reject(selectedId, {
                reason: rejectReason,
            });
            message.success('Đã từ chối');
            setRejectModalOpen(false);
            setRejectReason('');
            loadData();
        } catch {
            message.error('Từ chối thất bại');
        }
    };

    const handleDelete = async (id) => {
        try {
            await proposalApi.delete(id);
            message.success('Đã xoá');
            loadData();
        } catch {
            message.error('Không thể xoá');
        }
    };

    const columns = [
        {
            title: 'Mã',
            dataIndex: 'id',
            sorter: (a, b) => a.id - b.id,
            render: (id) => <b>#{id}</b>,
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdDate',
            sorter: (a, b) =>
                dayjs(a.createdDate).unix() -
                dayjs(b.createdDate).unix(),
            render: (date) =>
                date ? dayjs(date).format('DD/MM/YYYY') : '-',
        },
        {
            title: 'Chi phí',
            dataIndex: 'proposedCost',
            sorter: (a, b) => a.proposedCost - b.proposedCost,
            render: (cost) =>
                cost
                    ? cost.toLocaleString('vi-VN') + ' đ'
                    : '0 đ',
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            render: (text) => {
                if (!text) return '-';

                const [main, rejectedPart] = text.split('\nRejected:');

                return (
                    <div>
                        <div>{main}</div>

                        {rejectedPart && (
                            <div
                                style={{
                                    marginTop: 6,
                                    padding: '6px 10px',
                                    background: '#fff2f0',
                                    border: '1px solid #ffccc7',
                                    borderRadius: 6,
                                    color: '#cf1322',
                                    fontSize: 13,
                                }}
                            >
                                <b>Lý do từ chối:</b> {rejectedPart.trim()}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            filters: Object.keys(STATUS_CONFIG).map((key) => ({
                text: STATUS_CONFIG[key].label,
                value: key,
            })),
            onFilter: (value, record) =>
                record.status === value,
            render: (status) => {
                const config = STATUS_CONFIG[status] || {
                    label: status,
                    color: 'default',
                };

                return (
                    <Tag
                        color={config.color}
                        style={{
                            borderRadius: 20,
                            padding: '4px 12px',
                            fontWeight: 500,
                        }}
                    >
                        {config.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Hành động',
            render: (_, record) => (
                <Space>
                    {record.status === 'Pending' && (
                        <>
                            <Button
                                size="small"
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={() => handleApprove(record.id)}
                            >
                                Duyệt
                            </Button>

                            <Button
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => {
                                    setSelectedId(record.id);
                                    setRejectModalOpen(true);
                                }}
                            >
                                Từ chối
                            </Button>
                        </>
                    )}

                    <Popconfirm
                        title="Xoá đề xuất này?"
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        >
                            Xoá
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Card
            style={{
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
        >
            <Title level={4}>Danh sách đề xuất mua xe</Title>

            {/* SEARCH + FILTER BAR */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Input
                        placeholder="Tìm theo mã hoặc mô tả..."
                        prefix={<SearchOutlined />}
                        allowClear
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </Col>

                <Col span={6}>
                    <Select
                        placeholder="Lọc theo trạng thái"
                        allowClear
                        style={{ width: '100%' }}
                        onChange={(value) => setStatusFilter(value)}
                    >
                        {Object.keys(STATUS_CONFIG).map((key) => (
                            <Option key={key} value={key}>
                                {STATUS_CONFIG[key].label}
                            </Option>
                        ))}
                    </Select>
                </Col>

                <Col span={6}>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/proposals/create')}
                    >
                        Tạo đề xuất
                    </Button>
                </Col>
            </Row>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredData}
                loading={loading}
                pagination={{ pageSize: 10 }}
                bordered
            />

            <Modal
                title="Lý do từ chối"
                open={rejectModalOpen}
                onOk={handleReject}
                onCancel={() => setRejectModalOpen(false)}
            >
                <TextArea
                    rows={4}
                    placeholder="Nhập lý do từ chối..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                />
            </Modal>
        </Card>
    );
}