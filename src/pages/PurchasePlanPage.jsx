import { useEffect, useState, useMemo } from 'react'; // HMR Reload Marker
import {
    Table,
    Button,
    Tag,
    Space,
    message,
    Modal,
    Input,
    Card,
    Row,
    Col,
    Select,
    Badge,
    Divider,
    Popconfirm,
    Alert,
} from 'antd';
import {
    PlusOutlined,
    EyeOutlined,
    DeleteOutlined,
    SearchOutlined,
    DollarOutlined,
    FileSearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import proposalApi from '../api/proposalApi';
import { useAuth } from '../services/AuthContext';
import VehicleReceptionForm from '../components/VehicleReceptionForm';
import ConfirmPaymentModal from '../components/ConfirmPaymentModal';

const { Option } = Select;

const STATUS_CONFIG = {
    Pending: { label: 'Chờ duyệt', color: 'orange' },
    ManagerApproved: { label: 'Đã duyệt (Quản lý)', color: 'blue' },
    Approved: { label: 'Đã duyệt', color: 'green' },
    Rejected: { label: 'Từ chối', color: 'red' },
    Received_Pending_Payment: { label: 'Chờ thanh toán', color: 'purple' },
    Completed: { label: 'Hoàn thành', color: 'cyan' },
};

const PRIORITY_CONFIG = {
    1: { label: 'Cao', color: 'red', number: '1' },
    2: { label: 'Trung bình', color: 'orange', number: '2' },
    3: { label: 'Thấp', color: 'green', number: '3' },
};

export default function PurchasePlanPage() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [paymentErrorMsg, setPaymentErrorMsg] = useState('');
    const [errorProposalId, setErrorProposalId] = useState(null);

    // Kế toán xác nhận thanh toán (Mới)
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [selectedProposalForConfirm, setSelectedProposalForConfirm] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false);

    const { user } = useAuth();
    const isManager = user?.roles?.some(
        (r) => r === 'Executive Management' || r === 'Manager'
    );
    const isAccountant = user?.roles?.some(
        (r) => r === 'Branch Asset Accountant' || r === 'Chief Accountant'
    );

    // Load data khi user thay đổi (đã đăng nhập hoặc đã tải user info)
    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await proposalApi.getPurchasePlans();
            console.log('Purchase Plans Response:', res);
            // Xử lý response giống như ProposalListPage
            const planData = res?.data?.data || res?.data || [];
            setData(Array.isArray(planData) ? planData : []);
        } catch (error) {
            message.error('Không tải được danh sách kế hoạch mua');
            console.error('Error loading purchase plans:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    // ===== FILTER & SEARCH =====
    const filteredData = useMemo(() => {
        return data.filter((item) => {
            const matchSearch =
                item.proposalId.toString().includes(searchText) ||
                item.description?.toLowerCase().includes(searchText.toLowerCase());

            return matchSearch;
        });
    }, [data, searchText]);

    // ===== HANDLE DETAIL =====
    const handleViewDetail = (record) => {
        setSelectedPlan(record);
        setDetailModalOpen(true);
    };

    const handleAddReception = (record) => {
        setIsReadOnly(false);
        setSelectedPlan(record);
        setModalOpen(true);
    };

    const handleViewReception = (record) => {
        setIsReadOnly(true);
        setSelectedPlan(record);
        setModalOpen(true);
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedPlan(null);
        setIsReadOnly(false);
    };

    const handleReceptionCreated = async (count, errorCount) => {
        if (errorCount === 0) {
            Modal.success({
                title: 'Đối chiếu hoàn tất!',
                content: `Hệ thống đã ghi nhận việc tiếp nhận thành công ${count} xe mới.`,
                okText: 'Tuyệt vời',
            });
        } else {
            Modal.warning({
                title: 'Đối chiếu một phần thành công',
                content: `Đã lưu thành công ${count} xe, nhưng có ${errorCount} xe gặp lỗi. Vui lòng kiểm tra lại danh sách.`,
                okText: 'Đóng',
            });
        }
        handleModalClose();
        loadData(); // Refresh list
    };

    // ===== HANDLE CONFIRM PAYMENT (NEW) =====
    const handleOpenConfirmModal = (record, readOnly = false) => {
        setIsReadOnly(readOnly);
        setSelectedProposalForConfirm(record);
        setConfirmModalOpen(true);
    };

    const handleConfirmSuccess = () => {
        setConfirmModalOpen(false);
        setSelectedProposalForConfirm(null);
        loadData();
    };

    const handleRollback = async () => {
        try {
            await proposalApi.rollbackReception(errorProposalId, { reason: paymentErrorMsg });
            message.success('Đã hoàn tác đối chiếu thành công. Operator có thể cập nhật lại.');
            setErrorModalOpen(false);
            loadData();
        } catch (err) {
            message.error('Lỗi khi hoàn tác đối chiếu');
        }
    };

    // ===== COLUMNS =====
    const columns = [
        {
            title: 'ID',
            dataIndex: 'proposalId',
            key: 'id',
            width: 60,
            sorter: (a, b) => a.proposalId - b.proposalId,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            width: 200,
            render: (text) => <span>{text?.substring(0, 50)}...</span>,
        },
        {
            title: 'Ngày hoàn thành',
            dataIndex: 'completionDeadline',
            key: 'completionDeadline',
            width: 150,
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
            sorter: (a, b) =>
                new Date(a.completionDeadline || 0) - new Date(b.completionDeadline || 0),
        },
        {
            title: 'Ngày duyệt',
            dataIndex: 'approvedDate',
            key: 'approvedDate',
            width: 120,
            render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : <span style={{ color: '#aaa' }}>Chưa duyệt</span>),
            sorter: (a, b) => new Date(a.approvedDate || 0) - new Date(b.approvedDate || 0),
        },
        {
            title: 'Chi phí dự kiến',
            dataIndex: 'proposedCost',
            key: 'proposedCost',
            width: 130,
            render: (cost) =>
                cost
                    ? new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                    }).format(cost)
                    : '0 VND',
            sorter: (a, b) => a.proposedCost - b.proposedCost,
        },

        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (status) => {
                const config = STATUS_CONFIG[status] || { label: status, color: 'default' };
                return <Tag color={config.color}>{config.label}</Tag>;
            },
        },
        {
            title: 'Ưu tiên',
            dataIndex: 'priority',
            key: 'priority',
            width: 100,
            render: (priority) => {
                const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[3];
                return <Tag color={config.color}>{config.label}</Tag>;
            },
            sorter: (a, b) => a.priority - b.priority,
        },

        {
            title: 'Hành động',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                    >
                        Chi tiết
                    </Button>

                    {/* Operator đối chiếu xe */}
                    {!isManager && !isAccountant && (record.status === 'Approved' || record.status === 'ManagerApproved') && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => handleAddReception(record)}
                        >
                            Đối chiếu
                        </Button>
                    )}

                    {/* Kế toán xác nhận thanh toán */}
                    {isAccountant && record.status === 'Received_Pending_Payment' && (!user?.branchId || record.branchDetails?.some(b => b.branchId === user?.branchId)) && (
                        <Button
                            type="primary"
                            icon={<DollarOutlined />}
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                            onClick={() => handleOpenConfirmModal(record)}
                        >
                            Thanh toán
                        </Button>
                    )}

                    {/* Hiển thị trạng thái đang chờ thanh toán cho Operator thay vì nút ẩn */}
                    {!isManager && !isAccountant && record.status === 'Received_Pending_Payment' && (
                        <span style={{ color: '#1890ff', fontSize: '13px', fontWeight: 500 }}>Đang chờ TT</span>
                    )}

                    {/* Xem lịch sử khi đã Hoàn thành */}
                    {record.status === 'Completed' && (
                        <>
                            <Button
                                type="link"
                                size="small"
                                icon={<FileSearchOutlined />}
                                onClick={() => handleViewReception(record)}
                                title="Xem lịch sử đối chiếu xe"
                            >
                                Đối chiếu
                            </Button>
                            <Button
                                type="link"
                                size="small"
                                icon={<DollarOutlined />}
                                style={{ color: '#52c41a' }}
                                onClick={() => handleOpenConfirmModal(record, true)}
                                title="Xem chi tiết thực chi"
                            >
                                Thanh toán
                            </Button>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="purchase-plan-page">
            {/* Header */}
            <Card style={{ marginBottom: 20 }}>
                <Row gutter={[16, 16]} align="middle">
                    <Col span={24}>
                        <h2>Danh sách kế hoạch mua</h2>
                        {!isManager && !isAccountant && (
                            <Tag color="geekblue" style={{ marginBottom: 8, fontSize: 13, padding: '4px 10px' }}>
                                👤 Operator: <b>{user?.userName || user?.fullName}</b> | 🏢 Chi nhánh: <b>{user?.branchName || 'Tất cả'}</b>
                            </Tag>
                        )}
                        <p style={{ color: '#666', fontSize: 12 }}>
                            Hiển thị danh sách các đề xuất mua đã được duyệt, sắp xếp theo ưu
                            tiên
                        </p>
                    </Col>
                </Row>
            </Card>

            {/* Search */}
            <Card style={{ marginBottom: 20 }}>
                <Row gutter={16}>
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            placeholder="Tìm kiếm theo ID hoặc mô tả..."
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={16}>
                        <Space>
                            <Button onClick={loadData} loading={loading}>
                                Tải lại
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card>
                <Table
                    dataSource={filteredData}
                    columns={columns}
                    loading={loading}
                    rowKey="proposalId"
                    pagination={{
                        pageSize: 10,
                        total: filteredData.length,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                    }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {/* Detail Modal */}
            {selectedPlan && (
                <Modal
                    title={`Chi tiết kế hoạch mua #${selectedPlan.proposalId}`}
                    open={detailModalOpen}
                    onCancel={() => setDetailModalOpen(false)}
                    width={Math.min(window.innerWidth - 40, 1300)}
                    style={{ top: 20 }}
                    styles={{ body: { maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' } }}
                    footer={null}
                >
                    <div style={{ padding: '20px 0' }}>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12}>
                                <div><strong>Mô tả:</strong></div>
                                <p>{selectedPlan.description}</p>
                            </Col>
                            <Col xs={24} sm={6}>
                                <div><strong>Chi phí dự kiến:</strong></div>
                                <p>
                                    {new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND',
                                    }).format(selectedPlan.proposedCost || 0)}
                                </p>
                            </Col>
                            <Col xs={24} sm={6}>
                                <div><strong>Ngày hoàn thành:</strong></div>
                                <p>
                                    {selectedPlan.completionDeadline
                                        ? dayjs(selectedPlan.completionDeadline).format('DD/MM/YYYY')
                                        : '-'}
                                </p>
                            </Col>
                        </Row>

                        <Divider />

                        <h4>Chi tiết theo chi nhánh:</h4>
                        {selectedPlan.branchDetails && selectedPlan.branchDetails.length > 0 ? (
                            <Table
                                dataSource={selectedPlan.branchDetails}
                                scroll={{ x: 'max-content' }}
                                size="small"
                                columns={[
                                    { title: 'Chi nhánh', dataIndex: 'proposerBranchName', key: 'proposerBranchName', width: 100, render: (v) => v || '-' },
                                    { title: 'Nhãn hiệu', dataIndex: 'manufacturer', key: 'manufacturer', width: 90, render: (v) => v || '-' },
                                    { title: 'Phiên bản xe', dataIndex: 'version', key: 'version', width: 110, render: (v) => v || '-' },
                                    { title: 'Số chỗ', dataIndex: 'seats', key: 'seats', width: 70, render: (v) => v ? `${v} chỗ` : '-' },
                                    { title: 'SL', dataIndex: 'proposedQuantity', key: 'proposedQuantity', width: 50, align: 'center' },
                                    { title: 'P.Thức', dataIndex: 'acquisitionMethod', key: 'acquisitionMethod', width: 80, render: (v) => { if (v === 'Ownership') return 'Mua đứt'; if (v === 'Lease') return 'Thuê'; if (v === 'Finance') return 'Thuê TC'; return '-'; } },
                                    { title: 'Thuế ĐK', dataIndex: 'registrationTax', width: 110, render: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0) },
                                    { title: 'Phí ĐB', dataIndex: 'roadMaintenanceFee', width: 110, render: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0) },
                                    { title: 'Phí Biển', dataIndex: 'licensePlateFee', width: 110, render: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0) },
                                    { title: 'Bảo hiểm', dataIndex: 'insuranceFee', width: 110, render: v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0) },
                                    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', width: 120, render: (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0) },
                                    { title: 'Thành tiền', key: 'totalPrice', width: 130, render: (_, r) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((r.proposedQuantity || 0) * (r.unitPrice || 0)) },
                                    { title: 'Ngày yêu cầu', dataIndex: 'requestedDate', key: 'requestedDate', width: 110, render: (date) => date ? new Date(date).toLocaleDateString('vi-VN') : '-' },
                                ]}
                                pagination={false}
                                rowKey="branchId"
                            />
                        ) : (
                            <p>Không có chi tiết chi nhánh</p>
                        )}
                    </div>
                </Modal>
            )}

            {/* Reception Form Modal */}
            {modalOpen && selectedPlan && (
                <VehicleReceptionForm
                    proposalId={selectedPlan.proposalId}
                    plan={selectedPlan}
                    onClose={handleModalClose}
                    onSuccess={handleReceptionCreated}
                    readOnly={isReadOnly}
                />
            )}

            {/* Modal báo lỗi và Hoàn tác */}
            <Modal
                title="Lỗi xác nhận thanh toán"
                open={errorModalOpen}
                onCancel={() => setErrorModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setErrorModalOpen(false)}>
                        Đóng
                    </Button>,
                    <Button key="rollback" type="primary" danger onClick={handleRollback}>
                        Hoàn tác đối chiếu
                    </Button>,
                ]}
            >
                <Alert
                    title="Không thể tạo xe mới"
                    description={paymentErrorMsg}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
                <p>Bạn có muốn hoàn tác lại quá trình đối chiếu để Operator nhập lại thông tin đúng không?</p>
            </Modal>
            {/* Modal Xác nhận Thanh toán của Kế toán (Mới) */}
            <ConfirmPaymentModal
                open={confirmModalOpen}
                proposal={selectedProposalForConfirm}
                onCancel={() => setConfirmModalOpen(false)}
                onSuccess={handleConfirmSuccess}
                readOnly={isReadOnly}
            />
        </div>
    );
}
