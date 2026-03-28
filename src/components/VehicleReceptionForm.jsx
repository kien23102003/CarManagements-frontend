import { useState, useEffect } from 'react';
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
  Tag,
  DatePicker,
  Select,
  InputNumber,
  notification,
  Empty,
  Typography
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  CarOutlined,
  FileSearchOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import receptionApi from '../api/receptionApi';

const { TextArea } = Input;
const { Title, Text } = Typography;

export default function VehicleReceptionForm({
  proposalId,
  plan,
  onClose,
  onSuccess,
  readOnly = false
}) {
  const [form] = Form.useForm();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [notificationApi, notificationContextHolder] = notification.useNotification();
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [receptionQuantities, setReceptionQuantities] = useState({});

  // ===== GENERATE INITIAL VEHICLES =====
  const generateVehicles = () => {
    const vehicles = [];
    selectedRowKeys.forEach(rowKey => {
      const detail = plan.branchDetails.find(d => `${d.branchId}-${d.manufacturer}-${d.version}` === rowKey);
      if (detail) {
        const qty = receptionQuantities[rowKey] || 1;
        for (let i = 1; i <= qty; i++) {
          vehicles.push({
            branchId: detail.branchId,
            branchName: detail.branchName,
            manufacturer: detail.manufacturer,
            version: detail.version,
            vehicleIndex: i,
            totalForType: qty,
            fuelNorm: detail.fuelNorm,
            seats: detail.seats,
            branchNotes: detail.branchNotes,
            yearManufacture: dayjs().year(),
            mileage: 0,
            registrationExpirationDate: null,
            insuranceExpirationDate: null,
            badgeExpirationDate: null,
          });
        }
      }
    });
    form.setFieldsValue({ vehicles });
  };

  useEffect(() => {
    if (readOnly && plan?.receptions) {
      const vehicles = plan.receptions.map((r, index) => ({
        ...r,
        vehicleIndex: index + 1,
        registrationExpirationDate: r.registrationExpirationDate ? dayjs(r.registrationExpirationDate) : null,
        insuranceExpirationDate: r.insuranceExpirationDate ? dayjs(r.insuranceExpirationDate) : null,
        badgeExpirationDate: r.badgeExpirationDate ? dayjs(r.badgeExpirationDate) : null,
        yearManufacture: r.yearManufacture,
        mileage: r.mileage,
        receiptImages: r.receiptImageUrl ? r.receiptImageUrl.split(';').map((url, idx) => ({
          uid: `-${idx}`,
          name: `image-${idx}`,
          status: 'done',
          url: url
        })) : []
      }));
      form.setFieldsValue({ vehicles });
    } else {
      generateVehicles();
    }
  }, [selectedRowKeys, receptionQuantities, readOnly, plan]);

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
    const newQty = { ...receptionQuantities };
    newSelectedRowKeys.forEach(key => {
      if (!newQty[key]) {
        const detail = plan.branchDetails.find(d => `${d.branchId}-${d.manufacturer}-${d.version}` === key);
        newQty[key] = (detail.proposedQuantity - detail.receivedQuantity) || 1;
      }
    });
    setReceptionQuantities(newQty);
  };

  const handleQtyChange = (key, val) => {
    setReceptionQuantities({ ...receptionQuantities, [key]: val });
  };

  const normFile = (e) => {
    if (Array.isArray(e)) return e;
    return e?.fileList;
  };

  // ===== HANDLE SUBMIT =====
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!values.vehicles || values.vehicles.length === 0) {
        messageApi.warning('Vui lòng chọn ít nhất một xe để đối chiếu');
        return;
      }

      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      for (const v of values.vehicles) {
        const checkItems = v.checkItems || [];
        const hasMainCheck = checkItems.includes('checkInfo') &&
          checkItems.includes('checkVinChassis') &&
          checkItems.includes('checkDocs');

        if (!hasMainCheck) {
          notificationApi.error({ message: 'Thiếu thông tin', description: `Xe #${v.vehicleIndex}: Vui lòng tích đủ checklist cơ bản` });
          setLoading(false);
          return;
        }
        if (!v.receiptImages || v.receiptImages.length === 0) {
          notificationApi.error({ message: 'Thiếu thông tin', description: `Xe #${v.vehicleIndex}: Thiếu ảnh minh chứng` });
          setLoading(false);
          return;
        }

        const base64Array = await Promise.all((v.receiptImages || []).map(async (f) => {
          if (f.url) return f.url;
          if (f.originFileObj) {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.readAsDataURL(f.originFileObj);
            });
          }
          return '';
        }));
        const joinedImages = base64Array.filter(b => b).join(';');

        const payload = {
          purchaseProposalId: proposalId,
          branchId: v.branchId,
          licensePlate: v.licensePlate,
          chassisNumber: v.chassisNumber,
          engineNumber: v.engineNumber,
          vin: v.vin,
          vin: v.vin,
          badgeType: v.badgeType || 'Chưa đăng ký phù hiệu',
          fuelNorm: v.fuelNorm,
          registrationExpirationDate: v.registrationExpirationDate ? v.registrationExpirationDate.format('YYYY-MM-DD') : null,
          insuranceExpirationDate: v.insuranceExpirationDate ? v.insuranceExpirationDate.format('YYYY-MM-DD') : null,
          badgeExpirationDate: v.badgeExpirationDate ? v.badgeExpirationDate.format('YYYY-MM-DD') : null,
          receiptImageUrl: joinedImages,
          notes: v.notes,
          yearManufacture: v.yearManufacture,
          mileage: v.mileage,
        };

        try {
          const res = await receptionApi.create(payload);
          if (res.status === 200 || res.status === 201) {
            successCount++;
          } else {
            const errorMsg = res?.data?.message || `Lưu xe #${v.vehicleIndex} thất bại`;
            notificationApi.error({ message: 'Lỗi lưu dữ liệu', description: errorMsg });
            errorCount++;
          }
        } catch (error) {
          const errMsg = error.response?.data?.message || error.message || "Lỗi kết nối API";
          notificationApi.error({ message: 'Lỗi hệ thống', description: errMsg });
          errorCount++;
        }
      }

      if (successCount > 0) {
        // Thông báo nhanh trước khi đóng modal
        message.success(`Đã lưu thành công ${successCount} xe.`);
        onSuccess?.(successCount, errorCount);
      } else if (errorCount > 0) {
        notificationApi.error({
          message: 'Đối chiếu thất bại',
          description: `Cả ${errorCount} bản ghi đều gặp lỗi.`,
          placement: 'topRight'
        });
      }
    } catch (error) {
      console.error(error);
      messageApi.error('Vui lòng kiểm tra lại thông tin nhập liệu');
    } finally {
      setLoading(false);
    }
  };

  // ===== RENDER REVIEW CARD (For Read-Only Mode) =====
  const renderReviewCard = (data, index) => {
    // Robust data access (handle camelCase or PascalCase)
    const getVal = (prop) => data?.[prop] || data?.[prop.charAt(0).toUpperCase() + prop.slice(1)];

    const licensePlate = getVal('licensePlate');
    const vin = getVal('vin');
    const version = getVal('version');
    const chassisNo = getVal('chassisNumber');
    const engineNo = getVal('engineNumber');
    const imei = getVal('telematicsImei');
    const fuelNorm = getVal('fuelNorm');
    const regExp = getVal('registrationExpirationDate');
    const insExp = getVal('insuranceExpirationDate');
    const badgeType = getVal('badgeType');
    const badgeExp = getVal('badgeExpirationDate');
    const imageUrlStr = getVal('receiptImageUrl');
    const notes = getVal('notes');
    const yearMan = getVal('yearManufacture');
    const mileage = getVal('mileage');

    return (
      <Card
        key={data.id || index}
        title={<span><FileSearchOutlined style={{ marginRight: 8, color: '#1890ff' }} /><b>BẢN GHI ĐỐI CHIẾU XE #{index + 1}</b></span>}
        size="small"
        style={{ marginBottom: 24, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderLeft: '4px solid #1890ff' }}
        extra={<Tag color="green">ĐÃ ĐỐI CHIẾU</Tag>}
      >
        <Row gutter={[24, 16]}>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Biển số xe</Text>
            <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#003a8c' }}>{licensePlate || '-'}</div>
          </Col>
          <Col span={10}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Số VIN</Text>
            <div style={{ fontWeight: 500, fontSize: '15px' }}>{vin || '-'}</div>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Phiên bản / Model</Text>
            <div>{version || '-'}</div>
          </Col>
          <Col span={4}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Năm SX</Text>
            <div style={{ fontWeight: 'bold' }}>{yearMan || '-'}</div>
          </Col>
          <Col span={4}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Số Km</Text>
            <div style={{ fontWeight: 'bold' }}>{mileage?.toLocaleString() || '0'}</div>
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={[24, 16]}>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Số khung</Text>
            <div>{chassisNo || '-'}</div>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Số máy</Text>
            <div>{engineNo || '-'}</div>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Định mức NL</Text>
            <div>{fuelNorm ? `${fuelNorm} L/100km` : '-'}</div>
          </Col>
        </Row>

        <Row gutter={[24, 16]} style={{ marginTop: 12 }}>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Hạn đăng kiểm</Text>
            <div>{regExp ? dayjs(regExp).format('DD/MM/YYYY') : '-'}</div>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Hạn bảo hiểm</Text>
            <div>{insExp ? dayjs(insExp).format('DD/MM/YYYY') : '-'}</div>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Loại phù hiệu</Text>
            <div>{badgeType || '-'}</div>
          </Col>
          <Col span={6}>
            <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Hạn phù hiệu</Text>
            <div>{badgeExp ? dayjs(badgeExp).format('DD/MM/YYYY') : '-'}</div>
          </Col>
        </Row>

        <div style={{ marginTop: 24, padding: '16px', background: '#fafafa', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
          <Row gutter={24}>
            <Col span={12}>
              <Title level={5} style={{ fontSize: '13px', marginBottom: 16 }}>TÌNH TRẠNG KIỂM TRA THỰC TẾ:</Title>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                  <span style={{ color: '#262626' }}>Thông tin Biển số & Cavet trùng khớp</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                  <span style={{ color: '#262626' }}>Số VIN, khung, máy khớp thực tế</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                  <span style={{ color: '#262626' }}>Hồ sơ, giấy tờ gốc đã thu đủ</span>
                </div>
              </Space>
              {notes && (
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>GHI CHÚ:</Text>
                  <div style={{ color: '#595959', fontStyle: 'italic' }}>{notes}</div>
                </div>
              )}
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: '11px' }}>HÌNH ẢNH MINH CHỨNG:</Text>
              {imageUrlStr ? (() => {
                // Sửa lỗi split nhầm dấu chấm phẩy trong string base64
                // Pattern: dấu ";" mà theo sau KHÔNG phải là "base64" (vì "data:image/png;base64," có dấu ;)
                // Hoặc đơn giản là split theo pattern kết hợp ";data:"
                const imageParts = imageUrlStr.split(/;(?=data:)/);
                const firstImageUrl = imageParts[0] || "";

                return (
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={firstImageUrl}
                      alt="receipt-evidence"
                      style={{ width: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: 8, border: '1px solid #d9d9d9', background: '#fff' }}
                    />
                  </div>
                );
              })() : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có ảnh" style={{ marginTop: 20 }} />
              )}
            </Col>
          </Row>
        </div>
      </Card>
    );
  };

  return (
    <div className="vehicle-reception-form-container">
      {messageContextHolder}
      {notificationContextHolder}

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CarOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
            <span style={{ fontWeight: 'bold' }}>
              {readOnly ? `CHI TIẾT ĐỐI CHIẾU XE - ĐỀ XUẤT #${proposalId}` : `ĐỐI CHIẾU XE HÀNG LOẠT - ĐỀ XUẤT #${proposalId}`}
            </span>
          </div>
        }
        open={true}
        onCancel={onClose}
        width={1200}
        centered
        footer={readOnly ? [
          <Button key="close" type="primary" onClick={onClose} size="large" style={{ width: 140 }}>Đóng</Button>
        ] : [
          <Button key="cancel" onClick={onClose}>Hủy</Button>,
          <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
            Lưu toàn bộ {selectedRowKeys.length > 0 ? `(${Object.values(receptionQuantities).reduce((a, b) => a + b, 0)} xe)` : ''}
          </Button>,
        ]}
      >
        <div style={{ maxHeight: '75vh', overflowY: 'auto', padding: '0 12px' }}>
          <div style={{ background: '#f0f5ff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #adc6ff', marginBottom: 28 }}>
            <Row gutter={24} align="middle">
              <Col span={5}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Chi nhánh nhận</Text>
                <div style={{ fontWeight: 'bold' }}>{plan?.branchDetails?.[0]?.branchName || '-'}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Nhãn hiệu & Phiên bản</Text>
                <div style={{ fontWeight: 'bold' }}>{plan?.branchDetails?.[0]?.manufacturer} - {plan?.branchDetails?.[0]?.version}</div>
              </Col>
              <Col span={5}>
                <Text type="secondary" style={{ fontSize: '12px' }}>Tiến độ bàn giao</Text>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#52c41a' }}>
                    {plan?.branchDetails?.reduce((sum, d) => sum + (d.receivedQuantity || 0), 0) || 0}
                  </span>
                  <span style={{ color: '#8c8c8c' }}> / {plan?.branchDetails?.reduce((sum, d) => sum + (d.proposedQuantity || 0), 0) || 0} Xe</span>
                </div>
              </Col>
              <Col span={6} style={{ textAlign: 'right' }}>
                <Tag color="blue" style={{ padding: '4px 12px', borderRadius: '20px' }}>
                  Sản phẩm mục tiêu: {plan?.branchDetails?.[0]?.manufacturer}
                </Tag>
              </Col>
            </Row>
          </div>

          {readOnly ? (
            <div style={{ padding: '0 4px' }}>
              <Alert
                message={<b style={{ color: '#0050b3' }}>Thông báo đối soát</b>}
                description="Dưới đây là toàn bộ thông tin chi tiết các xe đã được Operator tiếp nhận thực tế tại chi nhánh. Mọi dữ liệu ở chế độ chỉ xem."
                type="info" showIcon icon={<InfoCircleOutlined />}
                style={{ marginBottom: 24, borderRadius: 8 }}
              />
              {plan?.receptions && plan.receptions.length > 0 ? (
                plan.receptions.map((item, idx) => renderReviewCard(item, idx))
              ) : (
                <Empty description="Chưa có bản ghi đối chiếu nào được thực thi." style={{ margin: '60px 0' }} />
              )}
            </div>
          ) : (
            <Form form={form} layout="vertical">
              <Card title="1. Chọn dòng xe tiếp nhận" size="small" style={{ marginBottom: 20 }}>
                <Table
                  dataSource={plan?.branchDetails || []}
                  rowKey={(r) => `${r.branchId}-${r.manufacturer}-${r.version}`}
                  pagination={false}
                  size="small"
                  rowClassName={(r) => r.receivedQuantity >= r.proposedQuantity ? 'row-completed' : ''}
                  columns={[
                    {
                      title: 'Lựa chọn đối chiếu',
                      width: 150,
                      align: 'center',
                      render: (_, r) => {
                        const rowKey = `${r.branchId}-${r.manufacturer}-${r.version}`;
                        const isDone = r.receivedQuantity >= r.proposedQuantity;

                        if (isDone) return <Tag color="success" icon={<CheckCircleOutlined />}>Đã hoàn thành</Tag>;

                        return (
                          <Checkbox
                            checked={selectedRowKeys.includes(rowKey)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                onSelectChange([...selectedRowKeys, rowKey]);
                              } else {
                                onSelectChange(selectedRowKeys.filter(k => k !== rowKey));
                              }
                            }}
                          >
                            Đối chiếu
                          </Checkbox>
                        );
                      }
                    },
                    { title: 'Chi nhánh', dataIndex: 'branchName' },
                    { title: 'Model', render: (_, r) => `${r.manufacturer} ${r.version || ''}` },
                    { title: 'P.Thức', dataIndex: 'acquisitionMethod', render: (v) => v === 'Ownership' ? 'Mua đứt' : 'Thuê' },
                    { title: 'Định mức NL', dataIndex: 'fuelNorm', render: (v) => v ? `${v} L/100km` : '-' },
                    { title: 'Số lượng mua', dataIndex: 'proposedQuantity' },
                    {
                      title: 'Đã nhận', render: (_, r) => (
                        <span style={{ color: r.receivedQuantity >= r.proposedQuantity ? '#52c41a' : 'inherit', fontWeight: r.receivedQuantity >= r.proposedQuantity ? 'bold' : 'normal' }}>
                          {r.receivedQuantity} / {r.proposedQuantity}
                        </span>
                      )
                    },
                    {
                      title: 'Số lượng nhận',
                      width: 120,
                      render: (_, r) => {
                        const rowKey = `${r.branchId}-${r.manufacturer}-${r.version}`;
                        const isDone = r.receivedQuantity >= r.proposedQuantity;
                        return (
                          <InputNumber
                            min={1}
                            max={r.proposedQuantity - r.receivedQuantity}
                            disabled={isDone || !selectedRowKeys.includes(rowKey)}
                            value={isDone ? 0 : (receptionQuantities[rowKey] || 1)}
                            onChange={(val) => handleQtyChange(rowKey, val)}
                          />
                        );
                      }
                    },
                  ]}
                />
              </Card>

              {(selectedRowKeys.length > 0) && (
                <div style={{ background: '#f5f5f5', padding: 20, borderRadius: 8 }}>
                  <h4 style={{ marginBottom: 20 }}>2. Nhập thông tin chi tiết từng xe</h4>
                  <Form.List name="vehicles">
                    {(fields) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {fields.map(({ key, name, ...restField }) => {
                          const vehicleData = form.getFieldValue(['vehicles', name]);
                          return (
                            <Card
                              key={key}
                              size="small"
                              title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                                    XE #{vehicleData?.vehicleIndex} - {vehicleData?.manufacturer} {vehicleData?.version || ''}
                                  </Tag>
                                  <Tag color="cyan">Chi nhánh: {vehicleData?.branchName}</Tag>
                                </div>
                              }
                              style={{ border: '2px solid #1677ff', marginBottom: 16 }}
                            >
                              <div style={{ background: '#e6f4ff', padding: '8px 16px', borderRadius: 4, marginBottom: 16, border: '1px solid #91caff' }}>
                                <Row gutter={16}>
                                  <Col span={8}><strong>Định mức NL:</strong> {vehicleData?.fuelNorm} L/100km</Col>
                                  <Col span={16}><strong>Ghi chú đề xuất:</strong> {vehicleData?.branchNotes || 'Không có'}</Col>
                                </Row>
                              </div>

                              <Form.Item name={[name, 'branchId']} hidden><Input /></Form.Item>
                              <Form.Item name={[name, 'branchName']} hidden><Input /></Form.Item>
                              <Form.Item name={[name, 'manufacturer']} hidden><Input /></Form.Item>
                              <Form.Item name={[name, 'version']} hidden><Input /></Form.Item>
                              <Form.Item name={[name, 'vehicleIndex']} hidden><Input /></Form.Item>
                              <Form.Item name={[name, 'hasGsht']} hidden><Checkbox /></Form.Item>
                              <Form.Item name={[name, 'fuelNorm']} hidden><Input /></Form.Item>
                              <Form.Item name={[name, 'seats']} hidden><Input /></Form.Item>

                              <Row gutter={16}>
                                <Col span={6}>
                                  <Form.Item
                                    {...restField}
                                    label="Biển số"
                                    name={[name, 'licensePlate']}
                                    rules={[
                                      { required: true, message: 'Vui lòng nhập biển số' },
                                      {
                                        pattern: /^[0-9]{2}[A-Z]{1,2}-[0-9]{3,5}(\.[0-9]{2})?$/,
                                        message: 'Biển số không đúng định dạng (VD: 29A-123.45)'
                                      }
                                    ]}
                                    normalize={(value) => value ? value.toUpperCase().replace(/\s/g, '') : value}
                                  >
                                    <Input placeholder="VD: 29A-123.45" />
                                  </Form.Item>
                                </Col>
                                <Col span={6}>
                                  <Form.Item
                                    {...restField}
                                    label="Số VIN"
                                    name={[name, 'vin']}
                                    rules={[
                                      { required: true, message: 'Vui lòng nhập số VIN' },
                                      { len: 17, message: 'Số VIN phải đủ 17 ký tự' },
                                      {
                                        pattern: /^[A-HJ-NPR-Z0-9]{17}$/,
                                        message: 'Số VIN không hợp lệ (Không chứa I, O, Q)'
                                      }
                                    ]}
                                  >
                                    <Input placeholder="17 ký tự chuẩn ISO" />
                                  </Form.Item>
                                </Col>
                                <Col span={6}>
                                  <Form.Item {...restField} label="Số khung" name={[name, 'chassisNumber']} rules={[{ required: true }]}>
                                    <Input title="Số khung" />
                                  </Form.Item>
                                </Col>
                                <Col span={6}>
                                  <Form.Item {...restField} label="Số máy" name={[name, 'engineNumber']} rules={[{ required: true }]}>
                                    <Input title="Số máy" />
                                  </Form.Item>
                                </Col>
                                <Col span={4}>
                                  <Form.Item {...restField} label="Năm SX" name={[name, 'yearManufacture']} rules={[{ required: true }]}>
                                    <InputNumber min={1900} max={2100} style={{ width: '100%' }} />
                                  </Form.Item>
                                </Col>
                                <Col span={4}>
                                  <Form.Item {...restField} label="Số Km" name={[name, 'mileage']} rules={[{ required: true }]}>
                                    <InputNumber min={0} style={{ width: '100%' }} />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col span={10}>
                                  <Form.Item {...restField} label="Ghi chú" name={[name, 'notes']}>
                                    <Input />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Row gutter={16}>
                                <Col span={8}>
                                  <Form.Item
                                    {...restField}
                                    label="Hạn đăng kiểm"
                                    name={[name, 'registrationExpirationDate']}
                                    rules={[
                                      { required: true, message: 'Vui lòng chọn ngày' },
                                      () => ({
                                        validator(_, value) {
                                          if (!value || value.isAfter(dayjs())) {
                                            return Promise.resolve();
                                          }
                                          return Promise.reject(new Error('Ngày hết hạn phải ở tương lai'));
                                        },
                                      }),
                                    ]}
                                  >
                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item
                                    {...restField}
                                    label="Hạn bảo hiểm"
                                    name={[name, 'insuranceExpirationDate']}
                                    rules={[
                                      { required: true, message: 'Vui lòng chọn ngày' },
                                      () => ({
                                        validator(_, value) {
                                          if (!value || value.isAfter(dayjs())) {
                                            return Promise.resolve();
                                          }
                                          return Promise.reject(new Error('Ngày hết hạn phải ở tương lai'));
                                        },
                                      }),
                                    ]}
                                  >
                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                  </Form.Item>
                                </Col>
                                <Col span={8}>
                                  <Form.Item
                                    {...restField}
                                    label="Hạn phù hiệu"
                                    name={[name, 'badgeExpirationDate']}
                                    rules={[
                                      () => ({
                                        validator(_, value) {
                                          if (!value || value.isAfter(dayjs())) {
                                            return Promise.resolve();
                                          }
                                          return Promise.reject(new Error('Ngày hết hạn phải ở tương lai'));
                                        },
                                      }),
                                    ]}
                                  >
                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                  </Form.Item>
                                </Col>
                              </Row>

                              <Divider style={{ margin: '12px 0' }} dashed />

                              <Row gutter={24}>
                                <Col span={12}>
                                  <h5>Checklist đối chiếu</h5>
                                  <Form.Item name={[name, 'checkItems']} {...restField}>
                                    <Checkbox.Group style={{ width: '100%' }}>
                                      <Space direction="vertical">
                                        <Checkbox value="checkInfo">Biển số & Cavet trùng khớp</Checkbox>
                                        <Checkbox value="checkVinChassis">VIN & Khung máy trùng khớp</Checkbox>
                                        <Checkbox value="checkDocs">Đủ giấy tờ bàn giao</Checkbox>
                                      </Space>
                                    </Checkbox.Group>
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <h5>Ảnh minh chứng (tối đa 10 ảnh)</h5>
                                  <Form.Item
                                    name={[name, 'receiptImages']}
                                    valuePropName="fileList"
                                    getValueFromEvent={normFile}
                                  >
                                    <Upload
                                      listType="picture-card"
                                      multiple={true}
                                      maxCount={10}
                                      beforeUpload={() => false}
                                    >
                                      <PlusOutlined />
                                      <div style={{ marginTop: 8 }}>Tải ảnh</div>
                                    </Upload>
                                  </Form.Item>
                                </Col>
                              </Row>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </Form.List>
                </div>
              )}
            </Form>
          )}
        </div>
      </Modal>
    </div>
  );
}
