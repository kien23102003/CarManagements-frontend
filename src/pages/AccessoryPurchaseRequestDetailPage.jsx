import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import accessoryApi from '../api/accessoryApi';
import assetApi from '../api/assetApi';
import { useAuth } from '../services/AuthContext';
import {
  PURCHASE_REQUEST_STATUS_META,
  branchOption,
  canApproveAccessoryPurchase,
  canReadAccessoryModule,
  canViewAccessoryAcrossBranches,
  unwrapData,
} from '../services/accessoryHelpers';

export default function AccessoryPurchaseRequestDetailPage() {
  const { id } = useParams();
  const isCreate = id === 'new';
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canReadAccessoryModule(roles), [roles]);
  const canApprove = useMemo(() => canApproveAccessoryPurchase(roles), [roles]);
  const canViewAcrossBranches = useMemo(() => canViewAccessoryAcrossBranches(roles), [roles]);
  const [form] = Form.useForm();
  const [approvalForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const approvalDetails = Form.useWatch('details', approvalForm) || [];

  const [branches, setBranches] = useState([]);
  const [accessories, setAccessories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const [branchRes, accessoryRes] = await Promise.all([
          assetApi.getBranches(),
          accessoryApi.getAccessories({ page: 1, pageSize: 500 }),
        ]);
        setBranches(unwrapData(branchRes.data));
        setAccessories(unwrapData(accessoryRes.data));
      } catch {
        setBranches([]);
        setAccessories([]);
      }
    };

    loadBaseData();
  }, []);

  useEffect(() => {
    if (!readable) {
      return;
    }

    if (isCreate) {
      form.setFieldsValue({
        branchId: user?.branchId || undefined,
        notes: '',
        details: [{ accessoryId: undefined, requestedQuantity: 1, estimatedUnitPrice: null, notes: '' }],
      });
      return;
    }

    const loadDetail = async () => {
      setLoading(true);
      try {
        const { data } = await accessoryApi.getPurchaseRequestById(id);
        const payload = unwrapData(data);
        const detailItems = (payload.details || []).map((item) => ({
          accessoryId: item.accessoryId,
          requestedQuantity: item.requestedQuantity,
          approvedQuantity: item.approvedQuantity,
          estimatedUnitPrice: item.estimatedUnitPrice,
          notes: item.notes,
        }));

        setDetail(payload);
        form.setFieldsValue({
          branchId: payload.branchId,
          notes: payload.notes,
          details: detailItems,
        });
        approvalForm.setFieldsValue({
          notes: payload.notes,
          details: (payload.details || []).map((item) => ({
            accessoryId: item.accessoryId,
            approvedQuantity: item.approvedQuantity ?? item.requestedQuantity,
          })),
        });
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải phiếu đề xuất');
        navigate('/accessory-purchase-requests');
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [approvalForm, form, id, isCreate, message, navigate, readable, user?.branchId]);

  const branchOptions = branches.map(branchOption);

  const accessoryOptions = accessories.map((item) => ({
    value: item.id,
    label: `${item.code || ''} ${item.name || ''}`.trim(),
  }));

  const editable = isCreate || detail?.status === 'Pending';

  const reloadDetail = async () => {
    if (isCreate) return;
    const { data } = await accessoryApi.getPurchaseRequestById(id);
    const payload = unwrapData(data);
    setDetail(payload);
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = {
        branchId: values.branchId,
        notes: values.notes,
        details: (values.details || []).map((item) => ({
          accessoryId: item.accessoryId,
          requestedQuantity: item.requestedQuantity,
          estimatedUnitPrice: item.estimatedUnitPrice ?? null,
          notes: item.notes || null,
        })),
      };

      if (isCreate) {
        const { data } = await accessoryApi.createPurchaseRequest(payload);
        const created = unwrapData(data);
        message.success('Tạo phiếu đề xuất thành công');
        navigate(`/accessory-purchase-requests/${created.id}`);
      } else {
        await accessoryApi.updatePurchaseRequest(id, payload);
        message.success('Cập nhật phiếu đề xuất thành công');
        await reloadDetail();
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể lưu phiếu đề xuất');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      const values = await approvalForm.validateFields();
      await accessoryApi.approvePurchaseRequest(id, values);
      message.success('Duyệt phiếu đề xuất thành công');
      setApprovalOpen(false);
      await reloadDetail();
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error.response?.data?.message || 'Không thể duyệt phiếu đề xuất');
      }
    }
  };

  const handleReject = async (values) => {
    try {
      await accessoryApi.rejectPurchaseRequest(id, values);
      message.success('Từ chối phiếu đề xuất thành công');
      setRejectOpen(false);
      rejectForm.resetFields();
      await reloadDetail();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể từ chối phiếu đề xuất');
    }
  };

  if (!readable) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/accessory-purchase-requests')} style={{ marginBottom: 12 }}>
        Quay lại
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>
          {isCreate ? 'Tạo phiếu đề xuất mua phụ kiện' : 'Chi tiết phiếu đề xuất mua phụ kiện'}
        </h2>
        {!isCreate && detail && (
          <Space>
            <Button
              onClick={() => navigate(`/accessory-goods-receipts/new?purchaseRequestId=${detail.id}`)}
              disabled={!['Approved', 'PartiallyReceived'].includes(detail.status)}
            >
              Tạo phiếu nhập
            </Button>
            {canApprove && detail.status === 'Pending' && (
              <>
                <Button type="primary" onClick={() => setApprovalOpen(true)}>Duyệt</Button>
                <Button danger onClick={() => setRejectOpen(true)}>Từ chối</Button>
              </>
            )}
          </Space>
        )}
      </div>

      {!isCreate && detail && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Mã phiếu">{detail.requestCode}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={(PURCHASE_REQUEST_STATUS_META[detail.status] || {}).color || 'default'}>
                {(PURCHASE_REQUEST_STATUS_META[detail.status] || {}).label || detail.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">{detail.branchName || `Chi nhánh #${detail.branchId}`}</Descriptions.Item>
            <Descriptions.Item label="Người đề xuất">{detail.requesterName || detail.requesterId}</Descriptions.Item>
            <Descriptions.Item label="Ngày đề xuất">
              {detail.requestDate ? new Date(detail.requestDate).toLocaleDateString('vi-VN') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày duyệt">
              {detail.approvedDate ? new Date(detail.approvedDate).toLocaleDateString('vi-VN') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Người duyệt">{detail.approvedByName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú">{detail.notes || '-'}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {canViewAcrossBranches ? (
            <Form.Item
              name="branchId"
              label="Chi nhánh"
              rules={[{ required: true, message: 'Vui lòng chọn chi nhánh' }]}
            >
              <Select options={branchOptions} disabled={!editable} />
            </Form.Item>
          ) : (
            <Form.Item name="branchId" hidden>
              <InputNumber />
            </Form.Item>
          )}

          <Form.Item name="notes" label="Ghi chú chung">
            <Input.TextArea rows={3} disabled={!editable} />
          </Form.Item>

          <Form.List name="details">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`Dòng ${field.name + 1}`}
                    style={{ marginBottom: 12 }}
                    extra={
                      editable && fields.length > 1 ? (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                      ) : null
                    }
                  >
                    <Form.Item
                      key={`accessory-${field.key}`}
                      name={[field.name, 'accessoryId']}
                      label="Phụ kiện"
                      rules={[{ required: true, message: 'Vui lòng chọn phụ kiện' }]}
                    >
                      <Select showSearch optionFilterProp="label" options={accessoryOptions} disabled={!editable} />
                    </Form.Item>

                    <Form.Item
                      key={`requested-${field.key}`}
                      name={[field.name, 'requestedQuantity']}
                      label="Số lượng đề xuất"
                      rules={[
                        { required: true, message: 'Vui lòng nhập số lượng' },
                        { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0' },
                      ]}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} disabled={!editable} />
                    </Form.Item>

                    {!isCreate && !editable && (
                      <Form.Item key={`approved-${field.key}`} name={[field.name, 'approvedQuantity']} label="Số lượng duyệt">
                        <InputNumber style={{ width: '100%' }} disabled />
                      </Form.Item>
                    )}

                    <Form.Item key={`price-${field.key}`} name={[field.name, 'estimatedUnitPrice']} label="Đơn giá ước tính">
                      <InputNumber min={0} style={{ width: '100%' }} disabled={!editable} />
                    </Form.Item>

                    <Form.Item key={`notes-${field.key}`} name={[field.name, 'notes']} label="Ghi chú">
                      <Input.TextArea rows={2} disabled={!editable} />
                    </Form.Item>
                  </Card>
                ))}

                {editable && (
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={() => add({ accessoryId: undefined, requestedQuantity: 1, estimatedUnitPrice: null, notes: '' })}
                    block
                  >
                    Thêm dòng phụ kiện
                  </Button>
                )}
              </>
            )}
          </Form.List>

          {editable && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => navigate('/accessory-purchase-requests')}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                {isCreate ? 'Tạo phiếu' : 'Cập nhật'}
              </Button>
            </div>
          )}
        </Form>
      </Card>

      <Modal
        title="Duyệt phiếu đề xuất"
        open={approvalOpen}
        forceRender
        onCancel={() => setApprovalOpen(false)}
        onOk={handleApprove}
        okText="Duyệt"
      >
        <Form form={approvalForm} layout="vertical">
          <Form.List name="details">
            {(fields) => (
              <>
                {fields.map((field) => {
                  const accessoryId = approvalDetails[field.name]?.accessoryId;
                  const accessory = detail?.details?.find((item) => item.accessoryId === accessoryId);

                  return (
                    <Card
                      key={field.key}
                      size="small"
                      title={accessory?.accessoryName || `Phụ kiện #${accessoryId}`}
                      style={{ marginBottom: 12 }}
                    >
                      <Form.Item key={`hidden-${field.key}`} name={[field.name, 'accessoryId']} hidden>
                        <InputNumber />
                      </Form.Item>

                      <Form.Item
                        key={`approval-${field.key}`}
                        name={[field.name, 'approvedQuantity']}
                        label={`Số lượng duyệt / đề xuất ${accessory?.requestedQuantity || 0}`}
                        rules={[
                          { required: true, message: 'Vui lòng nhập số lượng duyệt' },
                          { type: 'number', min: 0, message: 'Số lượng duyệt không được âm' },
                        ]}
                      >
                        <InputNumber min={0} max={accessory?.requestedQuantity || undefined} style={{ width: '100%' }} />
                      </Form.Item>
                    </Card>
                  );
                })}
              </>
            )}
          </Form.List>

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Từ chối phiếu đề xuất" open={rejectOpen} footer={null} onCancel={() => setRejectOpen(false)}>
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item name="notes" label="Lý do từ chối">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setRejectOpen(false)}>Hủy</Button>
            <Button danger type="primary" htmlType="submit">
              Từ chối
            </Button>
          </div>
        </Form>
      </Modal>

      {!isCreate && detail?.details?.length ? (
        <Card title="Tổng hợp chi tiết" style={{ marginTop: 16 }}>
          <Table
            rowKey={(record) => String(record.id ?? record.accessoryId)}
            pagination={false}
            dataSource={detail.details}
            columns={[
              { title: 'Phụ kiện', dataIndex: 'accessoryName', key: 'accessoryName' },
              { title: 'Ma', dataIndex: 'accessoryCode', key: 'accessoryCode', width: 120 },
              { title: 'Mã', dataIndex: 'accessoryCode', key: 'accessoryCode', width: 120 },
              { title: 'Đề xuất', dataIndex: 'requestedQuantity', key: 'requestedQuantity', width: 100 },
              { title: 'Duyệt', dataIndex: 'approvedQuantity', key: 'approvedQuantity', width: 100, render: (value) => value ?? '-' },
              { title: 'Đã nhận', dataIndex: 'receivedQuantity', key: 'receivedQuantity', width: 100 },
              { title: 'Đơn giá ước tính', dataIndex: 'estimatedUnitPrice', key: 'estimatedUnitPrice', width: 140, render: (value) => value ?? '-' },
              { title: 'Ghi chú', dataIndex: 'notes', key: 'notes', render: (value) => value || '-' },
            ]}
          />
        </Card>
      ) : null}
    </div>
  );
}
