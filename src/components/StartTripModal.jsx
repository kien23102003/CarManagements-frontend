import { useEffect, useMemo, useState } from "react"
import { Form, Input, InputNumber, Modal, Select, Typography } from "antd"
import { getTripHistoryByVehicle, startTrip } from "../services/tripLogService"

const { Text } = Typography

export default function StartTripModal({ open, onCancel, onSuccess, vehicle }) {
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [minStartMileage, setMinStartMileage] = useState(null)
    const [lastTripDestination, setLastTripDestination] = useState(null)
    const [lastTripEndMileage, setLastTripEndMileage] = useState(null)

    const driverOptions = useMemo(() => {
        if (!vehicle?.currentDriverId) return []
        return [{
            label: vehicle.currentDriverName || `Tài xế #${vehicle.currentDriverId}`,
            value: vehicle.currentDriverId,
        }]
    }, [vehicle])

    useEffect(() => {
        form.setFieldsValue({
            driverId: vehicle?.currentDriverId || undefined,
            plannedDays: 0,
            plannedHours: 0,
            plannedMinutes: 0,
        })
        setMinStartMileage(null)
        setLastTripDestination(null)
        setLastTripEndMileage(null)
    }, [form, vehicle])

    useEffect(() => {
        const loadHistory = async () => {
            if (!open || !vehicle?.vehicleId) return
            try {
                const data = await getTripHistoryByVehicle(vehicle.vehicleId)
                const trips = data?.trips || []
                const lastCompletedByVehicle = trips
                    .filter((t) => t?.endTime)
                    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0]

                if (lastCompletedByVehicle) {
                    setLastTripDestination(lastCompletedByVehicle.destination || null)
                    if (lastCompletedByVehicle.endMileage != null) {
                        setLastTripEndMileage(Number(lastCompletedByVehicle.endMileage))
                    }
                }

                let driverEndMileage = null
                const currentDriverId = vehicle?.currentDriverId
                if (currentDriverId) {
                    const lastCompletedByDriver = trips
                        .filter((t) => t?.endTime && t?.driverId === currentDriverId)
                        .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0]

                    if (lastCompletedByDriver?.endMileage != null) {
                        driverEndMileage = Number(lastCompletedByDriver.endMileage)
                        setMinStartMileage(driverEndMileage)
                    }
                }

                const suggestedOrigin = lastCompletedByVehicle?.destination || vehicle?.currentBranchName || undefined
                const suggestedMileageCandidates = [
                    lastCompletedByVehicle?.endMileage,
                    vehicle?.currentMileage,
                    driverEndMileage,
                ].filter((v) => v != null).map((v) => Number(v))
                const suggestedMileage = suggestedMileageCandidates.length
                    ? Math.max(...suggestedMileageCandidates)
                    : undefined

                const currentValues = form.getFieldsValue(["origin", "startMileage"])
                if (!currentValues.origin && suggestedOrigin) {
                    form.setFieldsValue({ origin: suggestedOrigin })
                }
                if (!currentValues.startMileage && suggestedMileage != null) {
                    form.setFieldsValue({ startMileage: suggestedMileage })
                }
            } catch (error) {
                setMinStartMileage(null)
                setLastTripDestination(null)
                setLastTripEndMileage(null)
            } finally {
            }
        }

        loadHistory()
    }, [open, vehicle, form])

    const handleFinish = async (values) => {
        if (!vehicle?.vehicleId) return
        setLoading(true)
        try {
            const payload = {
                vehicleId: vehicle.vehicleId,
                driverId: values.driverId,
                startMileage: values.startMileage,
                origin: values.origin,
                destination: values.destination,
                purpose: values.purpose || "",
                plannedDurationDays: values.plannedDays || 0,
                plannedDurationHours: values.plannedHours || 0,
                plannedDurationMinutes: values.plannedMinutes || 0,
            }

            await startTrip(payload)
            form.resetFields()
            onSuccess?.()
        } catch (error) {
            const message = error?.response?.data?.message || "Không thể bắt đầu chuyến."
            Modal.error({
                title: "Bắt đầu chuyến thất bại",
                content: message,
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText="Bắt đầu chuyến"
            cancelText="Hủy"
            confirmLoading={loading}
            okButtonProps={{ disabled: !vehicle?.vehicleId || driverOptions.length === 0 }}
            title="Tạo chuyến mới"
            destroyOnHidden
            forceRender
        >
            <div style={{ marginBottom: 16 }}>
                <Text strong>{vehicle?.licensePlate || "Xe chưa chọn"}</Text>
                <div style={{ color: "#64748b", fontSize: 12 }}>
                    {vehicle?.currentBranchName || "Chưa có chi nhánh"} · {vehicle?.status || "Chưa có trạng thái"}
                </div>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{
                    driverId: vehicle?.currentDriverId || undefined,
                }}
            >
                <Form.Item
                    label="Tài xế"
                    name="driverId"
                    rules={[{ required: true, message: "Vui lòng chọn tài xế" }]}
                >
                    <Select
                        placeholder={driverOptions.length ? "Chọn tài xế" : "Xe chưa có tài xế"}
                        options={driverOptions}
                        disabled={driverOptions.length === 0}
                        showSearch
                        optionFilterProp="label"
                    />
                </Form.Item>

                <Form.Item
                    label="Số km bắt đầu"
                    name="startMileage"
                    rules={[
                        { required: true, message: "Vui lòng nhập số km bắt đầu" },
                        () => ({
                            validator(_, value) {
                                if (value == null || value === "") return Promise.resolve()
                                if (minStartMileage != null && Number(value) < minStartMileage) {
                                    return Promise.reject(new Error("Số km bắt đầu phải lớn hơn hoặc bằng km kết thúc chuyến trước của tài xế"))
                                }
                                return Promise.resolve()
                            },
                        }),
                    ]}
                    extra={
                        minStartMileage != null || vehicle?.currentMileage != null || lastTripEndMileage != null
                            ? `Gợi ý: Km tối thiểu (theo tài xế) ${minStartMileage ?? "--"} · Km xe hiện tại ${vehicle?.currentMileage ?? "--"} · Km cuối chuyến gần nhất ${lastTripEndMileage ?? "--"}`
                            : undefined
                    }
                >
                    <InputNumber min={1} style={{ width: "100%" }} placeholder="Nhập số km" />
                </Form.Item>

                <Form.Item
                    label="Điểm đi"
                    name="origin"
                    rules={[{ required: true, message: "Vui lòng nhập điểm đi" }]}
                    extra={
                        lastTripDestination || vehicle?.currentBranchName
                            ? `Gợi ý: ${lastTripDestination ?? vehicle?.currentBranchName}`
                            : undefined
                    }
                >
                    <Input placeholder="Ví dụ: Hà Nội" />
                </Form.Item>

                <Form.Item
                    label="Điểm đến"
                    name="destination"
                    rules={[{ required: true, message: "Vui lòng nhập điểm đến" }]}
                >
                    <Input placeholder="Ví dụ: Hồ Chí Minh" />
                </Form.Item>

                <Form.Item label="Mục đích" name="purpose">
                    <Input placeholder="Tuỳ chọn" />
                </Form.Item>

                <Form.Item
                    label="Thời lượng dự kiến"
                    required
                    rules={[
                        () => ({
                            validator() {
                                const values = form.getFieldsValue(["plannedDays", "plannedHours", "plannedMinutes"])
                                const total =
                                    (Number(values.plannedDays) || 0) * 24 * 60 +
                                    (Number(values.plannedHours) || 0) * 60 +
                                    (Number(values.plannedMinutes) || 0)
                                if (total <= 0) {
                                    return Promise.reject(new Error("Vui lòng nhập thời lượng dự kiến"))
                                }
                                return Promise.resolve()
                            },
                        }),
                    ]}
                >
                    <div style={{ display: "flex", gap: 8 }}>
                        <Form.Item name="plannedDays" noStyle>
                            <InputNumber min={0} style={{ width: "33%" }} placeholder="Ngày" />
                        </Form.Item>
                        <Form.Item name="plannedHours" noStyle>
                            <InputNumber min={0} max={23} style={{ width: "33%" }} placeholder="Giờ" />
                        </Form.Item>
                        <Form.Item name="plannedMinutes" noStyle>
                            <InputNumber min={0} max={59} style={{ width: "33%" }} placeholder="Phút" />
                        </Form.Item>
                    </div>
                </Form.Item>
            </Form>
        </Modal>
    )
}
