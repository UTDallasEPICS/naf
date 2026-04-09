<template>
  <div class="app-shell">
    <header class="toolbar">
      <div>
        <h1>Database Viewer</h1>
      </div>

      <div class="toolbar-actions">
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Search rows..."
        />
        <button class="btn secondary" @click="resetData">Reset</button>
        <button class="btn primary" @click="addRow">Add Row</button>
      </div>
    </header>

    <section class="table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th
                v-for="column in columns"
                :key="column.key"
                @click="sortBy(column.key)"
                class="sortable"
              >
                <div class="th-content">
                  <span>{{ column.label }}</span>
                  <span v-if="sort.key === column.key">
                    {{ sort.order === 'asc' ? '▲' : '▼' }}
                  </span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(row, rowIndex) in filteredRows" :key="row.id">
              <td class="row-number">{{ rowIndex + 1 }}</td>
              <td v-for="column in columns" :key="column.key">
                <input
                  v-model="row[column.key]"
                  class="cell-input"
                  :type="column.type || 'text'"
                />
              </td>
            </tr>

            <tr v-if="filteredRows.length === 0">
              <td :colspan="columns.length + 1" class="empty-state">
                No matching rows found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">Visible Rows</span>
        <strong>{{ filteredRows.length }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">Total Rows</span>
        <strong>{{ rows.length }}</strong>
      </div>
      <div class="summary-card">
        <span class="summary-label">Columns</span>
        <strong>{{ columns.length }}</strong>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue"
import { confirmedAlumniSample } from "../src/data/c"

const columns = [
  { key: "full_name", label: "Name" },
  { key: "current_job", label: "Current Job" },
  { key: "city", label: "City" },
  { key: "linkedin_link", label: "LinkedIn" },
  { key: "phone_number", label: "Phone Number" },
  { key: "high_school", label: "High School" },
  { key: "hs_graduation_year", label: "Graduation Year" },
  { key: "naf_academy", label: "NAF Academy" },
  { key: "naf_track_certified", label: "NAF Track Certified" },
  { key: "university_grad_year", label: "College Graduation Year" },
  { key: "university", label: "College" },
  { key: "degree", label: "Degree" },
  { key: "internship_company1", label: "Internship Company" },
  { key: "internship_end_date1", label: "Internship End Date" },
]

const seedRows = confirmedAlumniSample.map((alumni) => ({
  ...alumni,
  internship_end_date1: alumni.internship_end_date1
    ? new Date(alumni.internship_end_date1).toISOString().split("T")[0]
    : "",
}))

const rows = ref(structuredClone(seedRows))
const search = ref("")
const sort = reactive({ key: "full_name", order: "asc" })

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()

  let result = rows.value.filter((row) => {
    if (!query) return true

    return columns.some((column) =>
      String(row[column.key] ?? "")
        .toLowerCase()
        .includes(query)
    )
  })

  result = [...result].sort((a, b) => {
    const aValue = a[sort.key]
    const bValue = b[sort.key]

    return sort.order === "asc"
      ? String(aValue ?? "").localeCompare(String(bValue ?? ""))
      : String(bValue ?? "").localeCompare(String(aValue ?? ""))
  })

  return result
})

function sortBy(key) {
  if (sort.key === key) {
    sort.order = sort.order === "asc" ? "desc" : "asc"
    return
  }

  sort.key = key
  sort.order = "asc"
}

function addRow() {
  rows.value.unshift({
    analyzer_id: Date.now(),
    full_name: "",
    current_job: "",
    city: "",
    linkedin_link: "",
    phone_number: "",
    high_school: "",
    hs_graduation_year: "",
    naf_academy: "",
    naf_track_certified: "",
    university_grad_year: "",
    university: "",
    degree: "",
    internship_company1: "",
    internship_end_date1: "",
  })
}

function resetData() {
  rows.value = structuredClone(seedRows)
  search.value = ""
  sort.key = "full_name"
  sort.order = "asc"
}
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f3f6fb;
  color: #1f2937;
}

.app-shell {
  min-height: 100vh;
  padding: 32px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.toolbar h1 {
  margin: 0 0 6px;
  font-size: 28px;
}

.toolbar p {
  margin: 0;
  color: #6b7280;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input,
.cell-input {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
  transition: 0.2s ease;
}

.search-input {
  min-width: 240px;
  padding: 12px 14px;
  background: #fff;
}

.search-input:focus,
.cell-input:focus {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.btn {
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn.primary {
  background: #4f46e5;
  color: white;
}

.btn.secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.table-card,
.summary-card {
  background: white;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.table-card {
  overflow: hidden;
}

.table-wrap {
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

thead {
  background: #eef2ff;
}

th,
td {
  border-bottom: 1px solid #e5e7eb;
  padding: 12px;
  text-align: left;
}

th {
  font-size: 14px;
  color: #374151;
  position: sticky;
  top: 0;
  background: #eef2ff;
  z-index: 1;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.th-content {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.row-number {
  color: #6b7280;
  width: 60px;
}

.cell-input {
  width: 100%;
  padding: 10px 12px;
  background: #fff;
}

.empty-state {
  text-align: center;
  color: #6b7280;
  padding: 32px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.summary-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.summary-label {
  color: #6b7280;
  font-size: 14px;
}

.summary-card strong {
  font-size: 28px;
}

@media (max-width: 768px) {
  .app-shell {
    padding: 18px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .search-input {
    min-width: 100%;
  }
}
</style>