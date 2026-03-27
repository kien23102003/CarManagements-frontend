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
    Tabs,
    Divider,
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
import { useAuth } from '../services/AuthContext';
import PurchasePlanPage from './PurchasePlanPage';


const { TextArea } = Input;
const { Title } = Typography;
const { Option } = Select;

const STATUS_CONFIG = {
    Pending: { label: 'Chờ duyệt', color: 'orange' },
    ManagerApproved: { label: 'Đã duyệt (Quản lý)', color: 'blue' },
    Approved: { label: 'Đã duyệt', color: 'green' },
    Rejected: { label: 'Từ chối', color: 'red' },
    Received_Pending_Payment: { label: 'Chờ thanh toán', color: 'purple' },
    Completed: { label: 'Hoàn thành', color: 'cyan' },
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
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const { user } = useAuth();

    // Kiểm tra quyền (Roles là mảng nên dùng .includes)
    const isExecutive = user?.roles?.some(r => r === 'Executive Management' || r === 'Manager');
    const isAccountant = user?.roles?.some(r => r === 'Branch Asset Accountant' || r === 'Chief Accountant');
    // const isOperator = user?.roles?.includes('Operator');

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
                item.proposalId.toString().includes(searchText) ||
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
        } catch (error) {
            const msg = error?.response?.data?.message || 'Không thể duyệt';
            message.error(msg);
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
        } catch (error) {
            const msg = error?.response?.data?.message || 'Từ chối thất bại';
            message.error(msg);
        }
    };

    const handleDelete = async (id) => {
        try {
            await proposalApi.delete(id);
            message.success('Đã xoá');
            loadData();
        } catch (error) {
            const msg = error?.response?.data?.message || 'Không thể xoá';
            message.error(msg);
        }
    };

    const handleViewDetail = (record) => {
        setSelectedPlan(record);
        setDetailModalOpen(true);
    };

    const columns = [
        {
            title: 'Mã',
            dataIndex: 'proposalId',
            sorter: (a, b) => a.proposalId - b.proposalId,
            render: (id) => <b>#{id}</b>,
        },
        {
            title: 'Ngày hoàn thành',
            dataIndex: 'completionDeadline',
            sorter: (a, b) =>
                dayjs(a.completionDeadline || 0).unix() -
                dayjs(b.completionDeadline || 0).unix(),
            render: (date) => {
                if (!date) return '-';
                const deadline = dayjs(date);
                const today = dayjs().startOf('day');
                const diff = deadline.diff(today, 'day');

                let color = 'blue';
                let text = deadline.format('DD/MM/YYYY');

                if (diff < 0) {
                    color = 'red';
                    text += ` (Quá hạn ${Math.abs(diff)} ngày)`;
                } else if (diff <= 3) {
                    color = 'warning';
                    text += ` (Còn ${diff} ngày)`;
                }

                return <Tag color={color}>{text}</Tag>;
            },
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
            key: 'actions',
            align: 'center',
            width: 300,
            render: (_, record) => {
                // Chỉ cho phép Duyệt, Từ chối, Hủy khi đề xuất đang ở trạng thái Chờ duyệt (Pending)
                const disabled = record.status !== 'Pending';

                return (
                    <Space>
                        <Button
                            size="small"
                            icon={<SearchOutlined />}
                            onClick={() => handleViewDetail(record)}
                        >
                            Chi tiết
                        </Button>

                        {/* CHỈ HIỂN THỊ NÚT DUYỆT/TỪ CHỐI NẾU LÀ MANAGER */}
                        {isExecutive && (
                            <>
                                <Button
                                    size="small"
                                    type="primary"
                                    disabled={disabled}
                                    onClick={() => handleApprove(record.proposalId)}
                                >
                                    Duyệt
                                </Button>
                                <Button
                                    size="small"
                                    danger
                                    disabled={disabled}
                                    onClick={() => {
                                        setSelectedId(record.proposalId);
                                        setRejectModalOpen(true);
                                    }}
                                >
                                    Từ chối
                                </Button>
                            </>
                        )}

                        {!isExecutive && !isAccountant && (
                            <Button
                                size="small"
                                type="default"
                                disabled={disabled}
                                onClick={() => navigate(`/proposals/edit/${record.proposalId}`)}
                            >
                                Sửa
                            </Button>
                        )}

                        {/* ẨN NÚT HỦY ĐỐI VỚI KẾ TOÁN (Chỉ có Quản lý hoặc Người tạo mới được Hủy) */}
                        {!isAccountant && (
                            <Popconfirm
                                title="Hủy đề xuất này?"
                                onConfirm={() => handleDelete(record.proposalId)}
                                disabled={disabled}
                            >
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    disabled={disabled}
                                >
                                    Hủy
                                </Button>
                            </Popconfirm>
                        )}
                    </Space>
                );
            },
        }
    ];

    return (
        <div>
            <Tabs
                defaultActiveKey="plans"
                items={[
                    {
                        key: 'plans',
                        label: '📋 Kế hoạch mua (Ưu tiên)',
                        children: <PurchasePlanPage />,
                    },
                    {
                        key: 'proposals',
                        label: '📝 Danh sách đề xuất',
                        children: (
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
                                        {/* KẾ TOÁN VÀ GIÁM ĐỐC KHÔNG ĐƯỢC TẠO ĐỀ XUẤT */}
                                        {!isExecutive && !isAccountant && (
                                            <Button
                                                type="primary"
                                                icon={<PlusOutlined />}
                                                onClick={() => navigate('/proposals/create')}
                                            >
                                                Tạo đề xuất
                                            </Button>
                                        )}
                                    </Col>
                                </Row>

                                <Table
                                    rowKey="proposalId"
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

                                {/* CHI TIẾT ĐỀ XUẤT CHO GIÁM ĐỐC */}
                                {selectedPlan && (
                                    <Modal
                                        title={`Chi tiết đề xuất #${selectedPlan.proposalId}`}
                                        open={detailModalOpen}
                                        onCancel={() => setDetailModalOpen(false)}
                                        width={800}
                                        footer={[
                                            <Button key="close" onClick={() => setDetailModalOpen(false)}>
                                                Đóng
                                            </Button>
                                        ]}
                                    >
                                        <div style={{ padding: '10px 0' }}>
                                            <Row gutter={[16, 16]}>
                                                <Col xs={24} sm={12}>
                                                    <div><strong>Mô tả:</strong></div>
                                                    <p>{selectedPlan.description}</p>
                                                </Col>
                                                <Col xs={24} sm={12}>
                                                    <div><strong>Chi phí dự kiến:</strong></div>
                                                    <p style={{ color: 'red', fontWeight: 'bold' }}>
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPlan.proposedCost || 0)}
                                                    </p>
                                                </Col>
                                            </Row>

                                            <Divider />

                                            <h4>Chi tiết cấu hình xe đề nghị mua:</h4>
                                            <Table
                                                dataSource={selectedPlan.branchDetails || []}
                                                columns={[
                                                    { title: 'Chi nhánh', dataIndex: 'proposerBranchName', key: 'proposerBranchName', render: (v) => v || '-' },
                                                    { title: 'Nhãn hiệu', dataIndex: 'manufacturer', key: 'manufacturer', render: (v) => v || '-' },
                                                    { title: 'Phiên bản xe', dataIndex: 'version', key: 'version', render: (v) => v || '-' },
                                                    { title: 'Số chỗ', dataIndex: 'seats', key: 'seats', render: (v) => v ? `${v} chỗ` : '-' },
                                                    { title: 'Số lượng', dataIndex: 'proposedQuantity', key: 'proposedQuantity', align: 'center' },
                                                    {
                                                        title: 'P.Thức', dataIndex: 'acquisitionMethod', key: 'acquisitionMethod', render: (v) => { if (v === 'Ownership') return 'Mua đứt'; if (v === 'Lease') return 'Thuê'; if (v === 'Finance') return 'Thuê TC'; return '-'; }
                                                    },
                                                    { title: 'Thuế ĐK', dataIndex: 'registrationTax', render: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0) },
                                                    { title: 'Phí ĐB', dataIndex: 'roadMaintenanceFee', render: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0) },
                                                    { title: 'Phí Biển', dataIndex: 'licensePlateFee', render: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0) },
                                                    { title: 'Bảo hiểm', dataIndex: 'insuranceFee', render: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0) },
                                                    {
                                                        title: 'Đơn giá',
                                                        dataIndex: 'unitPrice',
                                                        key: 'unitPrice',
                                                        align: 'right',
                                                        render: (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)
                                                    },
                                                ]}
                                                pagination={false}
                                                rowKey="branchId"
                                                size="small"
                                                bordered
                                                locale={{ emptyText: 'Chưa có thông tin xe' }}
                                            />
                                        </div>
                                    </Modal>
                                )}
                            </Card>
                        ),
                    },
                ]}
            />
        </div>
    );
}