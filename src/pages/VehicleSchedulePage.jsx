import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Calendar,
  Card,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Spin,
  Drawer,
  Tabs,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import scheduleApi from "../api/scheduleApi";
import vehicleApi from "../api/vehicleApi";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../services/AuthContext";
import "../styles/vehicleSchedule.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  { label: "Planned", value: "Planned" },
  { label: "InProgress", value: "InProgress" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
};

const toLocalISOString = (value) => {
  if (!value) return null;
  return dayjs(value).format("YYYY-MM-DDTHH:mm:ss");
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const isEligibleVehicleForSchedule = (vehicle) => {
  const status = String(vehicle?.status || "").trim().toLowerCase();
  const hasDriver = vehicle?.currentDriverId === undefined
    ? true
    : Boolean(vehicle?.currentDriverId);
  const readyStatuses = ["assigned"];
  return hasDriver && readyStatuses.includes(status);
};

const getDisabledTime = (current) => {
  if (!current) return {};
  const now = dayjs();
  if (!current.isSame(now, "day")) return {};
  const currentHour = now.hour();
  const currentMinute = now.minute();
  return {
    disabledHours: () => Array.from({ length: currentHour }, (_, i) => i),
    disabledMinutes: (selectedHour) => {
      if (selectedHour !== currentHour) return [];
      return Array.from({ length: currentMinute + 1 }, (_, i) => i);
    },
  };
};

export default function VehicleSchedulePage() {
  const { user } = useAuth();
  const userRoles = user?.roles || [];
  const isExecutive = userRoles.some(
    (role) => role.toLowerCase() === "executive management",
  );
  const isOperator = userRoles.some(
    (role) => role.toLowerCase() === "operator",
  );
  const isManager = userRoles.some((role) => {
    const normalized = role.toLowerCase();
    return normalized === "manager" || normalized === "executive manager";
  });
  const isAccountant = userRoles.some(
    (role) => role.toLowerCase() === "branch asset accountant",
  );
  const isReadOnly = isExecutive || isAccountant || isManager;
  const canCreate = isOperator;
  const canReschedule = isOperator;
  const canExtend = isOperator;
  const canOperate = isOperator;

  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [filters, setFilters] = useState({
    range: [dayjs().startOf("day"), dayjs().add(7, "day").endOf("day")],
    modelId: undefined,
    status: undefined,
    vehicleId: undefined,
    driverId: undefined,
    seats: undefined,
    branchId: undefined,
  });
  const [activeTab, setActiveTab] = useState("list");

  const [models, setModels] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [findingVehicles, setFindingVehicles] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [findingDrivers, setFindingDrivers] = useState(false);

  const [extendOpen, setExtendOpen] = useState(false);
  const [extendForm] = Form.useForm();
  const [extendTarget, setExtendTarget] = useState(null);
  const [extendConflict, setExtendConflict] = useState(null);
  const [extendAvailable, setExtendAvailable] = useState([]);
  const [extendAvailableDrivers, setExtendAvailableDrivers] = useState([]);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleForm] = Form.useForm();
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleVehicles, setRescheduleVehicles] = useState([]);
  const [rescheduleDrivers, setRescheduleDrivers] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditItems, setAuditItems] = useState([]);
  const [auditTarget, setAuditTarget] = useState(null);

  const loadDropdowns = async () => {
    try {
      const [modelRes, driverRes, vehicleRes, branchRes] = await Promise.all([
        axiosClient.get("/assets/vehicles/models"),
        axiosClient.get("/assets/vehicles/drivers"),
        vehicleApi.getList(),
        axiosClient.get("/assets/vehicles/branches"),
      ]);
      setModels(modelRes.data || []);
      setDrivers(driverRes.data || []);
      setVehicles((vehicleRes.data || []).filter(isEligibleVehicleForSchedule));
      setBranches(branchRes.data || []);
    } catch (error) {
      console.error("Failed to load dropdowns", error);
    }
  };

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const params = {
        from: toLocalISOString(filters.range?.[0]),
        to: toLocalISOString(filters.range?.[1]),
        modelId: filters.modelId,
        status: filters.status,
        vehicleId: filters.vehicleId,
        driverId: filters.driverId,
        seats: filters.seats,
        branchId: isExecutive ? filters.branchId : undefined,
      };
      const res = await scheduleApi.getSchedules(params);
      setSchedules(res.data || []);
    } catch (error) {
      console.error("Failed to load schedules", error);
      toast.error("Không thể tải lịch xe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    if (!isExecutive) return;
    if (!branches.length) return;
    const preferred = user?.branchId || branches[0]?.id;
    if (preferred && selectedBranchId !== preferred) {
      setSelectedBranchId(preferred);
      setFilters((prev) => ({ ...prev, branchId: preferred }));
    }
  }, [isExecutive, branches, user, selectedBranchId]);

  useEffect(() => {
    if (!isExecutive) return;
    if (!selectedBranchId) return;
    createForm.setFieldsValue({ branchId: selectedBranchId });
  }, [isExecutive, selectedBranchId, createForm]);

  useEffect(() => {
    loadSchedules();
  }, [filters]);

  const currentBranchName = useMemo(() => {
    if (!branches.length) return "Chi nhánh hiện tại";
    const match = branches.find((b) => b.id === user?.branchId);
    return match?.name || "Chi nhánh hiện tại";
  }, [branches, user]);

  const isBranchNameMatch = (value) =>
    normalizeText(value) && normalizeText(value) === normalizeText(currentBranchName);

  const handleFindVehicles = async () => {
    if (isExecutive && !selectedBranchId) {
      toast.error("Vui lòng chọn chi nhánh trước khi tìm xe trống.");
      return;
    }
    const fields = ["plannedRange", "modelId"];
    if (isExecutive) fields.push("branchId");
    const formValues = await createForm.validateFields(fields);
    const range = formValues.plannedRange;
    if (!range || range.length !== 2) return;

    setFindingVehicles(true);
    try {
      const res = await scheduleApi.getAvailability({
        start: toLocalISOString(range[0]),
        end: toLocalISOString(range[1]),
        modelId: formValues.modelId,
        branchId: isExecutive ? (formValues.branchId || selectedBranchId) : undefined,
      });
      setAvailableVehicles((res.data || []).filter(isEligibleVehicleForSchedule));
    } catch (error) {
      console.error("Failed to load availability", error);
      toast.error("Không thể tải xe trống.");
      setAvailableVehicles([]);
    } finally {
      setFindingVehicles(false);
    }
  };

  const handleFindDrivers = async () => {
    if (isExecutive && !selectedBranchId) {
      toast.error("Vui lòng chọn chi nhánh trước khi tìm tài xế trống.");
      return;
    }
    const fields = ["plannedRange"];
    if (isExecutive) fields.push("branchId");
    const formValues = await createForm.validateFields(fields);
    const range = formValues.plannedRange;
    if (!range || range.length !== 2) return;

    setFindingDrivers(true);
    try {
      const res = await scheduleApi.getDriverAvailability({
        start: toLocalISOString(range[0]),
        end: toLocalISOString(range[1]),
        branchId: isExecutive ? (formValues.branchId || selectedBranchId) : undefined,
      });
      setAvailableDrivers(res.data || []);
    } catch (error) {
      console.error("Failed to load driver availability", error);
      toast.error("Không thể tải tài xế trống.");
      setAvailableDrivers([]);
    } finally {
      setFindingDrivers(false);
    }
  };

  const handleCreateSchedule = async () => {
    const values = await createForm.validateFields();
    if (isExecutive && !(values.branchId || selectedBranchId)) {
      toast.error("Vui lòng chọn chi nhánh trước khi tạo lịch.");
      return;
    }
    const [start, end] = values.plannedRange;
    const now = dayjs();
    if (start.isBefore(now) || start.isSame(now)) {
      toast.error("Thời gian bắt đầu phải lớn hơn thời gian hiện tại.");
      return;
    }
    if (isBranchNameMatch(values.pickup)) {
      toast.error("Điểm đón khách không được trùng tên chi nhánh.");
      return;
    }
    if (isBranchNameMatch(values.dropoff)) {
      toast.error("Điểm trả khách không được trùng tên chi nhánh.");
      return;
    }
    const origin = String(values.pickup || "").trim();
    const destination = String(values.dropoff || "").trim();
    if (!origin || !destination) {
      toast.error("Vui lòng nhập điểm đón khách và điểm trả khách.");
      return;
    }
    const payload = {
      vehicleId: values.vehicleId,
      driverId: values.driverId,
      plannedStartTime: toLocalISOString(start),
      plannedEndTime: toLocalISOString(end),
      origin,
      destination,
      branchId: isExecutive ? values.branchId || selectedBranchId : undefined,
    };
    try {
      await scheduleApi.createSchedule(payload);
      toast.success("Tạo lịch thành công.");
      setCreateOpen(false);
      createForm.resetFields();
      setAvailableVehicles([]);
      setAvailableDrivers([]);
      loadSchedules();
    } catch (error) {
      console.error("Create schedule failed", error);
      toast.error(error.response?.data?.message || "Tạo lịch thất bại.");
    }
  };

  const openExtendModal = (record) => {
    setExtendTarget(record);
    setExtendConflict(null);
    setExtendAvailable([]);
    setExtendAvailableDrivers([]);
    extendForm.resetFields();
    setExtendOpen(true);
  };

  const handleExtendSchedule = async () => {
    const values = await extendForm.validateFields();
    if (!extendTarget) return;

    try {
      const payload = {
        extensionMinutes: values.extensionMinutes,
        extensionReason: values.extensionReason,
        allowSwap: Boolean(values.allowSwap),
        swapVehicleId: values.swapVehicleId,
        allowDriverSwap: Boolean(values.allowDriverSwap),
        swapDriverId: values.swapDriverId,
      };
      const res = await scheduleApi.extendSchedule(extendTarget.id, payload);
      if (res.data?.extended) {
        toast.success("Gia hạn thành công.");
        setExtendOpen(false);
        loadSchedules();
      }
    } catch (error) {
      if (error.response?.status === 409) {
        const data = error.response.data;
        setExtendConflict(data?.conflict || null);
        setExtendAvailable(data?.availableVehicles || []);
        setExtendAvailableDrivers(data?.availableDrivers || []);
        if (data?.conflict) {
          toast.error("Bị trùng lịch. Hệ thống đã gợi ý xe thay thế.");
        } else {
          toast.error("Tài xế bị trùng lịch. Hệ thống đã gợi ý tài xế thay thế.");
        }
        return;
      }
      toast.error(error.response?.data?.message || "Gia hạn thất bại.");
    }
  };

  const handleStartSchedule = async (record) => {
    Modal.confirm({
      title: "Xác nhận bắt đầu chuyến",
      content: "Bạn có chắc muốn bắt đầu chuyến này không?",
      okText: "Đồng ý",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await scheduleApi.startSchedule(record.id, {});
          toast.success("Bắt đầu chuyến thành công.");
          loadSchedules();
        } catch (error) {
          toast.error(error.response?.data?.message || "Không thể bắt đầu chuyến.");
        }
      },
    });
  };

  const handleEndSchedule = async (record) => {
    Modal.confirm({
      title: "Xác nhận kết thúc chuyến",
      content: "Bạn có chắc muốn kết thúc chuyến này không?",
      okText: "Đồng ý",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await scheduleApi.endSchedule(record.id, {});
          toast.success("Kết thúc chuyến thành công.");
          loadSchedules();
        } catch (error) {
          toast.error(error.response?.data?.message || "Không thể kết thúc chuyến.");
        }
      },
    });
  };

  const openReschedule = async (record, targetDate) => {
    const duration = dayjs(record.plannedEndTime).diff(dayjs(record.plannedStartTime), "minute");
    const start = targetDate
      ? dayjs(targetDate).hour(dayjs(record.plannedStartTime).hour()).minute(dayjs(record.plannedStartTime).minute())
      : dayjs(record.plannedStartTime);
    const end = start.add(duration, "minute");

    setRescheduleTarget(record);
    rescheduleForm.setFieldsValue({
      plannedRange: [start, end],
      vehicleId: record.vehicleId,
      driverId: record.driverId,
    });
    setRescheduleOpen(true);
    await loadRescheduleOptions(start, end, record.vehicleModelId, record.branchId);
  };

  const loadRescheduleOptions = async (start, end, modelId, branchIdOverride) => {
    setRescheduleLoading(true);
    try {
      const [vehicleRes, driverRes] = await Promise.all([
        scheduleApi.getAvailability({
          start: toLocalISOString(start),
          end: toLocalISOString(end),
          modelId,
          branchId: isExecutive ? branchIdOverride : undefined,
        }),
        scheduleApi.getDriverAvailability({
          start: toLocalISOString(start),
          end: toLocalISOString(end),
          branchId: isExecutive ? branchIdOverride : undefined,
        }),
      ]);
      setRescheduleVehicles((vehicleRes.data || []).filter(isEligibleVehicleForSchedule));
      setRescheduleDrivers(driverRes.data || []);
    } catch (error) {
      console.error("Failed to load reschedule availability", error);
      setRescheduleVehicles([]);
      setRescheduleDrivers([]);
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleReschedule = async () => {
    const values = await rescheduleForm.validateFields();
    if (!rescheduleTarget) return;
    const [start, end] = values.plannedRange;
    const now = dayjs();
    if (start.isBefore(now) || start.isSame(now)) {
      toast.error("Thời gian bắt đầu phải lớn hơn thời gian hiện tại.");
      return;
    }
    try {
      await scheduleApi.updateSchedule(rescheduleTarget.id, {
        plannedStartTime: toLocalISOString(start),
        plannedEndTime: toLocalISOString(end),
        vehicleId: values.vehicleId,
        driverId: values.driverId,
      });
      toast.success("Đã cập nhật lịch thành công.");
      setRescheduleOpen(false);
      loadSchedules();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật lịch.");
    }
  };

  const openAudit = async (record) => {
    setAuditTarget(record);
    setAuditOpen(true);
    setAuditLoading(true);
    try {
      const res = await scheduleApi.getAuditsBySchedule(record.id);
      setAuditItems(res.data || []);
    } catch (error) {
      console.error("Failed to load audits", error);
      setAuditItems([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const scheduleColumns = useMemo(() => [
    {
      title: "Xe",
      dataIndex: "vehicleLicensePlate",
      key: "vehicleLicensePlate",
      render: (value, record) => (
        <div className="schedule-vehicle">
          <div className="schedule-vehicle-title">{value || `Xe #${record.vehicleId}`}</div>
          <div className="schedule-vehicle-sub">
            {record.vehicleManufacturer || "--"} {record.vehicleModelName || ""}
          </div>
        </div>
      ),
    },
    {
      title: "Tài xế",
      dataIndex: "driverName",
      key: "driverName",
      render: (value) => value || "--",
    },
    {
      title: "Thời gian",
      key: "time",
      render: (_, record) => (
        <div className="schedule-time">
          <div>{formatDateTime(record.plannedStartTime)}</div>
          <div>{formatDateTime(record.plannedEndTime)}</div>
        </div>
      ),
    },
    {
      title: "Lộ trình",
      key: "route",
      render: (_, record) => (
        <span>
          {(record.branchName || (!isExecutive ? currentBranchName : "Chi nhánh"))} → {record.origin || "--"} → {record.destination || "--"} → {(record.branchName || (!isExecutive ? currentBranchName : "Chi nhánh"))}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (value) => {
        const color = value === "Completed" ? "green" : value === "InProgress" ? "blue" : value === "Cancelled" ? "red" : "gold";
        return <Tag color={color}>{value}</Tag>;
      },
    },
    {
      title: "Gia hạn",
      key: "extension",
      render: (_, record) => (
        <div>
          <div>{record.extensionMinutes ? `${record.extensionMinutes} phút` : "--"}</div>
          <Text type="secondary">{record.extensionReason || ""}</Text>
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_, record) => (
        <div className="schedule-actions">
          {!isReadOnly && canOperate && record.status === "InProgress" && (
            <Button danger onClick={() => handleEndSchedule(record)}>
              Kết thúc
            </Button>
          )}
          {!isReadOnly && canReschedule && record.status === "Planned" && (
            <Button onClick={() => openReschedule(record)}>Đổi lịch</Button>
          )}
          {!isReadOnly && canExtend && (record.status === "Planned" || record.status === "InProgress") && (
            <Button onClick={() => openExtendModal(record)}>Gia hạn</Button>
          )}
          <Button type="link" onClick={() => openAudit(record)}>Nhật ký</Button>
        </div>
      ),
    },
  ], [isReadOnly, canOperate, canReschedule, canExtend, currentBranchName, isExecutive]);

  const scheduleByDate = useMemo(() => {
    const map = new Map();
    schedules.forEach((item) => {
      const key = dayjs(item.plannedStartTime).format("YYYY-MM-DD");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  }, [schedules]);

  const renderDateCell = (value) => {
    const key = value.format("YYYY-MM-DD");
    const items = scheduleByDate.get(key) || [];
    return (
        <div
          className="schedule-calendar-cell"
          onDragOver={(event) => {
            if (!isReadOnly && canReschedule) event.preventDefault();
          }}
          onDrop={(event) => {
            if (isReadOnly || !canReschedule) return;
            event.preventDefault();
            const scheduleId = event.dataTransfer.getData("text/plain");
            const target = schedules.find((s) => String(s.id) === String(scheduleId));
            if (target) {
              openReschedule(target, value);
            }
          }}
        >
          {items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="schedule-calendar-item"
              draggable={!isReadOnly && canReschedule}
              onDragStart={(event) => {
                if (!isReadOnly && canReschedule) event.dataTransfer.setData("text/plain", item.id);
              }}
            >
            <span className={`schedule-dot status-${item.status?.toLowerCase() || "planned"}`} />
            <span>{item.vehicleLicensePlate || `Xe #${item.vehicleId}`}</span>
          </div>
        ))}
        {items.length > 3 && (
          <div className="schedule-calendar-more">+{items.length - 3} chuyến</div>
        )}
      </div>
    );
  };

  return (
    <div className="schedule-page">
      <div className="schedule-hero">
        <div className="schedule-hero-content">
          <Badge.Ribbon text="Lịch xe theo chi nhánh" color="#0f172a">
            <div className="schedule-hero-card">
              <Title level={3}>Lịch Hoạt Động Xe</Title>
              <Text>
                Thiết kế lịch chạy theo ngày, tối ưu phân xe và tài xế,
                kiểm soát gia hạn và tránh xung đột.
              </Text>
            </div>
          </Badge.Ribbon>
        </div>
        <div className="schedule-hero-art" />
      </div>

      <div className="schedule-grid">
        <Card className="schedule-card" bordered={false}>
          <div className="schedule-card-header">
            <div>
              <Title level={4}>Bộ lọc chỉ số</Title>
              <Text type="secondary">Lọc theo thời gian, loại xe, tài xế và trạng thái.</Text>
            </div>
            {!isReadOnly && canCreate && (
              <Button type="primary" size="large" onClick={() => setCreateOpen(true)}>
                Tạo lịch mới
              </Button>
            )}
          </div>

          <div className="schedule-filters">
            {isExecutive && (
              <div className="schedule-filter">
                <label>Chi nhánh</label>
                <Select
                  allowClear
                  placeholder="Chọn chi nhánh"
                  value={filters.branchId}
                  onChange={(value) => {
                    setSelectedBranchId(value || null);
                    setFilters((prev) => ({ ...prev, branchId: value }));
                  }}
                  options={branches.map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                  }))}
                />
              </div>
            )}
            <div className="schedule-filter">
              <label>Khoảng thời gian</label>
              <RangePicker
                value={filters.range}
                onChange={(range) => setFilters((prev) => ({ ...prev, range }))}
                showTime
                format="DD/MM/YYYY HH:mm"
                disabledDate={(current) => current && current < dayjs().startOf("day")}
                disabledTime={getDisabledTime}
              />
            </div>
            <div className="schedule-filter">
              <label>Loại xe</label>
              <Select
                allowClear
                placeholder="Chọn loại xe"
                value={filters.modelId}
                onChange={(value) => setFilters((prev) => ({ ...prev, modelId: value }))}
                options={models.map((model) => ({
                  value: model.id,
                  label: `${model.manufacturer || ""} ${model.modelName || ""}`.trim(),
                }))}
              />
            </div>
            <div className="schedule-filter">
              <label>Trạng thái</label>
              <Select
                allowClear
                placeholder="Trạng thái"
                value={filters.status}
                onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                options={STATUS_OPTIONS}
              />
            </div>
            <div className="schedule-filter">
              <label>Tài xế</label>
              <Select
                allowClear
                showSearch
                placeholder="Chọn tài xế"
                value={filters.driverId}
                onChange={(value) => setFilters((prev) => ({ ...prev, driverId: value }))}
                options={drivers.map((driver) => ({
                  value: driver.id,
                  label: driver.name,
                }))}
              />
            </div>
            <div className="schedule-filter">
              <label>Xe</label>
              <Select
                allowClear
                showSearch
                placeholder="Chọn xe"
                value={filters.vehicleId}
                onChange={(value) => setFilters((prev) => ({ ...prev, vehicleId: value }))}
                options={vehicles.map((vehicle) => ({
                  value: vehicle.id,
                  label: vehicle.licensePlate || `Xe #${vehicle.id}`,
                }))}
              />
            </div>
            <div className="schedule-filter">
              <label>Số ghế ngồi</label>
              <Select
                allowClear
                placeholder="Chọn số ghế"
                value={filters.seats}
                onChange={(value) => setFilters((prev) => ({ ...prev, seats: value }))}
                options={Array.from(new Set(models.map((m) => m.seats).filter(Boolean)))
                  .sort((a, b) => a - b)
                  .map((seats) => ({ value: seats, label: `${seats} ghế` }))}
              />
            </div>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "list",
                label: "Danh sách",
                children: (
                  <div className="schedule-table">
                    {loading ? (
                      <div className="schedule-loading"><Spin /></div>
                    ) : (
                      <Table
                        rowKey={(record) => record.id}
                        columns={scheduleColumns}
                        dataSource={schedules}
                        pagination={{ pageSize: 8 }}
                      />
                    )}
                  </div>
                ),
              },
              {
                key: "calendar",
                label: "Lịch",
                children: (
                  <div className="schedule-calendar">
                    <Calendar dateCellRender={renderDateCell} fullscreen={false} />
                  </div>
                ),
              },
            ]}
          />
        </Card>

        <Card className="schedule-card schedule-insight" bordered={false}>
          <Title level={4}>Tóm tắt nhanh</Title>
          <div className="schedule-insight-grid">
            <div className="schedule-insight-item">
              <span>Tổng lịch</span>
              <strong>{schedules.length}</strong>
            </div>
            <div className="schedule-insight-item">
              <span>Đang chạy</span>
              <strong>{schedules.filter((s) => s.status === "InProgress").length}</strong>
            </div>
            <div className="schedule-insight-item">
              <span>Đến lịch</span>
              <strong>{schedules.filter((s) => s.status === "Planned").length}</strong>
            </div>
            <div className="schedule-insight-item">
              <span>Hoàn tất</span>
              <strong>{schedules.filter((s) => s.status === "Completed").length}</strong>
            </div>
          </div>
        </Card>
      </div>

      {!isReadOnly && canCreate && (
      <Modal
        title="Tạo lịch hoạt động"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreateSchedule}
        okText="Tạo lịch"
        width={800}
      >
        <Form form={createForm} layout="vertical" className="schedule-form">
          <div className="schedule-form-grid">
            <Form.Item
              name="plannedRange"
              label="Khoảng thời gian"
              rules={[{ required: true, message: "Chọn khoảng thời gian" }]}
            >
              <RangePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                disabledDate={(current) => current && current < dayjs().startOf("day")}
                disabledTime={getDisabledTime}
              />
            </Form.Item>

            {isExecutive && (
              <Form.Item
                name="branchId"
                label="Chi nhánh"
                initialValue={selectedBranchId}
                rules={[{ required: true, message: "Chọn chi nhánh" }]}
              >
                <Select
                  placeholder="Chọn chi nhánh"
                  onChange={(value) => {
                    setSelectedBranchId(value);
                    setFilters((prev) => ({ ...prev, branchId: value }));
                  }}
                  options={branches.map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item name="modelId" label="Loại xe">
              <Select
                allowClear
                placeholder="Chọn loại xe"
                options={models.map((model) => ({
                  value: model.id,
                  label: `${model.manufacturer || ""} ${model.modelName || ""}`.trim(),
                }))}
              />
            </Form.Item>
          </div>

          <Button
            type="dashed"
            onClick={handleFindVehicles}
            loading={findingVehicles}
            className="schedule-find-btn"
          >
            Tìm xe trống theo loại và thời gian
          </Button>
          <Button
            type="dashed"
            onClick={handleFindDrivers}
            loading={findingDrivers}
            className="schedule-find-btn"
          >
            Tìm tài xế trống theo thời gian
          </Button>

          <div className="schedule-form-grid">
            <Form.Item
              name="vehicleId"
              label="Xe phụ hợp"
              rules={[{ required: true, message: "Chọn xe" }]}
            >
              <Select
                showSearch
                placeholder="Chọn xe"
                options={availableVehicles.map((vehicle) => ({
                  value: vehicle.vehicleId,
                  label: `${vehicle.licensePlate || `Xe #${vehicle.vehicleId}`} • ${vehicle.manufacturer || ""} ${vehicle.modelName || ""}`.trim(),
                }))}
              />
            </Form.Item>

            <Form.Item
              name="driverId"
              label="Tài xế"
              rules={[{ required: true, message: "Chọn tài xế" }]}
            >
              <Select
                showSearch
                placeholder="Chọn tài xế"
                options={(availableDrivers.length ? availableDrivers : drivers).map((driver) => ({
                  value: driver.driverId ?? driver.id,
                  label: driver.driverName ?? driver.name,
                }))}
              />
            </Form.Item>
          </div>

          <div className="schedule-form-grid">
            <Form.Item
              name="pickup"
              label="Điểm đón khách"
              rules={[{ required: true, message: "Nhập điểm đón khách" }]}
            >
              <Input placeholder="Nhập điểm đón khách" />
            </Form.Item>

            <Form.Item
              name="dropoff"
              label="Điểm trả khách"
              rules={[{ required: true, message: "Nhập điểm trả khách" }]}
            >
              <Input placeholder="Nhập điểm trả khách" />
            </Form.Item>
          </div>

        </Form>
      </Modal>
      )}

      {!isReadOnly && canExtend && (
      <Modal
        title="Gia hạn chuyến"
        open={extendOpen}
        onCancel={() => setExtendOpen(false)}
        onOk={handleExtendSchedule}
        okText="Xác nhận"
      >
        {extendTarget && (
          <div className="schedule-extend-summary">
            <div>
              <strong>{extendTarget.vehicleLicensePlate || `Xe #${extendTarget.vehicleId}`}</strong>
              <span>{extendTarget.driverName || "--"}</span>
            </div>
            <Text type="secondary">
              {formatDateTime(extendTarget.plannedStartTime)} → {formatDateTime(extendTarget.plannedEndTime)}
            </Text>
          </div>
        )}

        <Form form={extendForm} layout="vertical">
          <Form.Item
            name="extensionMinutes"
            label="Gia hạn (phút)"
            rules={[{ required: true, message: "Nhập số phút gia hạn" }]}
          >
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item name="extensionReason" label="Lý do">
            <Input.TextArea rows={3} placeholder="Lý do gia hạn" />
          </Form.Item>
          <Form.Item
            name="allowSwap"
            label="Cho phép đổi xe nếu bị trùng"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="allowDriverSwap"
            label="Cho phép đổi tài xế nếu bị trùng"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          {extendConflict && (
            <Card className="schedule-conflict" bordered={false}>
              <Text strong>Trùng lịch với chuyến:</Text>
              <div>
                {extendConflict.vehicleLicensePlate || `Xe #${extendConflict.vehicleId}`} •
                {formatDateTime(extendConflict.plannedStartTime)}
              </div>
              <Form.Item name="swapVehicleId" label="Chọn xe thay thế">
                <Select
                  placeholder="Chọn xe thay thế"
                  options={extendAvailable.map((vehicle) => ({
                    value: vehicle.vehicleId,
                    label: `${vehicle.licensePlate || `Xe #${vehicle.vehicleId}`} • ${vehicle.manufacturer || ""} ${vehicle.modelName || ""}`.trim(),
                  }))}
                />
              </Form.Item>
            </Card>
          )}

          {extendAvailableDrivers.length > 0 && (
            <Card className="schedule-conflict" bordered={false}>
              <Text strong>Tài xế trống để đổi:</Text>
              <Form.Item name="swapDriverId" label="Chọn tài xế">
                <Select
                  placeholder="Chọn tài xế"
                  options={extendAvailableDrivers.map((driver) => ({
                    value: driver.driverId,
                    label: `${driver.driverName || ""} • ${driver.phone || ""}`.trim(),
                  }))}
                />
              </Form.Item>
            </Card>
          )}
        </Form>
      </Modal>
      )}
      {!isReadOnly && canReschedule && (
      <Modal
        title="Đổi lịch chuyến"
        open={rescheduleOpen}
        onCancel={() => setRescheduleOpen(false)}
        onOk={handleReschedule}
        okText="Cập nhật"
        width={760}
      >
        {rescheduleTarget && (
          <div className="schedule-extend-summary">
            <div>
              <strong>{rescheduleTarget.vehicleLicensePlate || `Xe #${rescheduleTarget.vehicleId}`}</strong>
              <span>{rescheduleTarget.driverName || "--"}</span>
            </div>
            <Text type="secondary">
              {formatDateTime(rescheduleTarget.plannedStartTime)} → {formatDateTime(rescheduleTarget.plannedEndTime)}
            </Text>
          </div>
        )}

        <Form form={rescheduleForm} layout="vertical">
          <Form.Item
            name="plannedRange"
            label="Khoảng thời gian mới"
            rules={[{ required: true, message: "Chọn khoảng thời gian" }]}
          >
            <RangePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              disabledDate={(current) => current && current < dayjs().startOf("day")}
              disabledTime={getDisabledTime}
              onChange={(range) => {
                if (range?.length === 2 && rescheduleTarget) {
                  loadRescheduleOptions(range[0], range[1], rescheduleTarget.vehicleModelId, rescheduleTarget.branchId);
                }
              }}
            />
          </Form.Item>

          <div className="schedule-form-grid">
            <Form.Item
              name="vehicleId"
              label="Xe thay thế"
              rules={[{ required: true, message: "Chọn xe" }]}
            >
              <Select
                showSearch
                placeholder="Chọn xe"
                loading={rescheduleLoading}
                options={rescheduleVehicles.map((vehicle) => ({
                  value: vehicle.vehicleId,
                  label: `${vehicle.licensePlate || `Xe #${vehicle.vehicleId}`} • ${vehicle.manufacturer || ""} ${vehicle.modelName || ""}`.trim(),
                }))}
              />
            </Form.Item>

            <Form.Item
              name="driverId"
              label="Tài xế"
              rules={[{ required: true, message: "Chọn tài xế" }]}
            >
              <Select
                showSearch
                placeholder="Chọn tài xế"
                loading={rescheduleLoading}
                options={rescheduleDrivers.map((driver) => ({
                  value: driver.driverId,
                  label: `${driver.driverName || ""} • ${driver.phone || ""}`.trim(),
                }))}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
      )}

      <Drawer
        title="Nhật ký lịch xe"
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        width={420}
      >
        {auditLoading ? (
          <div className="schedule-loading"><Spin /></div>
        ) : auditItems.length === 0 ? (
          <Text type="secondary">Chưa có nhật ký nào.</Text>
        ) : (
          <div className="schedule-audit-list">
            {auditItems.map((item) => (
              <div key={item.id} className="schedule-audit-item">
                <div className="schedule-audit-header">
                  <strong>{item.action}</strong>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
                <div className="schedule-audit-body">
                  <div>{item.actorName || `User #${item.actorUserId}`}</div>
                  {item.note && <div className="schedule-audit-note">{item.note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}





