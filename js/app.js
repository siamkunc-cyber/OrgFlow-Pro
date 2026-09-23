/**
 * OrgFlow Main Application Controller
 * Orchestrates UI interactions, modals, search, persistence, and chart rendering
 */

class OrgAppController {
  constructor() {
    this.data = [];
    this.renderer = null;
    this.selectedNodeId = null;
    this.activeDeptFilter = 'ALL';
    this.currentView = 'chart'; // 'chart' | 'table'
    this.uploadedFile = null;
    this.STORAGE_KEY = 'orgflow_chart_data_v1';
    this.cloudReady = false;
    this.authSubscription = null;
  }

  /**
   * Initialize Application
   */
  async init() {
    // 1. Initialize cloud storage
    this.cloudReady = !!(window.OrgFlowCloud && window.OrgFlowCloud.init());

    // 2. Setup Native D3 Chart Renderer
    this.renderer = new OrgChartRenderer({
      container: '#chart-container',
      onNodeClick: (id) => this.handleNodeClick(id),
      onAddSubordinate: (id) => this.openAddSubordinateModal(id),
      onEditNode: (id) => this.openEditModal(id),
      onDeleteNode: (id) => this.deleteNode(id)
    });

    // 3. Bind UI Events
    this.bindEvents();

    // 4. Cloud authentication gate
    if (this.cloudReady) {
      this.setupAuthGate();
      const session = await window.OrgFlowCloud.getSession();
      if (!session) {
        this.data = [];
        this.updateStats();
        this.renderDeptFilters();
        this.renderCurrentView();
        this.showAuthGate();
        return;
      }
      await this.loadAuthenticatedData();
    } else {
      this.data = [];
      this.refreshUI();
      this.showAuthGate(true);
    }

    console.log('OrgFlow initialized successfully with', this.data.length, 'members.');
  }

  async loadAuthenticatedData() {
    await this.loadInitialData();
    this.refreshUI();
    this.hideAuthGate();
  }

  refreshUI() {
    this.updateStats();
    this.renderDeptFilters();
    this.populateManagerDropdown();
    this.renderCurrentView();
  }

