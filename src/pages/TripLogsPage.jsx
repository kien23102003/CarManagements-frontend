import { useEffect, useState } from "react"
import { Badge, Button, Empty, Select, Space, Spin, Table, Tabs, Tag, Typography } from "antd"
import toast from "react-hot-toast"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"
import StartTripModal from "../components/StartTripModal"
import EndTripModal from "../components/EndTripModal"
import { getManageVehicles, getTripHistoryByVehicle } from "../services/tripLogService"
import "../styles/tripLogs.css"

const { Title, Text } = Typography

dayjs.extend(utc)
dayjs.extend(timezone)

const VN_TZ = "Asia/Ho_Chi_Minh"
const NEAR_THRESHOLD_MINUTES = 30

const parseTripTime = (value) => {
    if (!value) return null
    const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(String(value))
    const parsed = hasTimezone ? dayjs.utc(value) : dayjs.tz(value, VN_TZ)
    return parsed.isValid() ? parsed : null
}

const formatDateTime = (value) => {
    const parsed = parseTripTime(value)
    if (!parsed) return "--"
    return parsed.tz(VN_TZ).format("HH:mm DD/MM/YYYY")
}

const formatDuration = (start, now) => {
    if (!start) return "--"
    const startTime = parseTripTime(start)
    if (!startTime) return "--"
    const reference = now || dayjs().tz(VN_TZ)
    const diffMinutes = reference.diff(startTime.tz(VN_TZ), "minute")
    if (diffMinutes <= 0) return "0 phút"
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    if (hours === 0) return `${minutes} phút`
    return `${hours} giờ ${minutes} phút`
}

const formatMinutesLabel = (minutes) => {
    const abs = Math.abs(minutes)
    const hours = Math.floor(abs / 60)
    const mins = abs % 60
    if (hours > 0) return `${hours} giờ ${mins} phút`
    return `${mins} phút`
}

const toNumber = (value) => {
    const num = Number(value)
    return Number.isFinite(num) ? num : null
}

const getPlannedMinutes = (record) => {
    if (!record) return null
    const days = toNumber(
        record.currentTripPlannedDurationDays ??
        record.plannedDurationDays ??
        record.plannedDays
    )
    const hours = toNumber(
        record.currentTripPlannedDurationHours ??
        record.plannedDurationHours ??
        record.plannedHours
    )
    const minutes = toNumber(
        record.currentTripPlannedDurationMinutes ??
        record.plannedDurationMinutes ??
        record.plannedMinutes
    )

    if (days != null || hours != null || minutes != null) {
        return (days || 0) * 24 * 60 + (hours || 0) * 60 + (minutes || 0)
    }

    const direct = toNumber(
        record.currentTripPlannedDuration ??
        record.plannedDuration ??
        record.currentTripPlannedMinutes ??
        record.plannedMinutes
    )
    if (direct != null) return direct

    return null
}

const getElapsedMinutes = (start, now) => {
    if (!start) return null
    const startTime = parseTripTime(start)
    if (!startTime) return null
    const reference = now || dayjs().tz(VN_TZ)
    const diff = reference.diff(startTime.tz(VN_TZ), "minute")
    return Math.max(0, diff)
}

const getRemainingMinutes = (record, now) => {
    if (!record?.currentTripId) return null
    const planned = getPlannedMinutes(record)
    const elapsed = getElapsedMinutes(record.currentTripStartTime, now)
    if (planned == null || elapsed == null) return record?.remainingMinutes ?? null
    return planned - elapsed
}

const getRemainingStatus = (remainingMinutes, plannedMinutes, fallbackStatus) => {
    if (remainingMinutes == null) return fallbackStatus || null
    if (remainingMinutes < 0) return "over"

    const threshold = plannedMinutes != null
        ? Math.min(NEAR_THRESHOLD_MINUTES, Math.ceil(plannedMinutes * 0.2))
        : NEAR_THRESHOLD_MINUTES

    if (remainingMinutes <= threshold) return "near"
    return "ok"
}

