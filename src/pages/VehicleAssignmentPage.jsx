import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import assetApi from '../api/assetApi';
import { Card, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, message, Tag, Space, Popconfirm, Row, Col } from 'antd';
import { 
  CarOutlined, 
  UserOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  SwapOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

// Status color mapping
const statusColors = {
  Available: 'green',
  Active: 'green',
  Assigned: 'blue',
  Maintenance: 'orange',
  InMaintenance: 'orange',
  InTransfer: 'purple',
  Disposed: 'red',
};

const statusLabels = {
  Available: 'Sẵn sàng',
  Active: 'Sẵn sàng',
  Assigned: 'Đã phân công',
  Maintenance: 'Đang bảo trì',
  InMaintenance: 'Đang bảo trì',
  InTransfer: 'Đang điều chuyển',
  Disposed: 'Đã thanh lý',
};

export default function VehicleAssignmentPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [assignForm] = Form.useForm();
  const [assigning, setAssigning] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const hasPermission =
    roles.includes('Operator') ||
    roles.includes('Branch Asset Accountant') ||
    roles.includes('Executive Management');

  const loadDrivers = async () => {
    try {
      const { data } = await assetApi.getDrivers();
      setDrivers(data.data || data || []);
    } catch (err) {
      console.error('Error loading drivers:', err);
    }
  };

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const { data } = await assetApi.getList();
      setVehicles(data.data || data || []);
    } catch {
      message.error('Không thể tải danh sách xe');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!hasPermission) return;
    loadVehicles();
    loadDrivers();
  }, [hasPermission]);

  if (!hasPermission) {
    return (
      <Card>
        Bạn không có quyền truy cập màn hình phân công xe.
      </Card>
    );
  }

  const handleAssignClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    setAssignModalVisible(true);
    assignForm.setFieldsValue({
      assignDate: dayjs(),
    });
  };

  const handleUnassignClick = async (vehicle) => {
    try {
      await assetApi.unassignVehicle(vehicle.id, {
        unassignDate: dayjs().format('YYYY-MM-DD'),
        notes: 'Hủy phân công xe',
      });
      message.success('Hủy phân công xe thành công');
      loadVehicles();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi hủy phân công');
    }
  };

  const handleAssignSubmit = async (values) => {
    setAssigning(true);
    try {
      const payload = {
        driverId: values.driverId,
        assignDate: values.assignDate ? values.assignDate.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        notes: values.notes,
      };

      await assetApi.assignVehicle(selectedVehicle.id, payload);
      message.success('Phân công xe thành công');
      setAssignModalVisible(false);
      assignForm.resetFields();
      loadVehicles();
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi phân công xe');
    }
    setAssigning(false);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: (a, b) => a.id - b.id,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Biển số',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      width: 120,
      render: (text) => <strong>{text}</strong>,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Dòng xe',
      dataIndex: 'modelName',
      key: 'modelName',
      width: 100,
      render: (text, record) => text || record.manufacturer || '-',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Năm SX',
      dataIndex: 'yearManufacture',
      key: 'yearManufacture',
      width: 80,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'VIN',
      dataIndex: 'vin',
      key: 'vin',
      width: 150,
      ellipsis: true,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Số máy',
      dataIndex: 'engineNumber',
      key: 'engineNumber',
      width: 120,
      ellipsis: true,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Số khung',
      dataIndex: 'chassisNumber',
      key: 'chassisNumber',
      width: 120,
      ellipsis: true,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Màu',
      dataIndex: 'color',
      key: 'color',
      width: 80,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Số chỗ',
      dataIndex: 'seatCount',
      key: 'seatCount',
      width: 70,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Nhiên liệu',
      dataIndex: 'fuelType',
      key: 'fuelType',
      width: 100,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const normalizedStatus = status === 'Active' ? 'Available' : status;
        return (
          <Tag color={statusColors[normalizedStatus] || 'default'}>
            {statusLabels[normalizedStatus] || status}
          </Tag>
        );
      },
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Tài xế',
      dataIndex: 'currentDriverName',
      key: 'currentDriverName',
      width: 120,
      render: (driverName, record) => 
        record.currentDriverId != null ? (
          <Tag icon={<UserOutlined />} color="blue">
            {driverName}
          </Tag>
        ) : (
          <Tag color="volcano">Chưa có tài xế</Tag>
        ),
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'currentBranchName',
      key: 'currentBranchName',
      width: 120,
      render: (branchName) => branchName || '—',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Giá trị (VNĐ)',
      dataIndex: 'currentValue',
      key: 'currentValue',
      width: 130,
      render: (value) => value ? `${value?.toLocaleString('vi-VN')}` : '-',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Số km',
      dataIndex: 'mileage',
      key: 'mileage',
      width: 100,
      render: (mileage) => mileage ? `${mileage.toLocaleString('vi-VN')} km` : '0 km',
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' } }),
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 160,
      fixed: 'right',
      onCell: () => ({
        style: {
          position: 'sticky',
          right: 0,
          background: '#fff',
          zIndex: 1,
          padding: '16px 12px',
        },
      }),
      render: (_, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {record.status === 'Available' || !record.currentDriverId ? (
            <Button
              type="primary"
              onClick={() => handleAssignClick(record)}
              disabled={record.status === 'Disposed'}
              style={{ height: 40, borderRadius: 8, fontSize: 14, fontWeight: 500 }}
              icon={<SwapOutlined />}
            >
              Phân công
            </Button>
          ) : (
            <Popconfirm
              title="Hủy phân công xe?"
              description="Bạn có chắc muốn hủy phân công xe này?"
              onConfirm={() => handleUnassignClick(record)}
              okText="Có"
              cancelText="Hủy"
            >
              <Button
                danger
                style={{ height: 40, borderRadius: 8, fontSize: 14, fontWeight: 500 }}
                icon={<CloseCircleOutlined />}
              >
                Hủy phân công
              </Button>
            </Popconfirm>
          )}
          <Button
            onClick={() => navigate(`/vehicles/${record.id}`)}
            style={{ height: 40, borderRadius: 8, fontSize: 14, fontWeight: 500 }}
          >
            Chi tiết
          </Button>
        </div>
      ),
    },
  ];

  // Filter only available vehicles for quick view
  const availableCount = vehicles.filter(v => v.status === 'Available').length;
  const assignedCount = vehicles.filter(v => v.status === 'Assigned').length;

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CarOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <div>
            <h2 style={{ margin: 0 }}>Phân công Xe</h2>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              Quản lý phân công xe cho tài xế
            </p>
          </div>
        </div>
        <Space>
          <Button onClick={() => navigate('/vehicles/new')}>
            Thêm xe mới
          </Button>
          <Button 
            type="primary" 
            icon={<CarOutlined />}
            onClick={() => navigate('/vehicles/asset-create')}
          >
            Đăng ký Tài sản
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{availableCount}</div>
            <div style={{ color: '#666' }}>Xe sẵn sàng</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{assignedCount}</div>
            <div style={{ color: '#666' }}>Xe đã phân công</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
              {vehicles.filter(v => v.status === 'InMaintenance' || v.status === 'Maintenance').length}
            </div>
            <div style={{ color: '#666' }}>Đang bảo trì</div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ textAlign: 'center', borderRadius: 12 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#666' }}>{vehicles.length}</div>
            <div style={{ color: '#666' }}>Tổng số xe</div>
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Table
          columns={columns}
          dataSource={vehicles}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} xe`,
          }}
        />
      </Card>

      {/* Assign Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SwapOutlined style={{ color: '#1890ff' }} />
            <span>Phân công Xe</span>
          </div>
        }
        open={assignModalVisible}
        onCancel={() => {
          setAssignModalVisible(false);
          assignForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        {selectedVehicle && (
          <div style={{ marginBottom: 24 }}>
            <Card size="small" style={{ backgroundColor: '#f5f5f5' }}>
              <Row gutter={[16, 8]}>
                <Col span={12}>
                  <strong>Biển số:</strong> {selectedVehicle.licensePlate}
                </Col>
                <Col span={12}>
                  <strong>Trạng thái:</strong>
                  <Tag color={statusColors[selectedVehicle.status]}>
                    {statusLabels[selectedVehicle.status]}
                  </Tag>
                </Col>
                <Col span={12}>
                  <strong>VIN:</strong> {selectedVehicle.vin || '-'}
                </Col>
                <Col span={12}>
                  <strong>Giá trị:</strong> {selectedVehicle.currentValue?.toLocaleString('vi-VN') || '-'} VNĐ
                </Col>
              </Row>
            </Card>
          </div>
        )}

        <Form form={assignForm} layout="vertical" onFinish={handleAssignSubmit}>
          <Form.Item
            name="driverId"
            label="Tài xế"
            rules={[{ required: true, message: 'Vui lòng chọn tài xế' }]}
          >
            <Select 
              placeholder="Chọn tài xế" 
              size="large"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={drivers.map(d => ({
                value: d.id,
                label: d.name
              }))}
            />
          </Form.Item>

          <Form.Item
            name="assignDate"
            label="Ngày phân công"
            rules={[{ required: true, message: 'Vui lòng chọn ngày phân công' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              size="large" 
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Ghi chú"
          >
            <TextArea 
              rows={4} 
              placeholder="Ghi chú về việc phân công..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button 
              onClick={() => {
                setAssignModalVisible(false);
                assignForm.resetFields();
              }}
            >
              Hủy
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={assigning}
              icon={<CheckCircleOutlined />}
            >
              Xác nhận phân công
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
