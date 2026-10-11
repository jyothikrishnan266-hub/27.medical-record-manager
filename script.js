const STORAGE_KEY = "meditrack_demo_v1";

const $ = id => document.getElementById(id);

function createEmptyData() {
  return { patients: [], records: [], appointments: [] };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createEmptyData();

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") {
      return createEmptyData();
    }

    return {
      patients: Array.isArray(parsed.patients) ? parsed.patients : [],
      records: Array.isArray(parsed.records) ? parsed.records : [],
      appointments: Array.isArray(parsed.appointments)
        ? parsed.appointments : []
    };
  } catch {
    return createEmptyData();
  }
}

let data = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Unable to save data:", error);
    alert("Unable to save data. Check browser storage settings.");
    return false;
  }
}

function createId(prefix) {
  const unique = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${unique}`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function todayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTime(value) {
  if (!value) return "—";

  const [hour, minute] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function patientName(patientId) {
  const patient = data.patients.find(item => item.id === patientId);
  return patient ? patient.name : "Unknown patient";
}

function refreshPatientOptions() {
  const selects = ["recordPatient", "appointmentPatient"];

  selects.forEach(id => {
    const select = $(id);
    const previousValue = select.value;

    select.innerHTML = '<option value="">Select a patient</option>';

    data.patients.forEach(patient => {
      const option = document.createElement("option");
      option.value = patient.id;
      option.textContent = `${patient.name} (${patient.id})`;
      select.appendChild(option);
    });

    if (data.patients.some(p => p.id === previousValue)) {
      select.value = previousValue;
    }
  });
}

function renderStats() {
  $("totalPatients").textContent = data.patients.length;
  $("totalRecords").textContent = data.records.length;

  $("totalAppointments").textContent = data.appointments.filter(
    appointment =>
      appointment.date >= todayString() &&
      appointment.status === "Scheduled"
  ).length;
}

function renderPatients() {
  const query = $("patientSearch").value.trim().toLowerCase();

  const patients = data.patients.filter(patient =>
    patient.name.toLowerCase().includes(query) ||
    patient.id.toLowerCase().includes(query)
  );

  $("patientTable").innerHTML = patients.length
    ? patients.map(patient => `
      <tr>
        <td>${escapeHTML(patient.id)}</td>
        <td>${escapeHTML(patient.name)}</td>
        <td>${patient.age}</td>
        <td>${escapeHTML(patient.gender)}</td>
        <td>${escapeHTML(patient.phone || "—")}</td>
        <td>
          <button class="delete-btn"
            data-delete-patient="${escapeHTML(patient.id)}">
            Delete
          </button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="6" class="empty">No patients found.</td></tr>';

  refreshPatientOptions();
}

