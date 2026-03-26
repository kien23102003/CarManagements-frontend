import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import accessoryApi from '../api/accessoryApi';
import { useAuth } from '../services/AuthContext';
import {
  GOODS_RECEIPT_STATUS_META,
  PURCHASE_REQUEST_STATUS_META,
  canReadAccessoryModule,
  STOCK_CONDITION_META,
  STOCK_CONDITION_OPTIONS,
  unwrapData,
} from '../services/accessoryHelpers';

export default function AccessoryGoodsReceiptDetailPage() {
  const { id } = useParams();
  const isCreate = id === 'new';
  const [searchParams] = useSearchParams();
  const purchaseRequestId = searchParams.get('purchaseRequestId');
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const readable = useMemo(() => canReadAccessoryModule(roles), [roles]);
  const [form] = Form.useForm();
  const watchedDetails = Form.useWatch('details', form);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [purchaseRequest, setPurchaseRequest] = useState(null);

  useEffect(() => {
    if (!readable) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        if (isCreate) {
          if (!purchaseRequestId) {
            message.error('Thiếu purchaseRequestId để tạo phiếu nhập');
            navigate('/accessory-goods-receipts');
            return;
          }

          const { data } = await accessoryApi.getPurchaseRequestById(purchaseRequestId);
          const payload = unwrapData(data);
          const pendingDetails = (payload.details || [])
            .filter((item) => (item.approvedQuantity ?? 0) > (item.receivedQuantity ?? 0))
            .map((item) => ({
              accessoryId: item.accessoryId,
              receivedQuantity: Math.max((item.approvedQuantity ?? 0) - (item.receivedQuantity ?? 0), 0),
              actualUnitPrice: item.estimatedUnitPrice,
              stockCondition: 'NEW',
            }));

          setPurchaseRequest(payload);
          form.setFieldsValue({
            purchaseRequestId: payload.id,
            branchId: payload.branchId,
            notes: payload.notes,
            details: pendingDetails,
          });
        } else {
          const { data } = await accessoryApi.getGoodsReceiptById(id);
          const payload = unwrapData(data);
          setDetail(payload);
          form.setFieldsValue({
            purchaseRequestId: payload.purchaseRequestId,
            branchId: payload.branchId,
            notes: payload.notes,
            details: (payload.details || []).map((item) => ({
              accessoryId: item.accessoryId,
              receivedQuantity: item.receivedQuantity,
              actualUnitPrice: item.actualUnitPrice,
              stockCondition: item.stockCondition || 'NEW',
            })),
          });
        }
      } catch (error) {
        message.error(error.response?.data?.message || 'Không thể tải phiếu nhập phụ kiện');
        navigate('/accessory-goods-receipts');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [form, id, isCreate, message, navigate, purchaseRequestId, readable]);

  const sourceRequestStatus = purchaseRequest?.status || detail?.purchaseRequestStatus;
  const editable = isCreate || detail?.status === 'Draft';

  const refreshDetail = async () => {
    if (isCreate) {
      return;
    }

    const { data } = await accessoryApi.getGoodsReceiptById(id);
    const payload = unwrapData(data);
    setDetail(payload);
    form.setFieldsValue({
      purchaseRequestId: payload.purchaseRequestId,
      branchId: payload.branchId,
      notes: payload.notes,
      details: (payload.details || []).map((item) => ({
        accessoryId: item.accessoryId,
        receivedQuantity: item.receivedQuantity,
        actualUnitPrice: item.actualUnitPrice,
        stockCondition: item.stockCondition || 'NEW',
      })),
    });
  };

  const toPayload = (values) => ({
    purchaseRequestId: Number(values.purchaseRequestId),
    branchId: Number(values.branchId),
    notes: values.notes,
    details: (values.details || []).map((item) => ({
      accessoryId: item.accessoryId,
      receivedQuantity: item.receivedQuantity,
      actualUnitPrice: item.actualUnitPrice ?? null,
      stockCondition: item.stockCondition,
    })),
  });

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      const { data } = await accessoryApi.createGoodsReceipt(toPayload(values));
      const created = unwrapData(data);
      message.success('Tạo phiếu nhập thành công');
      navigate(`/accessory-goods-receipts/${created.id}`);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tạo phiếu nhập');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await accessoryApi.completeGoodsReceipt(id, {
        notes: values.notes,
        details: toPayload(values).details,
      });
      message.success('Hoàn tất nhập hàng thành công');
      await refreshDetail();
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error.response?.data?.message || 'Không thể hoàn tất phiếu nhập');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReceipt = async () => {
    setSaving(true);
    try {
      await accessoryApi.cancelGoodsReceipt(id, { notes: 'Cancelled from frontend' });
      message.success('Đã hủy phiếu nhập');
      await refreshDetail();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể hủy phiếu nhập');
    } finally {
      setSaving(false);
    }
  };

  if (!readable) {
    return <Card>Bạn không có quyền truy cập chức năng này.</Card>;
  }

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/accessory-goods-receipts')} style={{ marginBottom: 12 }}>
        Quay lại
      </Button>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{isCreate ? 'Tạo phiếu nhập hàng' : 'Chi tiết phiếu nhập hàng'}</h2>
        {!isCreate && detail?.status === 'Draft' && (
          <Space>
            <Button type="primary" loading={saving} onClick={handleComplete}>
              Hoàn tất nhập hàng
            </Button>
            <Button danger loading={saving} onClick={handleCancelReceipt}>
              Hủy phiếu
            </Button>
          </Space>
        )}
      </div>

      {(detail || purchaseRequest) && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="Phiếu đề xuất">
              {purchaseRequest?.requestCode || detail?.purchaseRequestCode || `#${purchaseRequestId || detail?.purchaseRequestId}`}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái phiếu đề xuất">
              {sourceRequestStatus ? (
                <Tag color={(PURCHASE_REQUEST_STATUS_META[sourceRequestStatus] || {}).color || 'default'}>
                  {(PURCHASE_REQUEST_STATUS_META[sourceRequestStatus] || {}).label || sourceRequestStatus}
                </Tag>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Chi nhánh">
              {purchaseRequest?.branchName || detail?.branchName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái phiếu nhập">
              {!isCreate ? (
                <Tag color={(GOODS_RECEIPT_STATUS_META[detail?.status] || {}).color || 'default'}>
                  {(GOODS_RECEIPT_STATUS_META[detail?.status] || {}).label || detail?.status}
                </Tag>
              ) : (
                <Tag>Chuẩn bị tạo</Tag>
              )}
            </Descriptions.Item>
            {!isCreate && (
              <>
                <Descriptions.Item label="Người nhận">{detail?.receivedByName || detail?.receivedBy || '-'}</Descriptions.Item>
                <Descriptions.Item label="Ngày nhập">
                  {detail?.receiptDate ? new Date(detail.receiptDate).toLocaleDateString('vi-VN') : '-'}
                </Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Card>
      )}

      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="purchaseRequestId" label="Mã phiếu đề xuất">
            <InputNumber disabled style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="branchId" label="Chi nhánh">
            <InputNumber disabled style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} disabled={!editable} />
          </Form.Item>
          <Form.List name="details">
            {(fields) => (
              <>
                {fields.map((field) => {
                  const accessoryId = watchedDetails?.[field.name]?.accessoryId;
                  const item =
                    purchaseRequest?.details?.find((detailItem) => detailItem.accessoryId === accessoryId) ||
                    detail?.details?.find((detailItem) => detailItem.accessoryId === accessoryId);

                  return (
                    <Card key={field.key} size="small" title={item?.accessoryName || `Phụ kiện #${accessoryId}`} style={{ marginBottom: 12 }}>
                      <Form.Item name={[field.name, 'accessoryId']} hidden>
                        <InputNumber />
                      </Form.Item>
                      <Form.Item label="Mã phụ kiện">
                        <Input value={item?.accessoryCode || accessoryId} disabled />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'receivedQuantity']}
                        label="Số lượng thực nhận"
                        rules={[
                          { required: true, message: 'Vui lòng nhập số lượng thực nhận' },
                          { type: 'number', min: 1, message: 'Số lượng phải lớn hơn 0' },
                        ]}
                      >
                        <InputNumber min={1} style={{ width: '100%' }} disabled={!editable} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'stockCondition']}
                        label="Tình trạng nhập kho"
                        rules={[{ required: true, message: 'Vui lòng chọn tình trạng nhập kho' }]}
                      >
                        <Select disabled={!editable} options={STOCK_CONDITION_OPTIONS} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'actualUnitPrice']} label="Đơn giá thực tế">
                        <InputNumber min={0} style={{ width: '100%' }} disabled={!editable} />
                      </Form.Item>
                    </Card>
                  );
                })}
              </>
            )}
          </Form.List>

          {isCreate && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => navigate('/accessory-goods-receipts')}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={saving} disabled={!watchedDetails?.length}>
                Tạo phiếu nhập
              </Button>
            </div>
          )}
        </Form>
      </Card>

      {!isCreate && detail?.details?.length ? (
        <Card title="Danh sách hàng nhận" style={{ marginTop: 16 }}>
          <Table
            rowKey={(record) => String(record.id ?? record.accessoryId)}
            pagination={false}
            dataSource={detail.details}
            columns={[
              { title: 'Phụ kiện', dataIndex: 'accessoryName', key: 'accessoryName' },
              { title: 'Mã', dataIndex: 'accessoryCode', key: 'accessoryCode', width: 120 },
              { title: 'Số lượng nhận', dataIndex: 'receivedQuantity', key: 'receivedQuantity', width: 120 },
              {
                title: 'Tình trạng kho',
                dataIndex: 'stockCondition',
                key: 'stockCondition',
                width: 180,
                render: (value) => {
                  const meta = STOCK_CONDITION_META[value] || { label: value, color: 'default' };
                  return <Tag color={meta.color}>{meta.label}</Tag>;
                },
              },
              { title: 'Đơn giá thực tế', dataIndex: 'actualUnitPrice', key: 'actualUnitPrice', width: 140, render: (value) => value ?? '-' },
            ]}
          />
        </Card>
      ) : null}
    </div>
  );
}