  setupAuthGate() {
    if (this.authSubscription) return;

    this.authSubscription = window.OrgFlowCloud.onAuthStateChange(async (event, session) => {
      if (session) {
        try {
          await this.loadAuthenticatedData();
        } catch (e) {
          console.error('Auth session load failed:', e);
        }
      } else {
        this.data = [];
        this.activeDeptFilter = 'ALL';
        this.refreshUI();
        this.showAuthGate();
      }
    });

    const form = document.getElementById('cloud-login-form');
    if (form && !form.dataset.bound) {
      form.dataset.bound = '1';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('cloud-login-email').value.trim();
        const password = document.getElementById('cloud-login-password').value;
        const btn = document.getElementById('cloud-login-submit');

        if (!email || !password) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังเข้าสู่ระบบ...';
        try {
          await window.OrgFlowCloud.signIn(email, password);
          form.reset();
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'เข้าสู่ระบบไม่สำเร็จ',
            text: err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
          });
        } finally {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> เข้าสู่ระบบ';
        }
      });
    }

    const setupBtn = document.getElementById('btn-auth-setup');
    if (setupBtn && !setupBtn.dataset.bound) {
      setupBtn.dataset.bound = '1';
      setupBtn.addEventListener('click', () => {
        window.open('https://supabase.com/dashboard', '_blank', 'noopener');
      });
    }
  }

  showAuthGate(configMissing = false) {
    const gate = document.getElementById('cloud-auth-gate');
    const title = document.getElementById('auth-gate-title');
    const subtitle = document.getElementById('auth-gate-subtitle');
    const form = document.getElementById('cloud-login-form');
    const setup = document.getElementById('btn-auth-setup');
    if (configMissing) {
      if (title) title.textContent = 'ตั้งค่า Cloud Database ก่อนใช้งาน';
      if (subtitle) subtitle.textContent = 'กรุณาใส่ Supabase URL และ Publishable/Anon Key ใน js/config.js';
      if (form) form.classList.add('hidden');
      if (setup) setup.classList.remove('hidden');
    } else {
      if (title) title.textContent = 'เข้าสู่ระบบ OrgFlow Cloud';
      if (subtitle) subtitle.textContent = 'ข้อมูลผังองค์กรถูกเก็บใน Supabase Postgres ไม่ใช่ Excel หรือ LocalStorage';
      if (form) form.classList.remove('hidden');
      if (setup) setup.classList.add('hidden');
    }
    if (gate) gate.classList.remove('hidden');
    document.body.classList.add('auth-locked');
  }

  hideAuthGate() {
    const gate = document.getElementById('cloud-auth-gate');
    if (gate) gate.classList.add('hidden');
    document.body.classList.remove('auth-locked');
    const emailLabel = document.getElementById('auth-user-email');
    if (emailLabel && window.OrgFlowCloud && window.OrgFlowCloud.user) {
      emailLabel.textContent = window.OrgFlowCloud.user.email || '';
    }
  }

  /**
   * Load data from localStorage or initial sample dataset
   */
  async loadInitialData() {
    try {
      const rows = await window.OrgFlowCloud.loadEmployees();
      if (Array.isArray(rows) && rows.length > 0) {
        this.data = rows;
        return;
      }

      // Empty cloud database: keep the UI empty until the user explicitly
      // chooses "โหลดตัวอย่างตั้งต้น" or imports data.
      this.data = [];
    } catch (e) {
      console.error('Cloud data load failed:', e);
      this.data = [];
      if (typeof Swal !== 'undefined') {
        await Swal.fire({
          icon: 'error',
          title: 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ',
          text: e.message || 'ตรวจสอบ Supabase URL, key, Auth และ RLS'
        });
      }
    }
  }

  loadInitialDataLocal() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.data = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('Could not parse localStorage data', e);
    }

    if (window.SAMPLE_ORG_DATA && Array.isArray(window.SAMPLE_ORG_DATA)) {
      this.data = JSON.parse(JSON.stringify(window.SAMPLE_ORG_DATA));
    } else {
      this.data = [];
    }
  }

  /**
   * Persist current organization data to Supabase.
   * Kept under the old method name so existing UI flows continue to work.
   */
  async saveToLocalStorage(silent = false) {
    try {
      if (!this.cloudReady || !window.OrgFlowCloud) {
        throw new Error('ยังไม่ได้ตั้งค่า Supabase Cloud');
      }
      await window.OrgFlowCloud.upsertEmployees(this.data);

      if (!silent && typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'บันทึกข้อมูลเรียบร้อย',
          text: this.cloudReady ? 'บันทึกลงฐานข้อมูล Cloud แล้ว' : 'บันทึกลงเบราว์เซอร์ชั่วคราวแล้ว',
          timer: 1800,
          showConfirmButton: false,
          toast: true,
          position: 'top-end'
        });
      }
      return true;
    } catch (e) {
      console.error('Data save failed:', e);
      if (!silent && typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถบันทึกได้',
          text: e.message || 'ตรวจสอบการเชื่อมต่อฐานข้อมูลและสิทธิ์ RLS'
        });
      }
      return false;
    }
  }

  /**
   * Render Active View (Chart or Table)
   */
  renderCurrentView() {
    if (this.currentView === 'chart') {
      const chartPanel = document.getElementById('chart-view-panel');
      const tablePanel = document.getElementById('table-view-panel');
      const chartBtn = document.getElementById('view-chart-btn');
      const tableBtn = document.getElementById('view-table-btn');

      if (chartPanel) chartPanel.classList.remove('hidden');
      if (tablePanel) tablePanel.classList.add('hidden');
      if (chartBtn) chartBtn.className = 'px-3 py-1.5 rounded-lg bg-white shadow-xs text-indigo-600 font-semibold flex items-center gap-1.5 transition-all';
      if (tableBtn) tableBtn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all';
      
      const filteredData = this.getFilteredData();
      if (this.renderer) {
        this.renderer.render(filteredData);
      }
    } else {
      const chartPanel = document.getElementById('chart-view-panel');
      const tablePanel = document.getElementById('table-view-panel');
      const chartBtn = document.getElementById('view-chart-btn');
      const tableBtn = document.getElementById('view-table-btn');

      if (chartPanel) chartPanel.classList.add('hidden');
      if (tablePanel) tablePanel.classList.remove('hidden');
      if (chartBtn) chartBtn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all';
      if (tableBtn) tableBtn.className = 'px-3 py-1.5 rounded-lg bg-white shadow-xs text-indigo-600 font-semibold flex items-center gap-1.5 transition-all';
      
      this.renderTableView();
    }
  }

  /**
   * Get data filtered by active department
   */
  getFilteredData() {
    if (this.activeDeptFilter === 'ALL') {
      return this.data;
    }
    return this.data.filter(item => (item.department || '').toLowerCase() === this.activeDeptFilter.toLowerCase());
  }

  /**
   * Toggle Children of a specific node
   */
  toggleNodeChildren(nodeId) {
    if (this.renderer) {
      this.renderer.toggleNode(nodeId);
    }
  }

  /**
   * Bind DOM Events & Listeners
   */
  bindEvents() {
    // 1. View Toggles
    const viewChartBtn = document.getElementById('view-chart-btn');
    if (viewChartBtn) {
      viewChartBtn.addEventListener('click', () => {
        this.currentView = 'chart';
        this.renderCurrentView();
      });
    }

    const viewTableBtn = document.getElementById('view-table-btn');
    if (viewTableBtn) {
      viewTableBtn.addEventListener('click', () => {
        this.currentView = 'table';
        this.renderCurrentView();
      });
    }

    // 2. Download Template
    const dlTemplateBtn = document.getElementById('btn-download-template');
    if (dlTemplateBtn) {
      dlTemplateBtn.addEventListener('click', () => {
        ExcelService.downloadTemplate();
      });
    }

    // 3. Open Upload Modal
    const openUploadBtn = document.getElementById('btn-open-upload');
    if (openUploadBtn) {
      openUploadBtn.addEventListener('click', () => {
        this.resetUploadModal();
        this.openModal('modal-upload-excel');
      });
    }

    // 4. Open Add Modal
    const openAddBtn = document.getElementById('btn-open-add');
    if (openAddBtn) {
      openAddBtn.addEventListener('click', () => {
        this.openAddModal();
      });
    }

    // 5. Export Menu Dropdown
    const exportBtn = document.getElementById('btn-export-menu');
    const exportDropdown = document.getElementById('export-dropdown');
    if (exportBtn && exportDropdown) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('hidden');
        const moreDropdown = document.getElementById('more-dropdown');
        if (moreDropdown) moreDropdown.classList.add('hidden');
      });
    }

    const expExcelBtn = document.getElementById('btn-export-excel');
    if (expExcelBtn) {
      expExcelBtn.addEventListener('click', () => {
        if (exportDropdown) exportDropdown.classList.add('hidden');
        ExcelService.exportToExcel(this.data);
      });
    }

    const expPngBtn = document.getElementById('btn-export-png');
    if (expPngBtn) {
      expPngBtn.addEventListener('click', () => {
        if (exportDropdown) exportDropdown.classList.add('hidden');
        if (this.renderer) this.renderer.exportImg();
      });
    }

    const expPdfBtn = document.getElementById('btn-export-pdf');
    if (expPdfBtn) {
      expPdfBtn.addEventListener('click', () => {
        if (exportDropdown) exportDropdown.classList.add('hidden');
        if (this.renderer) this.renderer.exportPdf();
      });
    }

    const expSvgBtn = document.getElementById('btn-export-svg');
    if (expSvgBtn) {
      expSvgBtn.addEventListener('click', () => {
        if (exportDropdown) exportDropdown.classList.add('hidden');
        if (this.renderer) this.renderer.exportSvg();
      });
    }

    // 6. More Menu Dropdown
    const moreBtn = document.getElementById('btn-more-menu');
    const moreDropdown = document.getElementById('more-dropdown');
    if (moreBtn && moreDropdown) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreDropdown.classList.toggle('hidden');
        if (exportDropdown) exportDropdown.classList.add('hidden');
      });
    }

    const saveLocalBtn = document.getElementById('btn-save-local');
    if (saveLocalBtn) {
      saveLocalBtn.addEventListener('click', () => {
        if (moreDropdown) moreDropdown.classList.add('hidden');
        this.saveToLocalStorage(false);
      });
    }

    const resetDemoBtn = document.getElementById('btn-reset-demo');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', () => {
        if (moreDropdown) moreDropdown.classList.add('hidden');
        this.resetToDemo();
      });
    }

    const clearAllBtn = document.getElementById('btn-clear-all');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        if (moreDropdown) moreDropdown.classList.add('hidden');
        this.clearAllData();
      });
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await window.OrgFlowCloud.signOut();
        } catch (e) {
          Swal.fire({ icon: 'error', title: 'ออกจากระบบไม่สำเร็จ', text: e.message });
        }
      });
    }

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      if (exportDropdown) exportDropdown.classList.add('hidden');
      if (moreDropdown) moreDropdown.classList.add('hidden');
      const searchDropdown = document.getElementById('search-results-dropdown');
      if (searchDropdown) searchDropdown.classList.add('hidden');
    });

    // 7. Global Search Input
    const searchInput = document.getElementById('global-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const searchResultsDropdown = document.getElementById('search-results-dropdown');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
          if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
          this.handleSearchAutoSuggest(query);
        } else {
          if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
          if (searchResultsDropdown) searchResultsDropdown.classList.add('hidden');
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim().toLowerCase();
          if (query) {
            const match = this.data.find(d => 
              d.name.toLowerCase().includes(query) ||
              d.position.toLowerCase().includes(query) ||
              d.id.toLowerCase() === query ||
              (d.department && d.department.toLowerCase().includes(query))
            );
            if (match) {
              this.focusAndHighlightNode(match.id);
              if (searchResultsDropdown) searchResultsDropdown.classList.add('hidden');
            }
          }
        } else if (e.key === 'Escape') {
          searchInput.value = '';
          if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
          if (searchResultsDropdown) searchResultsDropdown.classList.add('hidden');
        }
      });
    }

    if (clearSearchBtn && searchInput) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        if (searchResultsDropdown) searchResultsDropdown.classList.add('hidden');
        searchInput.focus();
      });
    }

    // 8. Canvas Zoom & Fit Floating Controls
    const zoomInBtn = document.getElementById('ctrl-zoom-in');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.renderer && this.renderer.zoomIn());

    const zoomOutBtn = document.getElementById('ctrl-zoom-out');
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.renderer && this.renderer.zoomOut());

    const fitBtn = document.getElementById('ctrl-fit');
    if (fitBtn) fitBtn.addEventListener('click', () => this.renderer && this.renderer.fit());

    const expAllBtn = document.getElementById('ctrl-expand-all');
    if (expAllBtn) expAllBtn.addEventListener('click', () => this.renderer && this.renderer.expandAll());

    const colAllBtn = document.getElementById('ctrl-collapse-all');
    if (colAllBtn) colAllBtn.addEventListener('click', () => this.renderer && this.renderer.collapseAll());

    // 9. Table Search Input
    const tableSearchInput = document.getElementById('table-search-input');
    if (tableSearchInput) {
      tableSearchInput.addEventListener('input', (e) => {
        this.renderTableView(e.target.value.trim());
      });
    }

    // 10. Form Submission (Add / Edit)
    const empForm = document.getElementById('employee-form');
    if (empForm) {
      empForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });
    }

    // 11. Upload File & Dropzone
    this.bindUploadDropzone();

    // 12. Detail Modal Buttons
    const detailAddSubBtn = document.getElementById('detail-btn-add-sub');
    if (detailAddSubBtn) {
      detailAddSubBtn.addEventListener('click', () => {
        const id = this.selectedNodeId;
        this.closeModal('modal-employee-detail');
        this.openAddSubordinateModal(id);
      });
    }

    const detailEditBtn = document.getElementById('detail-btn-edit');
    if (detailEditBtn) {
      detailEditBtn.addEventListener('click', () => {
        const id = this.selectedNodeId;
        this.closeModal('modal-employee-detail');
        this.openEditModal(id);
      });
    }

    const detailDelBtn = document.getElementById('detail-btn-delete');
    if (detailDelBtn) {
      detailDelBtn.addEventListener('click', () => {
        const id = this.selectedNodeId;
        this.closeModal('modal-employee-detail');
        this.deleteNode(id);
      });
    }
  }

  /**
   * Search Autocomplete Dropdown
   */
  handleSearchAutoSuggest(query) {
    const dropdown = document.getElementById('search-results-dropdown');
    if (!dropdown) return;
    const q = query.toLowerCase();

    const matches = this.data.filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.position.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.department && item.department.toLowerCase().includes(q))
    ).slice(0, 8);

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="p-3 text-slate-400 text-center text-xs">
          ไม่พบข้อมูลที่ตรงกับ "${query}"
        </div>
      `;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = matches.map(item => `
      <div class="p-2.5 hover:bg-indigo-50/60 cursor-pointer flex items-center justify-between transition-colors text-xs"
           onclick="window.OrgApp.focusAndHighlightNode('${item.id}'); document.getElementById('search-results-dropdown').classList.add('hidden');">
        <div class="flex items-center gap-2.5 truncate">
          <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
            ${item.name.slice(0, 2)}
          </div>
          <div class="truncate">
            <div class="font-bold text-slate-800 truncate">${item.name}</div>
            <div class="text-[10px] text-slate-500 truncate">${item.position} · <span class="text-indigo-600 font-medium">${item.department}</span></div>
          </div>
        </div>
        <span class="font-mono text-[10px] text-slate-400 font-semibold ml-2">#${item.id}</span>
      </div>
    `).join('');

    dropdown.classList.remove('hidden');
  }

  /**
   * Focus, center and highlight node in chart
   */
  focusAndHighlightNode(nodeId) {
    if (this.currentView !== 'chart') {
      this.currentView = 'chart';
      this.renderCurrentView();
    }
    if (this.renderer) {
      this.renderer.focusNode(nodeId);
    }
  }

  /**
   * Bind Upload Modal Dropzone and File Picker
   */
  bindUploadDropzone() {
    const dropzone = document.getElementById('excel-dropzone');
    const fileInput = document.getElementById('excel-file-input');
    const fileInfo = document.getElementById('upload-file-info');
    const removeFileBtn = document.getElementById('btn-remove-selected-file');
    const processUploadBtn = document.getElementById('btn-process-upload');

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('border-indigo-500', 'bg-indigo-50/50');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.handleFileSelected(e.target.files[0]);
      }
    });

    if (removeFileBtn) {
      removeFileBtn.addEventListener('click', () => {
        this.resetUploadModal();
      });
    }

    if (processUploadBtn) {
      processUploadBtn.addEventListener('click', () => {
        if (this.uploadedFile) {
          this.processExcelUpload(this.uploadedFile);
        }
      });
    }
  }

  handleFileSelected(file) {
    const validExts = ['.xlsx', '.xls', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExts.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      Swal.fire({
        icon: 'error',
        title: 'ไฟล์ไม่ถูกต้อง',
        text: 'กรุณาเลือกไฟล์ Excel (.xlsx, .xls) หรือ CSV (.csv)'
      });
      return;
    }

    this.uploadedFile = file;
    document.getElementById('upload-file-name').textContent = file.name;
    document.getElementById('upload-file-size').textContent = `${(file.size / 1024).toFixed(1)} KB`;
    document.getElementById('upload-file-info').classList.remove('hidden');
    document.getElementById('btn-process-upload').removeAttribute('disabled');
  }

  resetUploadModal() {
    this.uploadedFile = null;
    const fileInput = document.getElementById('excel-file-input');
    const fileInfo = document.getElementById('upload-file-info');
    const procBtn = document.getElementById('btn-process-upload');
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.classList.add('hidden');
    if (procBtn) procBtn.setAttribute('disabled', 'true');
  }

  /**
   * Process and validate uploaded Excel file
   */
  async processExcelUpload(file) {
    try {
      Swal.fire({
        title: 'กำลังตรวจสอบและนำเข้าข้อมูล...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const { rawData, validation } = await ExcelService.parseFile(file);

      if (!validation.isValid) {
        Swal.fire({
          icon: 'error',
          title: 'พบข้อผิดพลาดในตาราง Excel',
          html: `
            <div class="text-left text-xs text-red-600 bg-red-50 p-3 rounded-lg max-h-48 overflow-y-auto space-y-1">
              ${validation.errors.map(err => `<div>• ${err}</div>`).join('')}
            </div>
            <p class="text-xs text-slate-500 mt-2">กรุณาแก้ไขข้อมูลในไฟล์ Excel แล้วลองอัพโหลดใหม่อีกครั้ง</p>
          `
        });
        return;
      }

      const importModeRadio = document.querySelector('input[name="import-mode"]:checked');
      const importMode = importModeRadio ? importModeRadio.value : 'replace';

      if (importMode === 'replace') {
        this.data = rawData;
      } else {
        // Merge mode: update existing by ID, add new ones
        const existingMap = new Map(this.data.map(d => [d.id, d]));
        rawData.forEach(item => existingMap.set(item.id, item));
        this.data = Array.from(existingMap.values());
      }

      if (!this.cloudReady) throw new Error('ยังไม่ได้ตั้งค่า Supabase Cloud');
      await window.OrgFlowCloud.replaceEmployees(this.data);
      this.closeModal('modal-upload-excel');
      this.updateStats();
      this.renderDeptFilters();
      this.populateManagerDropdown();
      this.renderCurrentView();

      let warningHtml = '';
      if (validation.warnings.length > 0) {
        warningHtml = `
          <div class="text-left text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg mt-2 space-y-1 max-h-32 overflow-y-auto">
            <strong class="block">ข้อสังเกต:</strong>
            ${validation.warnings.map(w => `<div>• ${w}</div>`).join('')}
          </div>
        `;
      }

      Swal.fire({
        icon: 'success',
        title: 'นำเข้าข้อมูลสำเร็จ!',
        html: `นำเข้าข้อมูลพนักงานสำเร็จ <strong>${rawData.length}</strong> รายการ ${warningHtml}`,
        timer: 3000,
        showConfirmButton: true
      });

    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'การนำเข้าล้มเหลว',
        text: err.message || 'ไม่สามารถประมวลผลไฟล์ได้'
      });
    }
  }

  /**
   * Update Dashboard Statistics
   */
  updateStats() {
    const totalEmployees = this.data.length;
    const departments = new Set(this.data.map(d => d.department || 'General'));
    
    // Calculate max depth
    let maxDepth = 0;
    const idMap = new Map(this.data.map(d => [d.id, d]));
    this.data.forEach(item => {
      let depth = 1;
      let curr = item;
      const visited = new Set([curr.id]);
      while (curr && curr.reportsTo && idMap.has(curr.reportsTo) && !visited.has(curr.reportsTo)) {
        depth++;
        visited.add(curr.reportsTo);
        curr = idMap.get(curr.reportsTo);
      }
      if (depth > maxDepth) maxDepth = depth;
    });

    const statEmployeesEl = document.getElementById('stat-total-employees');
    const statDeptsEl = document.getElementById('stat-total-depts');
    const statDepthEl = document.getElementById('stat-max-depth');

    if (statEmployeesEl) statEmployeesEl.textContent = totalEmployees;
    if (statDeptsEl) statDeptsEl.textContent = departments.size;
    if (statDepthEl) statDepthEl.textContent = maxDepth;
  }

  /**
   * Render Department Filter Pills
   */
  renderDeptFilters() {
    const container = document.getElementById('dept-filter-container');
    if (!container) return;

    const departments = ['ALL', ...Array.from(new Set(this.data.map(d => d.department || 'General').filter(Boolean)))];

    container.innerHTML = departments.map(dept => {
      const isAll = dept === 'ALL';
      const label = isAll ? 'ทั้งหมด' : dept;
      const count = isAll ? this.data.length : this.data.filter(d => (d.department || 'General') === dept).length;
      const isActive = this.activeDeptFilter.toLowerCase() === dept.toLowerCase();

      return `
        <button onclick="window.OrgApp.filterByDepartment('${dept}')"
                class="px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }">
          <span>${label}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'} font-normal">
            ${count}
          </span>
        </button>
      `;
    }).join('');
  }

  filterByDepartment(dept) {
    this.activeDeptFilter = dept;
    this.renderDeptFilters();
    this.renderCurrentView();
  }

  /**
   * Populate Manager (Reports To) Dropdown in Employee Form
   */
  populateManagerDropdown(excludeId = null) {
    const select = document.getElementById('form-reports-to');
    if (!select) return;

    const options = ['<option value="">-- ไม่มี (เป็นตำแหน่งสูงสุดขององค์กร) --</option>'];

    // Find all descendants of excludeId to prevent circular references
    const descendants = new Set();
    if (excludeId) {
      descendants.add(excludeId);
      let added = true;
      while (added) {
        added = false;
        this.data.forEach(item => {
          if (item.reportsTo && descendants.has(item.reportsTo) && !descendants.has(item.id)) {
            descendants.add(item.id);
            added = true;
          }
        });
      }
    }

    this.data.forEach(item => {
      if (descendants.has(item.id)) return; // Skip invalid parent choices
      options.push(`
        <option value="${item.id}">${item.name} (${item.position}) - #${item.id}</option>
      `);
    });

    select.innerHTML = options.join('');
  }

  /**
   * Handle Click on Node in Org Chart Canvas
   */
  handleNodeClick(id) {
    this.openDetailModal(id);
  }

  /**
   * Open Add Employee Modal
   */
  openAddModal() {
    document.getElementById('form-modal-title').textContent = 'เพิ่มข้อมูลบุคลากรใหม่';
    document.getElementById('form-mode').value = 'add';
    
    // Auto generate next ID
    const nextIdNum = this.data.length + 1;
    document.getElementById('form-id').value = `EMP${String(nextIdNum).padStart(3, '0')}`;
    document.getElementById('form-id').removeAttribute('readonly');
    
    document.getElementById('form-name').value = '';
    document.getElementById('form-position').value = '';
    document.getElementById('form-department').value = '';
    document.getElementById('form-level').value = 'Staff';
    document.getElementById('form-email').value = '';
    document.getElementById('form-phone').value = '';
    document.getElementById('form-avatar').value = '';
    
    this.populateManagerDropdown();
    document.getElementById('form-reports-to').value = this.data.length > 0 ? this.data[0].id : '';

    this.openModal('modal-employee-form');
  }

  /**
   * Open Add Subordinate Modal directly for a parent node
   */
  openAddSubordinateModal(managerId) {
    this.openAddModal();
    document.getElementById('form-reports-to').value = managerId;
    const manager = this.data.find(d => d.id === managerId);
    if (manager && manager.department) {
      document.getElementById('form-department').value = manager.department;
    }
  }

  /**
   * Open Edit Employee Modal
   */
  openEditModal(id) {
    const item = this.data.find(d => d.id === id);
    if (!item) return;

    this.selectedNodeId = id;
    document.getElementById('form-modal-title').textContent = `แก้ไขข้อมูล: ${item.name}`;
    document.getElementById('form-mode').value = 'edit';
    
    document.getElementById('form-id').value = item.id;
    document.getElementById('form-id').setAttribute('readonly', 'true');
    document.getElementById('form-name').value = item.name;
    document.getElementById('form-position').value = item.position;
    document.getElementById('form-department').value = item.department || '';
    document.getElementById('form-level').value = item.roleLevel || 'Staff';
    document.getElementById('form-email').value = item.email || '';
    document.getElementById('form-phone').value = item.phone || '';
    document.getElementById('form-avatar').value = item.avatarUrl || '';

    this.populateManagerDropdown(id);
    document.getElementById('form-reports-to').value = item.reportsTo || '';

    this.openModal('modal-employee-form');
  }

  /**
   * Handle Form Submission (Add or Edit)
   */
  async handleFormSubmit() {
    const mode = document.getElementById('form-mode').value;
    const id = document.getElementById('form-id').value.trim();
    const name = document.getElementById('form-name').value.trim();
    const position = document.getElementById('form-position').value.trim();
    const department = document.getElementById('form-department').value.trim() || 'General';
    const roleLevel = document.getElementById('form-level').value;
    const reportsTo = document.getElementById('form-reports-to').value;
    const email = document.getElementById('form-email').value.trim();
    const phone = document.getElementById('form-phone').value.trim();
    const avatarUrl = document.getElementById('form-avatar').value.trim();

    if (!id || !name || !position) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกรหัส, ชื่อ และตำแหน่ง' });
      return;
    }

    if (mode === 'add') {
      // Check duplicate ID
      if (this.data.some(d => d.id.toLowerCase() === id.toLowerCase())) {
        Swal.fire({ icon: 'error', title: 'รหัส ID ซ้ำ', text: `รหัส "${id}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น` });
        return;
      }

      const newMember = { id, name, position, department, reportsTo, roleLevel, email, phone, avatarUrl };
      this.data.push(newMember);
    } else {
      // Update existing
      const index = this.data.findIndex(d => d.id === id);
      if (index !== -1) {
        this.data[index] = { id, name, position, department, reportsTo, roleLevel, email, phone, avatarUrl };
      }
    }

    this.closeModal('modal-employee-form');
    const saved = await this.saveToLocalStorage(true);
    if (!saved) return;
    this.updateStats();
    this.renderDeptFilters();
    this.populateManagerDropdown();
    this.renderCurrentView();

    Swal.fire({
      icon: 'success',
      title: mode === 'add' ? 'เพิ่มบุคลากรเรียบร้อย' : 'อัพเดตข้อมูลเรียบร้อย',
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  /**
   * Open Employee Detail Modal
   */
  openDetailModal(id) {
    const item = this.data.find(d => d.id === id);
    if (!item) return;

    this.selectedNodeId = id;
    const manager = item.reportsTo ? this.data.find(d => d.id === item.reportsTo) : null;
    const subordinates = this.data.filter(d => d.reportsTo === item.id);
    const theme = this.renderer ? this.renderer.getDepartmentTheme(item.department) : { bg: 'from-slate-600 to-zinc-600', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
    const initials = this.renderer ? this.renderer.getInitials(item.name) : 'EMP';

    document.getElementById('detail-id').textContent = `#${item.id}`;
    document.getElementById('detail-name').textContent = item.name;
    document.getElementById('detail-position').textContent = item.position;
    document.getElementById('detail-dept-badge').textContent = item.department || 'General';
    document.getElementById('detail-level-badge').textContent = item.roleLevel || 'Staff';
    document.getElementById('detail-email').textContent = item.email || 'ไม่มีข้อมูลอีเมล';
    document.getElementById('detail-phone').textContent = item.phone || 'ไม่มีข้อมูลเบอร์โทรศัพท์';
    document.getElementById('detail-manager-name').textContent = manager ? `${manager.name} (${manager.position})` : 'ตำแหน่งสูงสุด (ไม่มีหัวหน้า)';
    document.getElementById('detail-sub-count').textContent = subordinates.length;

    // Avatar
    const avatarContainer = document.getElementById('detail-avatar-container');
    if (item.avatarUrl) {
      avatarContainer.innerHTML = `
        <img src="${item.avatarUrl}" alt="${item.name}" class="w-16 h-16 rounded-2xl object-cover shadow-md border-3 border-white ring-2 ring-slate-100" onerror="this.outerHTML='<div class=\\'w-16 h-16 rounded-2xl bg-gradient-to-tr ${theme.bg} text-white flex items-center justify-center font-bold text-lg shadow-md border-3 border-white\\'>${initials}</div>'" />
      `;
    } else {
      avatarContainer.innerHTML = `
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr ${theme.bg} text-white flex items-center justify-center font-bold text-lg shadow-md border-3 border-white ring-2 ring-slate-100">
          ${initials}
        </div>
      `;
    }

    // Subordinates list
    const subListContainer = document.getElementById('detail-subordinates-list');
    if (subordinates.length === 0) {
      subListContainer.innerHTML = '<p class="text-slate-400 text-[11px] py-1">ไม่มีผู้ใต้บังคับบัญชาสายตรง</p>';
    } else {
      subListContainer.innerHTML = subordinates.map(sub => `
        <div class="p-2 bg-slate-50 hover:bg-indigo-50/70 border border-slate-100 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
             onclick="window.OrgApp.openDetailModal('${sub.id}')">
          <div class="flex items-center gap-2 truncate">
            <div class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center flex-shrink-0">
              ${sub.name.slice(0, 2)}
            </div>
            <div class="truncate">
              <div class="font-bold text-slate-800 text-[11px] truncate">${sub.name}</div>
              <div class="text-[10px] text-slate-400 truncate">${sub.position}</div>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right text-[10px] text-slate-400"></i>
        </div>
      `).join('');
    }

    this.openModal('modal-employee-detail');
  }

  /**
   * Delete Node with confirmation
   */
  async deleteNode(id) {
    const item = this.data.find(d => d.id === id);
    if (!item) return;

    const subordinates = this.data.filter(d => d.reportsTo === id);

    const result = await Swal.fire({
      icon: 'warning',
      title: `ลบตำแหน่ง "${item.name}"?`,
      html: subordinates.length > 0 
        ? `<p class="text-xs text-slate-600">ตำแหน่งนี้มีผู้ใต้บังคับบัญชา <strong>${subordinates.length}</strong> คน<br/>ระบบจะโอนย้ายลูกน้องขึ้นตรงต่อหัวหน้าเดิมของตำแหน่งนี้อัตโนมัติ</p>`
        : `<p class="text-xs text-slate-600">คุณแน่ใจหรือไม่ว่าต้องการลบตำแหน่งนี้ออกจากผังองค์กร?</p>`,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, ลบตำแหน่งนี้',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      // Reassign subordinates to grandparent
      const newParentId = item.reportsTo || '';
      subordinates.forEach(sub => {
        sub.reportsTo = newParentId;
      });

      // Remove item
      this.data = this.data.filter(d => d.id !== id);

      if (!this.cloudReady) throw new Error('ยังไม่ได้ตั้งค่า Supabase Cloud');
      // Persist subordinate reassignment first, then delete the manager.
      if (subordinates.length) {
        await window.OrgFlowCloud.upsertEmployees(subordinates);
      }
      await window.OrgFlowCloud.deleteEmployee(id);
      this.updateStats();
      this.renderDeptFilters();
      this.populateManagerDropdown();
      this.renderCurrentView();

      Swal.fire({
        icon: 'success',
        title: 'ลบตำแหน่งเรียบร้อย',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  }

  /**
   * Reset to Sample Demo Data
   */
  async resetToDemo() {
    const result = await Swal.fire({
      icon: 'question',
      title: 'โหลดตัวอย่างตั้งต้น?',
      text: 'ข้อมูลปัจจุบันจะถูกแทนที่ด้วยผังองค์กรตัวอย่างของระบบ',
      showCancelButton: true,
      confirmButtonText: 'ใช่, โหลดตัวอย่าง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#4f46e5'
    });

    if (result.isConfirmed) {
      if (window.SAMPLE_ORG_DATA && Array.isArray(window.SAMPLE_ORG_DATA)) {
        this.data = JSON.parse(JSON.stringify(window.SAMPLE_ORG_DATA));
      } else if (typeof SAMPLE_ORG_DATA !== 'undefined' && Array.isArray(SAMPLE_ORG_DATA)) {
        this.data = JSON.parse(JSON.stringify(SAMPLE_ORG_DATA));
      } else {
        this.data = [];
      }
      this.activeDeptFilter = 'ALL';
      if (!this.cloudReady) throw new Error('ยังไม่ได้ตั้งค่า Supabase Cloud');
      await window.OrgFlowCloud.replaceEmployees(this.data);
      this.updateStats();
      this.renderDeptFilters();
      this.populateManagerDropdown();
      this.renderCurrentView();

      Swal.fire({
        icon: 'success',
        title: 'โหลดตัวอย่างสำเร็จ',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  }

  /**
   * Clear All Data
   */
  async clearAllData() {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'ล้างข้อมูลทั้งหมด?',
      text: 'ผังองค์กรและข้อมูลพนักงานทั้งหมดจะถูกลบทิ้ง',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'ใช่, ล้างทั้งหมด',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      this.data = [];
      this.activeDeptFilter = 'ALL';
      if (!this.cloudReady) throw new Error('ยังไม่ได้ตั้งค่า Supabase Cloud');
      await window.OrgFlowCloud.clearEmployees();
      this.updateStats();
      this.renderDeptFilters();
      this.populateManagerDropdown();
      this.renderCurrentView();

      Swal.fire({
        icon: 'success',
        title: 'ล้างข้อมูลเรียบร้อย',
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  }

  /**
   * Render Tabular Data View
   */
  renderTableView(filterQuery = '') {
    const tbody = document.getElementById('table-body');
    const rowCountEl = document.getElementById('table-row-count');
    if (!tbody || !rowCountEl) return;

    const q = filterQuery.toLowerCase();

    let items = this.data;
    if (this.activeDeptFilter !== 'ALL') {
      items = items.filter(d => (d.department || 'General') === this.activeDeptFilter);
    }
    if (q) {
      items = items.filter(d => 
        d.name.toLowerCase().includes(q) ||
        d.position.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        (d.department && d.department.toLowerCase().includes(q))
      );
    }

    rowCountEl.textContent = items.length;

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-10 text-slate-400">
            <i class="fa-solid fa-inbox text-2xl mb-2 text-slate-300 block"></i>
            ไม่พบข้อมูล
          </td>
        </tr>
      `;
      return;
    }

    const idMap = new Map(this.data.map(d => [d.id, d]));

    tbody.innerHTML = items.map(item => {
      const manager = item.reportsTo ? idMap.get(item.reportsTo) : null;
      const theme = this.renderer ? this.renderer.getDepartmentTheme(item.department) : { badge: 'bg-slate-100 text-slate-700 border-slate-200' };
      const initials = this.renderer ? this.renderer.getInitials(item.name) : 'EMP';

      const avatarHtml = item.avatarUrl ? `
        <img src="${item.avatarUrl}" class="w-8 h-8 rounded-full object-cover border border-slate-200" onerror="this.outerHTML='<div class=\\'w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px]\\'>${initials}</div>'" />
      ` : `
        <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
          ${initials}
        </div>
      `;

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-2.5 px-4">${avatarHtml}</td>
          <td class="py-2.5 px-4 font-mono font-semibold text-slate-700">${item.id}</td>
          <td class="py-2.5 px-4 font-bold text-slate-800">${item.name}</td>
          <td class="py-2.5 px-4 text-slate-600">${item.position}</td>
          <td class="py-2.5 px-4">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border ${theme.badge}">
              ${item.department || 'General'}
            </span>
          </td>
          <td class="py-2.5 px-4 text-slate-500">
            ${manager ? `<span class="font-medium text-slate-700">${manager.name}</span> (#${manager.id})` : '<span class="text-slate-400">ตำแหน่งสูงสุด</span>'}
          </td>
          <td class="py-2.5 px-4">
            <span class="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">${item.roleLevel || 'Staff'}</span>
          </td>
          <td class="py-2.5 px-4 text-slate-500">
            <div>${item.email || '-'}</div>
            <div class="text-[10px] text-slate-400">${item.phone || '-'}</div>
          </td>
          <td class="py-2.5 px-4 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button title="ดูรายละเอียด" onclick="window.OrgApp.openDetailModal('${item.id}')"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button title="แก้ไข" onclick="window.OrgApp.openEditModal('${item.id}')"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button title="เพิ่มลูกน้อง" onclick="window.OrgApp.openAddSubordinateModal('${item.id}')"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                <i class="fa-solid fa-user-plus"></i>
              </button>
              <button title="ลบ" onclick="window.OrgApp.deleteNode('${item.id}')"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Modal helper methods
   */
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('hidden');
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
  }
}

// Function to safely boot the application
function startOrgApp() {
  if (!window.OrgApp) {
    window.OrgApp = new OrgAppController();
    window.OrgApp.init();
  }
}

// Safe bootstrap across different loading timings
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startOrgApp);
} else {
  startOrgApp();
}
