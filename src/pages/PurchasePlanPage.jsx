import { useEffect, useState, useMemo } from 'react';
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import proposalApi from '../api/proposalApi';
import { useAuth } from '../services/AuthContext';
import VehicleReceptionForm from '../components/VehicleReceptionForm';

const { Option } = Select;

const STATUS_CONFIG = {
  Pending: { label: 'Chờ duyệt', color: 'orange' },
  Approved: { label: 'Đã duyệt', color: 'green' },
  Rejected: { label: 'Từ chối', color: 'red' },
  Received_Pending_Payment: { label: 'Chờ thanh toán', color: 'blue' },
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
    setSelectedPlan(record);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedPlan(null);
  };

  const handleReceptionCreated = async () => {
    message.success('Bản ghi đối chiếu được tạo thành công');
    handleModalClose();
    loadData(); // Refresh list
  };

  // ===== HANDLE CONFIRM PAYMENT =====
  const handleConfirmPayment = async (proposalId) => {
    try {
      if (proposalApi.confirmPayment) {
        await proposalApi.confirmPayment(proposalId);
      } else {
        message.warning('Vui lòng định nghĩa hàm confirmPayment trong proposalApi.js');
        return;
      }
      message.success('Đã xác nhận thanh toán. Xe mới đã được tạo trong hệ thống!');
      loadData();
    } catch (error) {
      // Bắt lỗi và hiển thị Modal
      const errMsg = error?.response?.data?.message || error?.message || 'Lỗi khi xác nhận thanh toán';
      setPaymentErrorMsg(errMsg);
      setErrorProposalId(proposalId);
      setErrorModalOpen(true);
    }
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
      title: 'Ngày tạo',
      dataIndex: 'createdDate',
      key: 'createdDate',
      width: 120,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
      sorter: (a, b) =>
        new Date(a.createdDate) - new Date(b.createdDate),
    },
    {
      title: 'Ngày duyệt',
      dataIndex: 'approvedDate',
      key: 'approvedDate',
      width: 120,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
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
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            type="primary"
            ghost
          >
            Chi tiết
          </Button>
          
          {/* Nút Đối chiếu xe cho Operator: Chỉ hiện khi trạng thái là Approved */}
          {!isManager && !isAccountant && record.status === 'Approved' && (
            <Button size="small" icon={<PlusOutlined />} onClick={() => handleAddReception(record)} type="default">
              ĐC xe
            </Button>
          )}

          {/* Hiển thị trạng thái đang chờ thanh toán cho Operator thay vì nút ẩn */}
          {!isManager && !isAccountant && record.status === 'Received_Pending_Payment' && (
             <span style={{ color: '#1890ff', fontSize: '13px', fontWeight: 500 }}>Đang chờ TT</span>
          )}

          {/* Nút Xác nhận thanh toán cho Kế toán: Hiện khi chờ TT VÀ đề xuất thuộc chi nhánh của kế toán */}
          {isAccountant && record.status === 'Received_Pending_Payment' && (!user?.branchId || record.branchDetails?.some(b => b.branchId === user?.branchId)) && (
            <Popconfirm title="Xác nhận thanh toán và tạo xe mới?" onConfirm={() => handleConfirmPayment(record.proposalId)}>
              <Button size="small" type="primary">
                Xác nhận TT
              </Button>
            </Popconfirm>
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
          width={800}
          footer={null}
        >
          <div style={{ padding: '20px 0' }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div><strong>Mô tả:</strong></div>
                <p>{selectedPlan.description}</p>
              </Col>
              <Col xs={24} sm={12}>
                <div><strong>Chi phí dự kiến:</strong></div>
                <p>
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(selectedPlan.proposedCost || 0)}
                </p>
              </Col>
            </Row>

            <Divider />

            <h4>Chi tiết theo chi nhánh:</h4>
            {selectedPlan.branchDetails && selectedPlan.branchDetails.length > 0 ? (
              <Table
                dataSource={selectedPlan.branchDetails}
                columns={[
                  {
                    title: 'Chi nhánh',
                    dataIndex: 'branchName',
                    key: 'branchName',
                  },
                  {
                    title: 'Nhãn hiệu',
                    dataIndex: 'manufacturer',
                    key: 'manufacturer',
                    render: (v) => v || '-',
                  },
                  {
                    title: 'Số chỗ',
                    dataIndex: 'seats',
                    key: 'seats',
                    render: (v) => v ? `${v} chỗ` : '-',
                  },
                  {
                    title: 'Số lượng',
                    dataIndex: 'proposedQuantity',
                    key: 'proposedQuantity',
                  },
                  {
                    title: 'Đơn giá',
                    dataIndex: 'unitPrice',
                    key: 'unitPrice',
                    render: (price) =>
                      new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(price),
                  },
                  {
                    title: 'Thành tiền',
                    dataIndex: 'totalPrice',
                    key: 'totalPrice',
                    render: (_, record) =>
                      new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(
                        (record.proposedQuantity || 0) * (record.unitPrice || 0)
                      ),
                  },
                  {
                    title: 'Ngày yêu cầu',
                    dataIndex: 'requestedDate',
                    key: 'requestedDate',
                    render: (date) =>
                      date ? dayjs(date).format('DD/MM/YYYY') : '-',
                  },
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
          message="Không thể tạo xe mới"
          description={paymentErrorMsg}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <p>Bạn có muốn hoàn tác lại quá trình đối chiếu để Operator nhập lại thông tin đúng không?</p>
      </Modal>
    </div>
  );
}
