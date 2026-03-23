import { useState } from "react"
import { Alert, Checkbox, Form, Input, InputNumber, Modal } from "antd"
import { endTrip } from "../services/tripLogService"

export default function EndTripModal({ open, tripId, isOverDuration, startMileage, remainingMinutes, onCancel, onSuccess }) {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const isStopDifferent = Form.useWatch("isStopDifferent", form)

    const handleFinish = async (values) => {
        if (!tripId) {
            Modal.error({
                title: "Thiếu thông tin chuyến",
                content: "Không tìm thấy chuyến để kết thúc.",
            })
            return
        }
        Modal.confirm({
            title: "Xác nhận kết thúc chuyến?",
            content: isOverDuration
                ? "Chuyến này đã vượt quá thời gian cho phép. Bạn có chắc chắn muốn kết thúc?"
                : "Vui lòng xác nhận kết thúc chuyến.",
            okText: "Xác nhận",
            cancelText: "Hủy",
            onOk: async () => {
                setLoading(true)
                try {
                    await endTrip(tripId, {
                        endMileage: values.endMileage,
                        isStopDifferent: values.isStopDifferent || false,
                        actualStop: values.actualStop,
                        stopDeviationReason: values.stopDeviationReason,
                        overtimeReason: values.overtimeReason,
                        extensionDays: values.extensionDays || 0,
                        extensionHours: values.extensionHours || 0,
                        extensionMinutes: values.extensionMinutes || 0,
                    })
                    form.resetFields()
                    onSuccess?.()
                } catch (error) {
                    Modal.error({
                        title: "Kết thúc chuyến thất bại",
                        content: error?.response?.data?.message || "Không thể kết thúc chuyến.",
                    })
                } finally {
                    setLoading(false)
                }
            },
        })
    }

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText="Kết thúc chuyến"
            cancelText="Hủy"
            confirmLoading={loading}
            okButtonProps={{ disabled: !tripId }}
            title="Kết thúc chuyến"
            destroyOnHidden
            forceRender
        >
            {isOverDuration && (
                <Alert
                    type="error"
                    message="Chuyến đi đã vượt thời gian cho phép"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            )}
            <div style={{ marginBottom: 12, color: "#64748b", fontSize: 12 }}>
                Km bắt đầu: <strong style={{ color: "#0f172a" }}>{startMileage ?? "--"}</strong>
            </div>
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                    label="Số km kết thúc"
                    name="endMileage"
                    rules={[
                        { required: true, message: "Vui lòng nhập số km kết thúc" },
                        () => ({
                            validator(_, value) {
                                if (value == null || value === "") return Promise.resolve()
                                if (Number(value) < 1) {
                                    return Promise.reject(new Error("Số km kết thúc không hợp lệ"))
                                }
                                if (startMileage != null && Number(value) < Number(startMileage)) {
                                    return Promise.reject(new Error("Số km kết thúc phải lớn hơn hoặc bằng số km bắt đầu"))
                                }
                                return Promise.resolve()
                            },
                        }),
                    ]}
                >
                    <InputNumber
                        min={startMileage != null ? Number(startMileage) : 1}
                        style={{ width: "100%" }}
                        placeholder="Nhập số km kết thúc"
                    />
                </Form.Item>

                <Form.Item name="isStopDifferent" valuePropName="checked">
                    <Checkbox>Điểm dừng thực tế khác điểm dừng dự kiến</Checkbox>
                </Form.Item>

                <Form.Item
                    label="Điểm dừng thực tế"
                    name="actualStop"
                    dependencies={["isStopDifferent"]}
                    rules={[
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!getFieldValue("isStopDifferent")) return Promise.resolve()
                                if (!value) return Promise.reject(new Error("Vui lòng nhập điểm dừng thực tế"))
                                return Promise.resolve()
                            },
                        }),
                    ]}
                >
                    <Input placeholder="Nhập điểm dừng thực tế" disabled={!isStopDifferent} />
                </Form.Item>

                <Form.Item
                    label="Lý do dừng lệch"
                    name="stopDeviationReason"
                    dependencies={["isStopDifferent"]}
                    rules={[
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!getFieldValue("isStopDifferent")) return Promise.resolve()
                                if (!value) return Promise.reject(new Error("Vui lòng nhập lý do dừng lệch"))
                                return Promise.resolve()
                            },
                        }),
                    ]}
                >
                    <Input placeholder="Nhập lý do" disabled={!isStopDifferent} />
                </Form.Item>

                {remainingMinutes != null && remainingMinutes < 0 && (
                    <>
                        <Form.Item
                            label="Lý do quá thời lượng"
                            name="overtimeReason"
                            rules={[{ required: true, message: "Vui lòng nhập lý do quá thời lượng" }]}
                        >
                            <Input placeholder="Nhập lý do" />
                        </Form.Item>

                        <Form.Item
                            label="Xin thêm thời gian"
                            required
                            rules={[
                                () => ({
                                    validator() {
                                        const values = form.getFieldsValue(["extensionDays", "extensionHours", "extensionMinutes"])
                                        const total =
                                            (Number(values.extensionDays) || 0) * 24 * 60 +
                                            (Number(values.extensionHours) || 0) * 60 +
                                            (Number(values.extensionMinutes) || 0)
                                        if (total <= 0) {
                                            return Promise.reject(new Error("Vui lòng nhập thời gian xin thêm"))
                                        }
                                        return Promise.resolve()
                                    },
                                }),
                            ]}
                        >
                            <div style={{ display: "flex", gap: 8 }}>
                                <Form.Item name="extensionDays" noStyle>
                                    <InputNumber min={0} style={{ width: "33%" }} placeholder="Ngày" />
                                </Form.Item>
                                <Form.Item name="extensionHours" noStyle>
                                    <InputNumber min={0} max={23} style={{ width: "33%" }} placeholder="Giờ" />
                                </Form.Item>
                                <Form.Item name="extensionMinutes" noStyle>
                                    <InputNumber min={0} max={59} style={{ width: "33%" }} placeholder="Phút" />
                                </Form.Item>
                            </div>
                        </Form.Item>
                    </>
                )}
            </Form>
        </Modal>
    )
}