function TripLogsPage() {
    const [activeMainTab, setActiveMainTab] = useState("manage")
    const [manageTab, setManageTab] = useState("all")
    const [manageVehicles, setManageVehicles] = useState([])
    const [allVehicles, setAllVehicles] = useState([])
    const [manageLoading, setManageLoading] = useState(false)

    const [historyVehicleId, setHistoryVehicleId] = useState(null)
    const [historyData, setHistoryData] = useState(null)
    const [historyLoading, setHistoryLoading] = useState(false)

    const [startModalOpen, setStartModalOpen] = useState(false)
    const [endModalOpen, setEndModalOpen] = useState(false)
    const [selectedVehicle, setSelectedVehicle] = useState(null)
    const [selectedTrip, setSelectedTrip] = useState(null)
    const [selectedOverDuration, setSelectedOverDuration] = useState(false)
    const [selectedStartMileage, setSelectedStartMileage] = useState(null)
    const [selectedRemainingMinutes, setSelectedRemainingMinutes] = useState(null)

    const [now, setNow] = useState(() => dayjs().tz(VN_TZ))

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(dayjs().tz(VN_TZ))
        }, 30000)

        return () => clearInterval(timer)
    }, [])

    const loadManageVehicles = async (tabKey) => {
        setManageLoading(true)
        try {
            const res = await getManageVehicles(tabKey)
            const list = res?.data ?? res ?? []
            setManageVehicles(Array.isArray(list) ? list : [])
            if (tabKey === "all") {
                setAllVehicles(Array.isArray(list) ? list : [])
            }
        } catch (error) {
            console.error("Failed to load manage vehicles", error)
            toast.error("Không thể tải danh sách vận hành.")
            setManageVehicles([])
        } finally {
            setManageLoading(false)
        }
    }

    const loadTripHistory = async (vehicleId) => {
        if (!vehicleId) return
        setHistoryLoading(true)
        try {
            const res = await getTripHistoryByVehicle(vehicleId)
            const data = res?.data ?? res
            setHistoryData(data || null)
        } catch (error) {
            console.error("Failed to load trip history", error)
            toast.error("Không thể tải lịch sử chuyến.")
            setHistoryData(null)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        loadManageVehicles(manageTab)
    }, [manageTab])

    const handleViewHistory = (vehicle) => {
        const id = vehicle?.vehicleId
        if (!id) return
        setHistoryVehicleId(id)
        setActiveMainTab("history")
        loadTripHistory(id)
    }

    const handleStartTrip = (vehicle) => {
        setSelectedVehicle(vehicle)
        setStartModalOpen(true)
    }

    const handleEndTrip = (vehicle) => {
        const remainingMinutes = getRemainingMinutes(vehicle, now)
        setSelectedTrip(vehicle?.currentTripId)
        setSelectedOverDuration(remainingMinutes != null ? remainingMinutes < 0 : Boolean(vehicle?.isOverDuration))
        setSelectedStartMileage(vehicle?.currentTripStartMileage ?? null)
        setSelectedRemainingMinutes(remainingMinutes)
        setEndModalOpen(true)
    }

    const manageColumns = [
        {
            title: "Biển số",
            dataIndex: "licensePlate",
            key: "licensePlate",
            render: (_, record) => (
                <Button type="link" onClick={() => handleViewHistory(record)}>
                    {record.licensePlate || `Xe #${record.vehicleId}`}
                </Button>
            ),
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            render: (value, record) => {
                const normalized = String(value || "").toLowerCase()
                const isReady = normalized.includes("ready")
                const isMoving = normalized.includes("moving") || record.isMoving
                return (
                    <Tag color={isReady ? "green" : isMoving ? "blue" : "default"}>
                        {value || "Không rõ"}
                    </Tag>
                )
            },
        },
        {
            title: "Tài xế",
            dataIndex: "currentDriverName",
            key: "currentDriverName",
            render: (_, record) => record.currentDriverName || (record.currentDriverId ? `Tài xế #${record.currentDriverId}` : "--"),
        },
        {
            title: "Chi nhánh",
            dataIndex: "currentBranchName",
            key: "currentBranchName",
            render: (value) => value || "--",
        },
        {
            title: "Chuyến đang chạy",
            key: "currentTrip",
            render: (_, record) => (
                record.currentTripId ? (
                    <div>
                        <div>{record.currentTripOrigin || "--"} -{">"} {record.currentTripDestination || "--"}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Bắt đầu: {formatDateTime(record.currentTripStartTime)} · {formatDuration(record.currentTripStartTime, now)}
                        </Text>
                    </div>
                ) : "--"
            ),
        },
        {
            title: "Thời lượng dự kiến",
            key: "plannedDuration",
            render: (_, record) => {
                if (!record.currentTripId) return "--"
                const plannedMinutes = getPlannedMinutes(record)
                if (plannedMinutes == null) return "--"
                return formatMinutesLabel(plannedMinutes)
            },
        },
        {
            title: "Thời gian còn lại",
            key: "remainingTime",
            render: (_, record) => {
                if (!record.currentTripId) return "--"
                const plannedMinutes = getPlannedMinutes(record)
                const remainingMinutes = getRemainingMinutes(record, now)
                if (remainingMinutes == null) return "--"

                const label = formatMinutesLabel(remainingMinutes)
                const status = getRemainingStatus(remainingMinutes, plannedMinutes, record.remainingStatus)

                if (status === "over") return <Tag color="red">Quá thời gian: {label}</Tag>
                if (status === "near") return <Tag color="orange">Sắp xong: {label}</Tag>
                return <Tag color="green">Còn lâu: {label}</Tag>
            },
        },
        {
            title: "Trạng thái chuyến",
            key: "statusTime",
            render: (_, record) => {
                if (record.isMoving) {
                    return `Bắt đầu: ${formatDateTime(record.currentTripStartTime)}`
                }
                return record.lastTripEndTime ? `Dừng: ${formatDateTime(record.lastTripEndTime)}` : "--"
            },
        },
        {
            title: "Cảnh báo",
            key: "warning",
            render: (_, record) => {
                const remainingMinutes = getRemainingMinutes(record, now)
                const isOver = remainingMinutes != null ? remainingMinutes < 0 : Boolean(record.isOverDuration)
                return isOver ? <Badge color="red" text="Quá thời gian" /> : "--"
            },
        },
        {
            title: "Thao tác",
            key: "actions",
            render: (_, record) => (
                <Space>
                    {manageTab === "ready" && (
                        <Button type="primary" onClick={() => handleStartTrip(record)}>
                            Bắt đầu chuyến
                        </Button>
                    )}
                    {manageTab === "moving" && (
                        <Button danger onClick={() => handleEndTrip(record)}>
                            Kết thúc chuyến
                        </Button>
                    )}
                </Space>
            ),
        },
    ]

    const historyColumns = [
        {
            title: "Mã chuyến",
            dataIndex: "tripId",
            key: "tripId",
        },
        {
            title: "Tài xế",
            dataIndex: "driverName",
            key: "driverName",
            render: (value) => value || "--",
        },
        {
            title: "Bắt đầu",
            dataIndex: "startTime",
            key: "startTime",
            render: (value) => formatDateTime(value),
        },
        {
            title: "Kết thúc",
            dataIndex: "endTime",
            key: "endTime",
            render: (value) => value ? formatDateTime(value) : "Đang chạy",
        },
        {
            title: "Lộ trình",
            key: "route",
            render: (_, record) => `${record.origin || "--"} -> ${record.destination || "--"}`,
        },
        {
            title: "Số km",
            key: "mileage",
            render: (_, record) => `${record.startMileage ?? "--"} -> ${record.endMileage ?? "--"}`,
        },
        {
            title: "Mục đích",
            dataIndex: "purpose",
            key: "purpose",
            render: (value) => value || "--",
        },
        {
            title: "Ghi chú",
            key: "note",
            render: (_, record) => {
                const notes = []
                if (record.isStopDifferent) {
                    notes.push(`Dừng thực tế: ${record.actualStop || "--"} (${record.stopDeviationReason || "Không rõ lý do"})`)
                }
                if (record.overtimeReason) {
                    const ext = record.extensionMinutes ? ` +${record.extensionMinutes} phút` : ""
                    notes.push(`Quá thời gian: ${record.overtimeReason}${ext}`)
                }
                return notes.length ? notes.join(" · ") : "--"
            },
        },
    ]

    const historyTrips = historyData?.trips || []
    const vehiclesForSelect = allVehicles.length ? allVehicles : manageVehicles

    return (
        <div className="trip-module">
            <div className="trip-header">
                <div>
                    <Title level={3}>Quản lý vận hành chuyến đi</Title>
                    <Text type="secondary">Theo dõi trạng thái xe, vận hành và lịch sử chuyến đi.</Text>
                </div>
            </div>

            <Tabs
                activeKey={activeMainTab}
                onChange={setActiveMainTab}
                items={[
                    {
                        key: "manage",
                        label: "Quản lý vận hành",
                        children: (
                            <div className="trip-card">
                                <Tabs
                                    activeKey={manageTab}
                                    onChange={setManageTab}
                                    items={[
                                        { key: "all", label: "Tất cả" },
                                        { key: "ready", label: "Sẵn sàng" },
                                        { key: "moving", label: "Đang di chuyển" },
                                    ]}
                                />

                                <Table
                                    rowKey={(record) => record.vehicleId}
                                    columns={manageColumns}
                                    dataSource={manageVehicles}
                                    loading={manageLoading}
                                    locale={{ emptyText: manageLoading ? <Spin /> : <Empty description="Không có dữ liệu" /> }}
                                    pagination={{ pageSize: 10 }}
                                />
                            </div>
                        ),
                    },
                    {
                        key: "history",
                        label: "Lịch sử chuyến",
                        children: (
                            <div className="trip-card">
                                <div className="history-toolbar">
                                    <Select
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Chọn xe để xem lịch sử"
                                        value={historyVehicleId ?? undefined}
                                        onChange={(value) => {
                                            setHistoryVehicleId(value)
                                            loadTripHistory(value)
                                        }}
                                        options={vehiclesForSelect.map((vehicle) => ({
                                            label: vehicle.licensePlate || `Xe #${vehicle.vehicleId}`,
                                            value: vehicle.vehicleId,
                                        }))}
                                        style={{ minWidth: 240 }}
                                    />
                                </div>

                                {historyLoading ? (
                                    <div className="center-loading">
                                        <Spin />
                                    </div>
                                ) : !historyData ? (
                                    <Empty description="Chọn xe để xem lịch sử chuyến" />
                                ) : (
                                    <div className="history-panel">
                                        <div className="history-info">
                                            <div className="history-info-header">Thông tin xe</div>
                                            <div className="history-info-grid">
                                                <div className="history-info-row">
                                                    <div className="history-info-label">Biển số</div>
                                                    <div className="history-info-value">{historyData.licensePlate || `Xe #${historyData.vehicleId}`}</div>
                                                </div>
                                                <div className="history-info-row">
                                                    <div className="history-info-label">Trạng thái</div>
                                                    <div className="history-info-value">{historyData.status || "--"}</div>
                                                </div>
                                                <div className="history-info-row">
                                                    <div className="history-info-label">Chi nhánh</div>
                                                    <div className="history-info-value">{historyData.currentBranchName || "--"}</div>
                                                </div>
                                                <div className="history-info-row">
                                                    <div className="history-info-label">Tài xế</div>
                                                    <div className="history-info-value">{historyData.currentDriverName || "--"}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="history-table">
                                            <Table
                                                rowKey={(record) => record.tripId}
                                                columns={historyColumns}
                                                dataSource={historyTrips}
                                                locale={{ emptyText: <Empty description="Chưa có chuyến nào" /> }}
                                                pagination={{ pageSize: 8 }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ),
                    },
                ]}
            />

            <StartTripModal
                open={startModalOpen}
                vehicle={selectedVehicle}
                onCancel={() => setStartModalOpen(false)}
                onSuccess={() => {
                    setStartModalOpen(false)
                    loadManageVehicles(manageTab)
                    toast.success("Bắt đầu chuyến thành công.")
                }}
            />

            <EndTripModal
                open={endModalOpen}
                tripId={selectedTrip}
                isOverDuration={selectedOverDuration}
                startMileage={selectedStartMileage}
                remainingMinutes={selectedRemainingMinutes}
                onCancel={() => setEndModalOpen(false)}
                onSuccess={() => {
                    setEndModalOpen(false)
                    loadManageVehicles(manageTab)
                    toast.success("Kết thúc chuyến thành công.")
                }}
            />
        </div>
    )
}

export default TripLogsPage