function renderRecords() {
  const records = [...data.records].sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  $("recordTable").innerHTML = records.length
    ? records.map(record => `
      <tr>
        <td>${escapeHTML(record.id)}</td>
        <td>${escapeHTML(patientName(record.patientId))}</td>
        <td>${escapeHTML(formatDate(record.date))}</td>
        <td>${escapeHTML(record.doctor || "—")}</td>
        <td title="${escapeHTML(record.diagnosis)}">
          ${escapeHTML(
            record.diagnosis.length > 60
              ? record.diagnosis.slice(0, 60) + "..."
              : record.diagnosis
          )}
        </td>
        <td>
          <button class="delete-btn"
            data-delete-record="${escapeHTML(record.id)}">
            Delete
          </button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="6" class="empty">No medical records yet.</td></tr>';
}

function renderAppointments() {
  const appointments = [...data.appointments].sort(
    (a, b) => a.date.localeCompare(b.date) ||
      a.time.localeCompare(b.time)
  );

  $("appointmentTable").innerHTML = appointments.length
    ? appointments.map(appointment => `
      <tr>
        <td>${escapeHTML(patientName(appointment.patientId))}</td>
        <td>${escapeHTML(formatDate(appointment.date))}</td>
        <td>${escapeHTML(formatTime(appointment.time))}</td>
        <td>${escapeHTML(appointment.reason)}</td>
        <td><span class="pill">${escapeHTML(appointment.status)}</span></td>
        <td>
          ${appointment.status === "Scheduled"
            ? `<button class="complete-btn"
                data-complete="${escapeHTML(appointment.id)}">
                Complete
              </button>`
            : ""}
          <button class="delete-btn"
            data-delete-appointment="${escapeHTML(appointment.id)}">
            Delete
          </button>
        </td>
      </tr>
    `).join("")
    : '<tr><td colspan="6" class="empty">No appointments scheduled.</td></tr>';
}

function renderAll() {
  renderStats();
  renderPatients();
  renderRecords();
  renderAppointments();
}

// Register a patient.
$("patientForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = $("patientName").value.trim();
  const age = Number($("patientAge").value);
  const gender = $("patientGender").value;
  const phone = $("patientPhone").value.trim();
  const email = $("patientEmail").value.trim();

  if (!name || !Number.isInteger(age) || age < 0 || age > 120) {
    alert("Please enter a valid name and age.");
    return;
  }

  const patient = {
    id: createId("PAT"),
    name,
    age,
    gender,
    phone,
    email,
    createdAt: todayString()
  };

  data.patients.push(patient);

  if (!saveData()) {
    data.patients.pop();
    return;
  }

  event.target.reset();
  renderAll();
  alert(`Patient registered. ID: ${patient.id}`);
});

$("patientSearch").addEventListener("input", renderPatients);

// Delete a patient and their associated demo records/appointments.
$("patientTable").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-patient]");
  if (!button) return;

  const id = button.dataset.deletePatient;
  const patient = data.patients.find(item => item.id === id);

  if (!patient) return;

  if (!confirm(
    `Delete ${patient.name} and all associated medical records and appointments?`
  )) return;

  const previous = data;
  data = {
    patients: data.patients.filter(item => item.id !== id),
    records: data.records.filter(item => item.patientId !== id),
    appointments: data.appointments.filter(item => item.patientId !== id)
  };

  if (!saveData()) {
    data = previous;
    return;
  }

  renderAll();
});

// Save a medical record.
$("recordForm").addEventListener("submit", event => {
  event.preventDefault();

  const patientId = $("recordPatient").value;
  const date = $("visitDate").value;
  const doctor = $("doctorName").value.trim();
  const diagnosis = $("diagnosis").value.trim();
  const prescription = $("prescription").value.trim();

  if (!data.patients.some(patient => patient.id === patientId)) {
    alert("Please select a valid patient.");
    return;
  }

  if (!date || !diagnosis) {
    alert("Visit date and diagnosis/notes are required.");
    return;
  }

  const record = {
    id: createId("REC"),
    patientId,
    date,
    doctor,
    diagnosis,
    prescription
  };

  data.records.push(record);

  if (!saveData()) {
    data.records.pop();
    return;
  }

  event.target.reset();
  renderAll();
  alert("Medical record saved.");
});

// Delete a medical record.
$("recordTable").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-record]");
  if (!button) return;

  const id = button.dataset.deleteRecord;
  const record = data.records.find(item => item.id === id);

  if (!record || !confirm("Delete this medical record?")) return;

  const previous = data.records;
  data.records = previous.filter(item => item.id !== id);

  if (!saveData()) {
    data.records = previous;
    return;
  }

  renderAll();
});

// Schedule an appointment.
$("appointmentForm").addEventListener("submit", event => {
  event.preventDefault();

  const patientId = $("appointmentPatient").value;
  const date = $("appointmentDate").value;
  const time = $("appointmentTime").value;
  const reason = $("appointmentReason").value.trim();

  if (!data.patients.some(patient => patient.id === patientId)) {
    alert("Please select a valid patient.");
    return;
  }

  if (!date || !time || !reason) {
    alert("Please complete all required appointment fields.");
    return;
  }

  const appointment = {
    id: createId("APT"),
    patientId,
    date,
    time,
    reason,
    status: "Scheduled"
  };

  data.appointments.push(appointment);

  if (!saveData()) {
    data.appointments.pop();
    return;
  }

  event.target.reset();
  renderAll();
  alert("Appointment scheduled.");
});

// Complete or delete an appointment.
$("appointmentTable").addEventListener("click", event => {
  const completeButton = event.target.closest("[data-complete]");
  const deleteButton = event.target.closest("[data-delete-appointment]");

  if (completeButton) {
    const appointment = data.appointments.find(
      item => item.id === completeButton.dataset.complete
    );

    if (!appointment || appointment.status !== "Scheduled") return;

    const previousStatus = appointment.status;
    appointment.status = "Completed";

    if (!saveData()) {
      appointment.status = previousStatus;
      return;
    }

    renderAll();
    return;
  }

  if (deleteButton) {
    const id = deleteButton.dataset.deleteAppointment;

    if (!confirm("Delete this appointment?")) return;

    const previous = data.appointments;
    data.appointments = previous.filter(item => item.id !== id);

    if (!saveData()) {
      data.appointments = previous;
      return;
    }

    renderAll();
  }
});

// Navigate to the patient form.
$("addPatientBtn").addEventListener("click", () => {
  $("patients").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  $("patientName").focus({ preventScroll: true });
});

// Default dates to today.
$("visitDate").value = todayString();
$("appointmentDate").min = todayString();

renderAll();