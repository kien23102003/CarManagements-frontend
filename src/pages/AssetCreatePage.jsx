import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import assetApi from '../api/assetApi';
import { Card, Form, Input, InputNumber, Select, DatePicker, Button, message, Divider, Row, Col } from 'antd';
import { ArrowLeftOutlined, CarOutlined, SafetyCertificateOutlined, InsuranceOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

export default function AssetCreatePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        // Format date fields
        purchaseDate: values.purchaseDate ? values.purchaseDate.format('YYYY-MM-DD') : null,
        registrationIssueDate: values.registrationIssueDate ? values.registrationIssueDate.format('YYYY-MM-DD') : null,
        registrationExpiryDate: values.registrationExpiryDate ? values.registrationExpiryDate.format('YYYY-MM-DD') : null,
        insuranceStartDate: values.insuranceStartDate ? values.insuranceStartDate.format('YYYY-MM-DD') : null,
        insuranceExpiryDate: values.insuranceExpiryDate ? values.insuranceExpiryDate.format('YYYY-MM-DD') : null,
        warrantyExpiryDate: values.warrantyExpiryDate ? values.warrantyExpiryDate.format('YYYY-MM-DD') : null,
      };

      await assetApi.createAsset(payload);
      message.success('Tạo tài sản xe thành công!');
      navigate('/vehicles');
    } catch (err) {
      message.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo tài sản');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/vehicles')} style={{ marginBottom: 16 }}>
        Quay lại
      </Button>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <CarOutlined style={{ fontSize: 28, color: '#1890ff' }} />
        <h2 style={{ margin: 0 }}>Đăng ký Tài sản Xe mới</h2>
      </div>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CarOutlined style={{ color: '#1890ff' }} />
          <h3 style={{ margin: 0 }}>Thông tin Xe cơ bản</h3>
        </div>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="licensePlate" 
                label="Biển số xe" 
                rules={[{ required: true, message: 'Vui lòng nhập biển số xe' }]}
              >
                <Input placeholder="51A-12345" size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="modelId" 
                label="Mã dòng xe" 
                rules={[{ required: true, message: 'Vui lòng nhập mã dòng xe' }]}
              >
                <InputNumber placeholder="VD: 1" style={{ width: '100%' }} size="large" min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="yearManufacture" 
                label="Năm sản xuất"
              >
                <InputNumber placeholder="2024" style={{ width: '100%' }} size="large" min={1900} max={dayjs().year() + 1} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="purchaseDate" 
                label="Ngày mua"
              >
                <DatePicker style={{ width: '100%' }} size="large" format="YYYY-MM-DD" placeholder="Chọn ngày mua" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="color" 
                label="Màu xe"
              >
                <Input placeholder="VD: Đen, Trắng, Bạc..." size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="seatCount" 
                label="Số chỗ ngồi"
              >
                <InputNumber placeholder="4" style={{ width: '100%' }} size="large" min={1} max={50} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="fuelType" 
                label="Loại nhiên liệu"
              >
                <Select placeholder="Chọn loại nhiên liệu" size="large">
                  <Option value="Xăng">Xăng</Option>
                  <Option value="Dầu">Dầu</Option>
                  <Option value="Điện">Điện</Option>
                  <Option value="Hybrid">Hybrid</Option>
                  <Option value="Gas">Gas</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
          <h3 style={{ margin: 0 }}>Định danh Xe (Bắt buộc)</h3>
        </div>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="vin" 
                label="Số VIN" 
                rules={[{ required: true, message: 'Vui lòng nhập số VIN' }]}
                extra="Mã định danh phương tiện quốc tế (17 ký tự)"
              >
                <Input placeholder="1HGCM82633A123456" size="large" maxLength={50} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="engineNumber" 
                label="Số máy" 
                rules={[{ required: true, message: 'Vui lòng nhập số máy' }]}
              >
                <Input placeholder="Số động cơ" size="large" maxLength={50} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="chassisNumber" 
                label="Số khung" 
                rules={[{ required: true, message: 'Vui lòng nhập số khung' }]}
              >
                <Input placeholder="Số khung" size="large" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <FileTextOutlined style={{ color: '#faad14' }} />
          <h3 style={{ margin: 0 }}>Đăng ký Xe</h3>
        </div>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="registrationNumber" 
                label="Số đăng ký"
              >
                <Input placeholder="Số đăng ký" size="large" maxLength={100} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="registrationAuthority" 
                label="Cơ quan đăng ký"
              >
                <Input placeholder="VD: Cục Đăng kiểm VN" size="large" maxLength={200} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="registrationIssueDate" 
                label="Ngày cấp đăng ký"
              >
                <DatePicker style={{ width: '100%' }} size="large" format="YYYY-MM-DD" placeholder="Chọn ngày cấp" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="registrationExpiryDate" 
                label="Ngày hết hạn đăng ký"
              >
                <DatePicker style={{ width: '100%' }} size="large" format="YYYY-MM-DD" placeholder="Chọn ngày hết hạn" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="registrationCost" 
                label="Phí đăng ký (VNĐ)"
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  size="large" 
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item 
                name="registrationNotes" 
                label="Ghi chú đăng ký"
              >
                <TextArea rows={2} placeholder="Ghi chú thêm về đăng ký..." maxLength={500} showCount />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <InsuranceOutlined style={{ color: '#eb2f96' }} />
          <h3 style={{ margin: 0 }}>Bảo hiểm / Bảo hành</h3>
        </div>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="insurancePolicyNumber" 
                label="Số hợp đồng bảo hiểm"
              >
                <Input placeholder="Số hợp đồng" size="large" maxLength={100} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="insuranceProvider" 
                label="Công ty bảo hiểm"
              >
                <Input placeholder="VD: Bảo Việt, PVI..." size="large" maxLength={200} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="insuranceStartDate" 
                label="Ngày bắt đầu bảo hiểm"
              >
                <DatePicker style={{ width: '100%' }} size="large" format="YYYY-MM-DD" placeholder="Chọn ngày bắt đầu" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="insuranceExpiryDate" 
                label="Ngày hết hạn bảo hiểm"
              >
                <DatePicker style={{ width: '100%' }} size="large" format="YYYY-MM-DD" placeholder="Chọn ngày hết hạn" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="insuranceCost" 
                label="Phí bảo hiểm (VNĐ)"
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  size="large" 
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="warrantyExpiryDate" 
                label="Ngày hết hạn bảo hành"
              >
                <DatePicker style={{ width: '100%' }} size="large" format="YYYY-MM-DD" placeholder="Chọn ngày hết hạn" />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item 
                name="insuranceCoverageDetails" 
                label="Chi tiết phủ bảo hiểm"
              >
                <TextArea rows={2} placeholder="Mô tả các hạng mục được bảo hiểm..." maxLength={500} showCount />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Giá trị Tài sản</h3>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="originalCost" 
                label="Giá gốc (VNĐ)"
                rules={[{ required: true, message: 'Vui lòng nhập giá gốc' }]}
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  size="large" 
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="currentValue" 
                label="Giá trị hiện tại (VNĐ)"
                extra="Để trống nếu bằng giá gốc"
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  size="large" 
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  placeholder="0"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="mileage" 
                label="Số km đã đi"
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  size="large" 
                  placeholder="0"
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="currentBranchId" 
                label="Chi nhánh quản lý"
              >
                <InputNumber placeholder="Mã chi nhánh" style={{ width: '100%' }} size="large" min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="currentDriverId" 
                label="Tài xế hiện tại"
              >
                <InputNumber placeholder="Mã tài xế" style={{ width: '100%' }} size="large" min={1} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item 
                name="status" 
                label="Trạng thái"
                initialValue="Available"
              >
                <Select placeholder="Chọn trạng thái" size="large">
                  <Option value="Available">Sẵn sàng</Option>
                  <Option value="Assigned">Đã phân công</Option>
                  <Option value="InMaintenance">Đang bảo trì</Option>
                  <Option value="InTransfer">Đang điều chuyển</Option>
                  <Option value="Disposed">Đã thanh lý</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Ghi chú</h3>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item 
            name="notes" 
            label="Ghi chú chung"
          >
            <TextArea rows={3} placeholder="Ghi chú thêm về tài sản..." maxLength={1000} showCount />
          </Form.Item>
        </Form>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 24 }}>
        <Button size="large" onClick={() => navigate('/vehicles')}>Huỷ</Button>
        <Button 
          type="primary" 
          size="large" 
          htmlType="submit" 
          loading={loading}
          icon={<CarOutlined />}
        >
          Tạo Tài sản
        </Button>
      </div>
    </div>
  );
}