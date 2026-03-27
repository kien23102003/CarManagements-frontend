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
    DatePicker,
    Select,
    InputNumber,
    Empty,
    Tag
} from 'antd';
import {
    InboxOutlined,
    FileTextOutlined,
    CarOutlined,
    CheckCircleOutlined
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
    isReadOnly = false,
}) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [checkedItems, setCheckedItems] = useState({});
    const [imageBase64, setImageBase64] = useState(null);

    // ===== VALIDATE FORM (Only for Create) =====
    const validateForm = () => {
        const { licensePlate, chassisNumber, engineNumber, vin, telematicsImei } = form.getFieldsValue();
        const branchDetail = plan?.branchDetails?.[0];
        const isGshtRequired = branchDetail?.hasGsht;

        if (!licensePlate) { message.error('Vui lòng nhập biển số xe'); return false; }
        if (!vin) { message.error('Vui lòng nhập số VIN'); return false; }
        if (!chassisNumber) { message.error('Vui lòng nhập số khung'); return false; }
        if (!engineNumber) { message.error('Vui lòng nhập số máy'); return false; }
        if (!checkedItems.checkInfo || !checkedItems.checkVinChassis || !checkedItems.checkDocs) {
            message.error('Vui lòng tích xác nhận đầy đủ các mục kiểm tra thực tế (Biển số, VIN, Giấy tờ)');
            return false;
        }
        if (isGshtRequired) {
            if (!telematicsImei) { message.error('Xe này đề xuất có GSHT, vui lòng nhập IMEI'); return false; }
            if (!checkedItems.checkImei) { message.error('Vui lòng tích xác nhận IMEI GSHT'); return false; }
        }
        if (!imageBase64) { message.error('Vui lòng tải lên ảnh chứng minh'); return false; }
        return true;
    };

    // ===== HANDLE SUBMIT (Only for Create) =====
    const handleSubmit = async () => {
        if (isReadOnly) return;
        if (!validateForm()) return;

        setLoading(true);
        try {
            const values = form.getFieldsValue();
            const payload = {
                purchaseProposalId: proposalId,
                branchId: plan?.branchDetails?.[0]?.branchId || 0,
                ...values,
                registrationExpirationDate: values.registrationExpirationDate?.format('YYYY-MM-DD'),
                insuranceExpirationDate: values.insuranceExpirationDate?.format('YYYY-MM-DD'),
                badgeExpirationDate: values.badgeExpirationDate?.format('YYYY-MM-DD'),
                receiptImageUrl: imageBase64,
            };

            const res = await receptionApi.create(payload);
            if (res?.data?.isSuccess) {
                message.success('Bản ghi đối chiếu được tạo thành công');
                onSuccess?.();
            } else {
                message.error(res?.data?.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error(error);
            message.error('Lỗi khi lưu dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
        if (newFileList.length > 0) {
            const file = newFileList[0].originFileObj;
            const reader = new FileReader();
            reader.onload = (e) => setImageBase64(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    // Render một card chi tiết cho một xe (Dùng cho xem lại)
    const renderVehicleDetailCard = (data, index = 0) => {
        return (
            <Card 
                key={data.id || index} 
                title={<span><FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />Xe #{index + 1}: <b>{data.licensePlate}</b></span>}
                size="small" 
                style={{ marginBottom: 20, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                extra={<Tag color="blue">{data.status || 'Đã đối chiếu'}</Tag>}
            >
                <Row gutter={[24, 16]}>
                    <Col span={6}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Biển số</div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{data.licensePlate}</div>
                    </Col>
                    <Col span={10}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Mã VIN (17 ký tự)</div>
                        <div style={{ fontWeight: 500 }}>{data.vin}</div>
                    </Col>
                    <Col span={8}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Phiên bản</div>
                        <div>{data.version || '-'}</div>
                    </Col>
                </Row>

                <Divider style={{ margin: '12px 0' }} />

                <Row gutter={[24, 16]}>
                    <Col span={6}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Số khung</div>
                        <div>{data.chassisNumber}</div>
                    </Col>
                    <Col span={6}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Số máy</div>
                        <div>{data.engineNumber}</div>
                    </Col>
                    <Col span={6}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>IMEI GSHT</div>
                        <div>{data.telematicsImei || 'N/A'}</div>
                    </Col>
                    <Col span={6}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Định mức NL</div>
                        <div>{data.fuelNorm ? `${data.fuelNorm} L/100km` : 'N/A'}</div>
                    </Col>
                </Row>

                <Row gutter={[24, 16]} style={{ marginTop: 12 }}>
                    <Col span={6}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Hạn đăng kiểm</div>
                        <div style={{ color: dayjs(data.registrationExpirationDate).isBefore(dayjs()) ? 'red' : 'inherit' }}>
                            {data.registrationExpirationDate ? dayjs(data.registrationExpirationDate).format('DD/MM/YYYY') : '-'}
                        </div>
                    </Col>
                    <Col span={6}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Hạn bảo hiểm</div>
                        <div>{data.insuranceExpirationDate ? dayjs(data.insuranceExpirationDate).format('DD/MM/YYYY') : '-'}</div>
                    </Col>
                    <Col span={6}>
                        <div style={{ color: '#8c8c8c', fontSize: '11px', textTransform: 'uppercase' }}>Hạn phù hiệu</div>
                        <div>{data.badgeExpirationDate ? dayjs(data.badgeExpirationDate).format('DD/MM/YYYY') : '-'}</div>
                    </Col>
                </Row>

                <Row gutter={24} style={{ marginTop: 20 }}>
                    <Col span={12}>
                        <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', height: '100%' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: '12px' }}>TRẠNG THÁI KIỂM KÊ:</div>
                            <Space direction="vertical" size={2}>
                                <Checkbox checked disabled><span style={{ fontSize: '13px' }}>Biển số & Cavet trùng khớp</span></Checkbox>
                                <Checkbox checked disabled><span style={{ fontSize: '13px' }}>VIN, Khung, Máy khớp thực tế</span></Checkbox>
                                <Checkbox checked disabled><span style={{ fontSize: '13px' }}>Đã thu đủ hồ sơ gốc</span></Checkbox>
                                {data.telematicsImei && <Checkbox checked disabled><span style={{ fontSize: '13px' }}>IMEI GSHT hoạt động (FMS)</span></Checkbox>}
                            </Space>
                            {data.notes && (
                                <div style={{ marginTop: 12, borderTop: '1px solid #e8e8e8', paddingTop: 8 }}>
                                    <div style={{ fontSize: '11px', color: '#8c8c8c' }}>GHI CHÚ:</div>
                                    <div style={{ fontSize: '13px' }}>{data.notes}</div>
                                </div>
                            )}
                        </div>
                    </Col>
                    <Col span={12}>
                        {data.receiptImageUrl ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#8c8c8c', textAlign: 'left', marginBottom: 4 }}>ẢNH CHỨNG MINH:</div>
                                <img 
                                    src={data.receiptImageUrl} 
                                    alt="vin-plate" 
                                    style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 4, border: '1px solid #f0f0f0' }} 
                                />
                            </div>
                        ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có ảnh" />
                        )}
                    </Col>
                </Row>
            </Card>
        );
    };

    return (
        <Modal
            title={<span style={{ fontWeight: 'bold', color: '#003a8c', fontSize: '18px' }}>
                {isReadOnly ? "PHIẾU XÁC NHẬN ĐỐI CHIẾU XE" : "LẬP BẢN GHI ĐỐI CHIẾU MỚI"}
            </span>}
            open={true}
            onCancel={onClose}
            width={1000}
            centered
            footer={isReadOnly ? [
                <Button key="close" type="primary" onClick={onClose} size="large" style={{ width: 120 }}>Đóng</Button>
            ] : [
                <Button key="cancel" onClick={onClose}>Hủy</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit} style={{ background: '#1890ff' }}>Ghi nhận & Lưu</Button>,
            ]}
        >
            <div style={{ maxHeight: '75vh', overflowY: 'auto', padding: '0 8px' }}>
                {/* TÓM TẮT ĐỀ XUẤT */}
                <div style={{ background: '#e6f7ff', padding: '16px', borderRadius: '8px', border: '1px solid #91d5ff', marginBottom: 24 }}>
                    <Row gutter={16}>
                        <Col span={6}>
                            <div style={{ color: '#0050b3', fontSize: '12px' }}>Mã đề xuất</div>
                            <div style={{ fontWeight: 'bold' }}>#{proposalId}</div>
                        </Col>
                        <Col span={8}>
                            <div style={{ color: '#0050b3', fontSize: '12px' }}>Thông số cấu hình</div>
                            <div style={{ fontWeight: 'bold' }}>{plan?.branchDetails?.[0]?.manufacturer} - {plan?.branchDetails?.[0]?.version}</div>
                        </Col>
                        <Col span={5}>
                            <div style={{ color: '#0050b3', fontSize: '12px' }}>Chi nhánh nhận</div>
                            <div style={{ fontWeight: 'bold' }}>{plan?.branchDetails?.[0]?.branchName}</div>
                        </Col>
                        <Col span={5} style={{ textAlign: 'right' }}>
                            <div style={{ color: '#0050b3', fontSize: '12px' }}>Tiến độ nhận</div>
                            <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                                <span style={{ color: '#52c41a' }}>{plan?.branchDetails?.[0]?.receivedQuantity}</span> / {plan?.branchDetails?.[0]?.proposedQuantity} Xe
                            </div>
                        </Col>
                    </Row>
                </div>

                {isReadOnly ? (
                    /* CHẾ ĐỘ XEM LẠI: HIỂN THỊ DANH SÁCH SHEET */
                    <div className="reception-sheet-review">
                        {plan?.receptions && plan.receptions.length > 0 ? (
                            plan.receptions.map((item, idx) => renderVehicleDetailCard(item, idx))
                        ) : (
                            <Empty description="Chưa có dữ liệu đối chiếu" />
                        )}
                    </div>
                ) : (
                    /* CHẾ ĐỘ NHẬP MỚI: FORM NHẬP */
                    <Form form={form} layout="vertical">
                        <Card title={<span><CarOutlined style={{ marginRight: 8 }} />Cập nhật thông tin xe thực tế</span>} size="small" style={{ border: '1px solid #1890ff' }}>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item label="Biển số xe" name="licensePlate" rules={[{ required: true, message: 'Nhập biển số' }]}>
                                        <Input placeholder="VD: 30K-123.45" />
                                    </Form.Item>
                                </Col>
                                <Col span={16}>
                                    <Form.Item label="Số VIN" name="vin" rules={[{ required: true, message: 'Nhập mã VIN' }]}>
                                        <Input placeholder="Mã VIN 17 ký tự" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={8}><Form.Item label="Số khung" name="chassisNumber" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                <Col span={8}><Form.Item label="Số máy" name="engineNumber" rules={[{ required: true }]}><Input /></Form.Item></Col>
                                <Col span={8}><Form.Item label="Phiên bản (Version)" name="version"><Input /></Form.Item></Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item label="IMEI FMS/GSHT" name="telematicsImei"><Input placeholder="Tùy chọn"/></Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Định mức (L/100km)" name="fuelNorm"><InputNumber min={0} step={0.1} style={{width:'100%'}}/></Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Loại phù hiệu" name="badgeType">
                                        <Select options={[{value:'Xe Hợp Đồng', label:'Xe Hợp Đồng'}, {value:'Xe Tải', label:'Xe Tải'}]}/>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Form.Item label="Hạn đăng kiểm" name="registrationExpirationDate" rules={[{ required: true }]}>
                                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Hạn bảo hiểm" name="insuranceExpirationDate" rules={[{ required: true }]}>
                                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item label="Hạn phù hiệu" name="badgeExpirationDate" rules={[{ required: true }]}>
                                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            
                            <Divider orientation="left">Checklist kiểm tra</Divider>
                            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', marginBottom: 16 }}>
                                <Space direction="vertical">
                                    <Checkbox checked={checkedItems.checkInfo} onChange={e => setCheckedItems({...checkedItems, checkInfo: e.target.checked})}>Xác nhận Biển số và Cavet khớp</Checkbox>
                                    <Checkbox checked={checkedItems.checkVinChassis} onChange={e => setCheckedItems({...checkedItems, checkVinChassis: e.target.checked})}>Xác nhận số VIN, Khung, Máy khớp thực tế</Checkbox>
                                    <Checkbox checked={checkedItems.checkDocs} onChange={e => setCheckedItems({...checkedItems, checkDocs: e.target.checked})}>Xác nhận đã thu đủ bộ hồ sơ gốc</Checkbox>
                                    {plan?.branchDetails?.[0]?.hasGsht && (
                                        <Checkbox checked={checkedItems.checkImei} onChange={e => setCheckedItems({...checkedItems, checkImei: e.target.checked})}>Đã kiểm tra IMEI và kích hoạt GSHT</Checkbox>
                                    )}
                                </Space>
                            </div>

                            <Form.Item label="Tải lên ảnh VIN/Biển số" required>
                                <Dragger 
                                    onRemove={() => { setFileList([]); setImageBase64(null); }}
                                    beforeUpload={() => false}
                                    maxCount={1}
                                    fileList={fileList}
                                    onChange={handleFileChange}
                                >
                                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                    <p className="ant-upload-text">Thả ảnh vào đây hoặc nhấp để chọn</p>
                                </Dragger>
                            </Form.Item>
                        </Card>
                    </Form>
                )}
            </div>
        </Modal>
    );
}
