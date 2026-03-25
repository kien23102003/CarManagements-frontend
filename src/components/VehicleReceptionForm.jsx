import { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Upload,
  Button,
  message,
  Row,
  Col,
  Card,
  Table,
  Checkbox,
  Divider,
  Alert,
  Space,
} from 'antd';
import {
  InboxOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import receptionApi from '../api/receptionApi';

const { TextArea } = Input;
const { Dragger } = Upload;

export default function VehicleReceptionForm({
  proposalId,
  plan,
  onClose,
  onSuccess,
}) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [imageBase64, setImageBase64] = useState(null);

  // Kiểm tra xem có chậm hạn không
  const getDateDelay = (requestedDate) => {
    if (!requestedDate) return null;
    const requested = dayjs(requestedDate);
    const today = dayjs();
    const diff = today.diff(requested, 'day');
    return diff;
  };

  const checkHasDelay = () => {
    if (plan?.branchDetails && plan.branchDetails.length > 0) {
      const delay = getDateDelay(plan.branchDetails[0].requestedDate);
      return delay && delay > 0;
    }
    return false;
  };

  const daysDelay = plan?.branchDetails?.[0]?.requestedDate
    ? getDateDelay(plan.branchDetails[0].requestedDate)
    : 0;

  // ===== HANDLE FILE UPLOAD =====
  const handleFileChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);

    // Tự động đọc file và convert sang base64
    if (newFileList.length > 0) {
      const file = newFileList[0].originFileObj;
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageBase64(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProps = {
    onRemove: () => {
      setFileList([]);
      setImageBase64(null);
    },
    beforeUpload: () => false, // Don't auto upload
    maxCount: 1,
    accept: 'image/*',
  };

  // ===== HANDLE CHECKBOX FOR BRANCH DETAILS =====
  const handleCheckDetail = (detailKey, checked) => {
    setCheckedItems({
      ...checkedItems,
      [detailKey]: checked,
    });
  };

  // ===== VALIDATE FORM =====
  const validateForm = () => {
    const { licensePlate, chassisNumber, engineNumber } = form.getFieldsValue();

    if (!licensePlate) {
      message.error('Vui lòng nhập biển số xe');
      return false;
    }

    if (!chassisNumber) {
      message.error('Vui lòng nhập số VIN/Chassis');
      return false;
    }

    if (!engineNumber) {
      message.error('Vui lòng nhập số máy');
      return false;
    }

    if (!imageBase64) {
      message.error('Vui lòng tải lên ảnh chứng minh');
      return false;
    }

    return true;
  };

  // ===== HANDLE SUBMIT =====
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { licensePlate, chassisNumber, engineNumber, notes } =
        form.getFieldsValue();

      const payload = {
        purchaseProposalId: proposalId,
        branchId: plan?.branchDetails?.[0]?.branchId || 0,
        licensePlate,
        chassisNumber,
        engineNumber,
        receiptImageUrl: imageBase64,
        notes,
      };

      const res = await receptionApi.create(payload);

      if (res?.data?.isSuccess) {
        message.success('Bản ghi đối chiếu được tạo thành công');
        form.resetFields();
        setFileList([]);
        setImageBase64(null);
        setCheckedItems({});
        onSuccess?.();
      } else {
        message.error(res?.data?.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      message.error('Lỗi khi tạo bản ghi đối chiếu');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Bản ghi đối chiếu xe - Đề xuất #${proposalId}`}
      open={true}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
        >
          Lưu bản ghi
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        {/* Alert nếu chậm hạn */}
        {checkHasDelay() && (
          <Alert
            message="⚠️ CẢNH BÁO"
            description={`Xe đã chậm hạn ${daysDelay} ngày so với ngày yêu cầu (${
              plan.branchDetails?.[0]?.requestedDate
                ? dayjs(plan.branchDetails[0].requestedDate).format('DD/MM/YYYY')
                : ''
            })`}
            type="warning"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        {/* Thông tin chi nhánh */}
        {plan?.branchDetails && plan.branchDetails.length > 0 && (
          <Card style={{ marginBottom: 20 }} size="small">
            <h4>Thông tin đề xuất mua</h4>
            <Table
              dataSource={plan.branchDetails}
              columns={[
                {
                  title: 'Chi nhánh',
                  dataIndex: 'branchName',
                  key: 'branchName',
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
                  title: 'Ngày yêu cầu',
                  dataIndex: 'requestedDate',
                  key: 'requestedDate',
                  render: (date) =>
                    date ? dayjs(date).format('DD/MM/YYYY') : '-',
                },
              ]}
              pagination={false}
              rowKey="branchId"
              size="small"
            />
          </Card>
        )}

        <Divider />

        <h4>Thông tin xe đã nhận</h4>

        {/* Biển số */}
        <Form.Item
          label="Biển số xe"
          name="licensePlate"
          rules={[
            { required: true, message: 'Vui lòng nhập biển số xe' },
          ]}
        >
          <Input placeholder="VD: 29A-12345" />
        </Form.Item>

        {/* VIN/Chassis */}
        <Form.Item
          label="Số VIN / Chassis"
          name="chassisNumber"
          rules={[
            { required: true, message: 'Vui lòng nhập số VIN/Chassis' },
          ]}
        >
          <Input placeholder="VD: XXXXXXXXXXXXXXXXX" />
        </Form.Item>

        {/* Số máy */}
        <Form.Item
          label="Số máy"
          name="engineNumber"
          rules={[
            { required: true, message: 'Vui lòng nhập số máy' },
          ]}
        >
          <Input placeholder="VD: XXXXXXXXX" />
        </Form.Item>

        {/* Upload ảnh */}
        <Form.Item
          label="Ảnh chứng minh (Biển số, VIN, Chassis...)"
          required
        >
          <Dragger {...uploadProps} fileList={fileList} onChange={handleFileChange}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Nhấp hoặc kéo ảnh vào khu vực này
            </p>
            <p className="ant-upload-hint">
              Hỗ trợ ảnh JPG, PNG, GIF. Kích thước tối đa 5MB
            </p>
          </Dragger>
        </Form.Item>

        {/* Ghi chú */}
        <Form.Item
          label="Ghi chú thêm"
          name="notes"
        >
          <TextArea
            rows={3}
            placeholder="Mô tả tình trạng xe, hư hại..."
          />
        </Form.Item>

        {/* Preview ảnh */}
        {imageBase64 && (
          <Form.Item label="Xem trước ảnh">
            <img
              src={imageBase64}
              alt="preview"
              style={{
                maxWidth: '100%',
                maxHeight: '300px',
                border: '1px solid #ddd',
                padding: '10px',
              }}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
